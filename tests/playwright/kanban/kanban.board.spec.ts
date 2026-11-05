/**
 * SAA-1034 §3 — real CDK pointer drag/drop, host-controlled states, empty
 * states, and the narrow-viewport layout of the `/kanban` demo route.
 */
import { expect, test } from '@playwright/test';
import {
  cardIds,
  column,
  dragHandleTo,
  dropzone,
  lastEvent,
  openKanban,
  resetBoard,
} from './helpers';

// First run also compiles the lazy /kanban route on the dev server.
test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openKanban(page);
});

test('pointer same-column reorder emits taskReordered and keeps the board usable', async ({ page }) => {
  await dragHandleTo(page, 'task-1', page.locator('[data-kanban-task-id="task-3"]'), {
    targetY: 'bottom',
  });
  await expect(lastEvent(page)).toContainText('taskReordered: task-1');
  const todoIds = await cardIds(page, 'todo').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset['kanbanTaskId'])
  );
  expect(todoIds).toHaveLength(3);
  expect(todoIds).not.toEqual(['task-1', 'task-2', 'task-3']);
  expect(todoIds).toContain('task-1');
  await page.screenshot({
    path: 'test-results/kanban-artifacts/pointer-reorder.png',
    fullPage: true,
  });
});

test('pointer cross-column drag emits taskMoved with the target column', async ({ page }) => {
  await dragHandleTo(page, 'task-1', dropzone(page, 'done'), { targetY: 'middle' });
  await expect(lastEvent(page)).toContainText('taskMoved: task-1 -> done');
  await expect(column(page, 'done').locator('[data-kanban-task-id="task-1"]')).toBeVisible();
});

test('WIP-limited pointer drop is rejected and the card stays in its column', async ({ page }) => {
  await expect(column(page, 'doing').locator('[data-kanban-task-id]')).toHaveCount(2);
  await dragHandleTo(page, 'task-1', dropzone(page, 'doing'), { targetY: 'middle' });
  await expect(lastEvent(page)).toContainText('taskMoveRejected: task-1 wip-limit');
  await expect(column(page, 'todo').locator('[data-kanban-task-id="task-1"]')).toBeVisible();
  await expect(column(page, 'doing').locator('[data-kanban-task-id]')).toHaveCount(2);
  await page.screenshot({
    path: 'test-results/kanban-artifacts/wip-rejection.png',
    fullPage: true,
  });
});

test('empty column and cleared board show empty messages', async ({ page }) => {
  await page.locator('[data-testid="kanban-clear"]').click();
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(0);
  await expect(page.locator('.dcf-kanban-column__empty')).toHaveCount(4);
  for (const empty of await page.locator('.dcf-kanban-column__empty').all()) {
    await expect(empty).toBeVisible();
  }
  await page.screenshot({
    path: 'test-results/kanban-artifacts/empty-board.png',
    fullPage: true,
  });
});

test('host-controlled loading, error, retry, and read-only states', async ({ page }) => {
  await page.locator('[data-testid="kanban-loading"]').check();
  await expect(page.locator('[role="status"]').filter({ hasText: 'Loading tasks...' })).toBeVisible();
  await expect(page.locator('.dcf-kanban__board')).toHaveCount(0);
  await page.locator('[data-testid="kanban-loading"]').uncheck();
  await expect(page.locator('.dcf-kanban__board')).toBeVisible();

  await page.locator('[data-testid="kanban-error"]').check();
  await expect(page.locator('[role="alert"]')).toContainText('The board could not be loaded');
  await page.locator('[role="alert"] button').click();
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
  await expect(lastEvent(page)).toContainText('retryRequested');

  await page.locator('[data-testid="kanban-readonly"]').check();
  await expect(page.locator('.dcf-kanban-card__handle')).toHaveCount(0);
  await expect(lastEvent(page)).toContainText('retryRequested');
  const card = page.locator('[data-kanban-task-id="task-1"]');
  await card.focus();
  await page.keyboard.press('Space');
  await expect(lastEvent(page)).toContainText('taskMoveRejected: task-1 readonly');
  await page.screenshot({
    path: 'test-results/kanban-artifacts/readonly.png',
    fullPage: true,
  });
});

test('narrow viewport keeps columns horizontally scrollable and usable', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 800 });
  await expect(page.locator('.dcf-kanban-column')).toHaveCount(4);
  const overflow = await page.locator('.dcf-kanban__board').evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);

  await dragHandleTo(page, 'task-1', page.locator('[data-kanban-task-id="task-2"]'), {
    targetY: 'bottom',
  });
  await expect(lastEvent(page)).toContainText('taskReordered: task-1');
  await page.screenshot({
    path: 'test-results/kanban-artifacts/responsive-narrow.png',
    fullPage: true,
  });
});

test('add-card control appends a todo card and reports taskAdded', async ({ page }) => {
  const todo = column(page, 'todo').locator('[data-kanban-task-id]');
  await expect(todo).toHaveCount(3);
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(7);

  await page.locator('[data-testid="kanban-add"]').click();

  await expect(todo).toHaveCount(4);
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(8);
  await expect(page.locator('[data-kanban-task-id="task-8"]')).toBeVisible();
  await expect(page.locator('[data-kanban-task-id="task-8"]')).toContainText(
    'New task 8'
  );
  await expect(todo.last()).toHaveAttribute('data-kanban-task-id', 'task-8');
  await expect(lastEvent(page)).toContainText('taskAdded: task-8');
  await expect(column(page, 'doing').locator('[data-kanban-task-id]')).toHaveCount(2);

  await page.locator('[data-testid="kanban-add"]').click();
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(9);
  await expect(todo).toHaveCount(5);
  await expect(lastEvent(page)).toContainText('taskAdded: task-9');

  await page.screenshot({
    path: 'test-results/kanban-artifacts/add-card.png',
    fullPage: true,
  });
});

test.afterEach(async ({ page }) => {
  await resetBoard(page).catch(() => undefined);
});
