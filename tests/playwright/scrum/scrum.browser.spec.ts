/**
 * SAA-1050 — Phase 5 `/scrum` demo route, browser-level functional verification.
 *
 * Verifies the composed `/kanban` backlog and sprint board against the
 * acceptance criteria on SAA-1050, in Chromium against the real dev server.
 */
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import {
  ARTIFACTS,
  backlog,
  backlogCardIdSequence,
  backlogCardIds,
  boardCardIdSequence,
  boardCardIds,
  dragBacklogHandleTo,
  focusBacklogCard,
  lastEvent,
  openScrum,
  resetScrum,
  sprintBoard,
  sprintSelector,
} from './helpers';

test.setTimeout(120_000);

const consoleErrors = new WeakMap<Page, string[]>();

function attachConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${message.text()} @ ${message.location().url}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

test.beforeEach(async ({ context }) => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
});

test.afterEach(async ({ page, context }, testInfo) => {
  const failed = testInfo.status !== testInfo.expectedStatus;
  if (failed) {
    await page
      .screenshot({
        path: `${ARTIFACTS}/failure-${testInfo.title.replace(/[^a-z0-9]+/gi, '-')}.png`,
        fullPage: true,
      })
      .catch(() => undefined);
  }
  const tracePath = `${ARTIFACTS}/trace-${testInfo.title.replace(/[^a-z0-9]+/gi, '-')}.zip`;
  await context.tracing.stop({ path: tracePath }).catch(() => undefined);
  if (!failed) {
    fs.rmSync(tracePath, { force: true });
  }
  await resetScrum(page).catch(() => undefined);
});

test('default render: sprint-1, 4 backlog cards, 4 sprint cards, no console errors', async ({
  page,
}) => {
  const errors = attachConsoleErrors(page);
  await openScrum(page);

  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
  await expect(sprintBoard(page)).toHaveAttribute('data-sprint-id', 'sprint-1');
  await expect(lastEvent(page)).toHaveText('No scrum event yet.');
  expect(errors, `console errors on /scrum: ${errors.join('\n')}`).toEqual([]);
  await expect(sprintSelector(page)).toHaveValue('sprint-1');

  await page.screenshot({ path: `${ARTIFACTS}/default.png`, fullPage: true });
});

test('controlled assignment: task-1 -> sprint-1 moves the card and resets only the row select', async ({
  page,
}) => {
  await openScrum(page);
  const rowSelect = page.locator('[data-scrum-assign-task-id="task-1"]');
  await expect(rowSelect).toHaveValue('');

  await rowSelect.selectOption('sprint-1');
  await expect(lastEvent(page)).toHaveText(
    'sprintAssignmentRequested: task-1 -> sprint-1'
  );
  await expect(backlogCardIds(page)).toHaveCount(3);
  await expect(boardCardIds(page)).toHaveCount(5);
  await expect(
    sprintBoard(page).locator('[data-kanban-task-id="task-1"]')
  ).toBeVisible();
  // The moved task leaves the backlog, so its row selector is gone.
  await expect(page.locator('[data-scrum-assign-task-id="task-1"]')).toHaveCount(0);

  await page.screenshot({ path: `${ARTIFACTS}/assignment.png`, fullPage: true });
});

test('pointer drag of a backlog card handle reorders and reports backlogReordered', async ({
  page,
}) => {
  await openScrum(page);
  const before = await backlogCardIdSequence(page);
  expect(before).toEqual(['task-1', 'task-2', 'task-3', 'task-4']);

  await dragBacklogHandleTo(page, 'task-1', 'task-3', { targetY: 'bottom' });

  await expect(lastEvent(page)).toContainText('backlogReordered: task-1');
  const after = await backlogCardIdSequence(page);
  expect(after).not.toEqual(before);
  expect(after).toContain('task-1');
  expect(after.indexOf('task-1')).toBeGreaterThan(0);
  expect([...after].sort()).toEqual([...before].sort());

  await page.screenshot({ path: `${ARTIFACTS}/pointer-reorder.png`, fullPage: true });
});

test('keyboard Space/Arrow/Enter on a backlog card reorders, announces and persists', async ({
  page,
}) => {
  await openScrum(page);
  const before = await backlogCardIdSequence(page);
  await focusBacklogCard(page, 'task-1');

  await page.keyboard.press('Space');
  await expect(backlog(page).locator('.dcf-kanban__live')).toContainText('picked up');
  await expect(
    backlog(page).locator('[data-kanban-task-id="task-1"]')
  ).toHaveAttribute('aria-grabbed', 'true');

  await page.keyboard.press('ArrowDown');
  await expect(backlog(page).locator('.dcf-kanban__live')).toContainText('position 2');

  await page.keyboard.press('Enter');
  await expect(lastEvent(page)).toContainText('backlogReordered: task-1');
  await expect(backlog(page).locator('.dcf-kanban__live')).toContainText('moved to');
  await expect(
    backlog(page).locator('[data-kanban-task-id="task-1"]')
  ).toHaveAttribute('aria-grabbed', 'false');

  const after = await backlogCardIdSequence(page);
  expect(after).not.toEqual(before);
  expect(after.slice(0, 2)).toEqual(['task-2', 'task-1']);

  await page.screenshot({ path: `${ARTIFACTS}/keyboard-reorder.png`, fullPage: true });
});

test('selection: click and Enter emit taskSelected, Escape clears selection', async ({ page }) => {
  await openScrum(page);
  const card = backlog(page).locator('[data-kanban-task-id="task-1"]');

  await card.click();
  await expect(lastEvent(page)).toHaveText('taskSelected: task-1');
  await expect(card).toHaveAttribute('aria-current', 'true');

  await page.locator('[data-testid="scrum-search"]').focus();
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(lastEvent(page)).toHaveText('taskSelected: task-1');

  await page.keyboard.press('Escape');
  await expect(card).not.toHaveAttribute('aria-current', 'true');
});

test('edit gesture (Enter per SAA-1050) reports taskEditRequested', async ({ page }) => {
  await openScrum(page);
  const card = backlog(page).locator('[data-kanban-task-id="task-1"]');

  await card.focus();
  await page.keyboard.press('Enter');
  await expect(lastEvent(page)).toHaveText('taskSelected: task-1');

  await page.keyboard.press('Enter');
  await expect(lastEvent(page)).toHaveText('taskEditRequested: task-1');
});

test('filter narrows both views, clearing restores counts, no-match shows empty state', async ({
  page,
}) => {
  const errors = attachConsoleErrors(page);
  await openScrum(page);
  errors.length = 0;
  const search = page.locator('[data-testid="scrum-search"]');

  await search.fill('Ada');
  await expect(backlogCardIds(page)).toHaveCount(2);
  expect((await backlogCardIdSequence(page)).sort()).toEqual(['task-1', 'task-4']);
  expect((await boardCardIdSequence(page)).sort()).toEqual(['task-5', 'task-8']);

  await search.fill('');
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);

  await search.fill('zzzz-no-match');
  await expect(backlogCardIds(page)).toHaveCount(0);
  await expect(boardCardIds(page)).toHaveCount(0);
  await expect(
    backlog(page).locator('.dcf-kanban-column__empty').first()
  ).toContainText('No backlog tasks');
  await expect(sprintBoard(page).locator('.dcf-kanban-column__empty')).toHaveCount(4);
  expect(errors, `console errors while filtering: ${errors.join('\n')}`).toEqual([]);

  await page.screenshot({ path: `${ARTIFACTS}/filter-empty.png`, fullPage: true });
});

test('readonly disables drag handles, assignment selects and keyboard mutation', async ({
  page,
}) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-readonly"]').check();

  await expect(page.locator('.dcf-kanban-card__handle')).toHaveCount(0);
  const selects = page.locator('[data-scrum-assign-task-id]');
  const selectCount = await selects.count();
  expect(selectCount).toBe(4);
  for (let index = 0; index < selectCount; index += 1) {
    await expect(selects.nth(index)).toBeDisabled();
  }

  await focusBacklogCard(page, 'task-1');
  await page.keyboard.press('Space');
  await expect(lastEvent(page)).toContainText('backlogReorderRejected: task-1 readonly');
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);

  await page.screenshot({ path: `${ARTIFACTS}/readonly.png`, fullPage: true });
});

test('loading shows busy status and disables the sprint selector', async ({ page }) => {
  await openScrum(page);
  const select = sprintSelector(page);
  await page.locator('[data-testid="scrum-loading"]').check();

  await expect(select).toBeDisabled();
  await expect(select).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Loading sprints...' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading backlog...' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading sprint...' })).toBeVisible();
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(0);

  await page.screenshot({ path: `${ARTIFACTS}/loading.png`, fullPage: true });
});

test('error shows role=alert and Retry clears it with retryRequested', async ({ page }) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-error"]').check();

  const alerts = page.getByRole('alert');
  await expect(alerts).toHaveCount(2);
  await expect(alerts.first()).toContainText('The sprint could not be loaded. Try again.');

  await alerts.first().getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(lastEvent(page)).toHaveText('retryRequested');

  await page.screenshot({ path: `${ARTIFACTS}/error-after-retry.png`, fullPage: true });
});

test('sprint switching: sprint-2 board and placeholder no-sprint hint', async ({ page }) => {
  await openScrum(page);

  await sprintSelector(page).selectOption('sprint-2');
  await expect(lastEvent(page)).toHaveText('sprintSelected: sprint-2');
  await expect(sprintBoard(page)).toHaveAttribute('data-sprint-id', 'sprint-2');
  expect((await boardCardIdSequence(page)).sort()).toEqual(['task-10', 'task-9']);

  await sprintSelector(page).selectOption('');
  await expect(lastEvent(page)).toHaveText('sprintSelected: none');
  await expect(page.locator('[data-testid="scrum-no-sprint"]')).toBeVisible();
  await expect(page.locator('[data-testid="scrum-sprint-board"]')).toHaveCount(0);

  await page.screenshot({ path: `${ARTIFACTS}/sprint-switch.png`, fullPage: true });
});
