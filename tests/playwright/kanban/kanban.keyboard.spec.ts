/**
 * SAA-1034 §3 — keyboard-only Kanban flow: Tab to a card, Space grab, arrows
 * preview, Enter drop, Escape cancel, plus live-region announcements.
 */
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { lastEvent, openKanban, resetBoard } from './helpers';

// First run also compiles the lazy /kanban route on the dev server.
test.setTimeout(90_000);

const live = (page: Page) => page.locator('.dcf-kanban__live');

async function activeTaskId(page: Page): Promise<string | null> {
  return page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.dataset['kanbanTaskId'] ?? null
  );
}

async function tabToFirstCard(page: Page): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab');
    if (await activeTaskId(page)) {
      return;
    }
  }
  throw new Error('Could not reach a Kanban card with Tab');
}

test.beforeEach(async ({ page, context }) => {
  fs.mkdirSync('test-results/kanban-artifacts', { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openKanban(page);
});

test.afterEach(async ({ page, context }, testInfo) => {
  await context.tracing.stop({
    path: `test-results/kanban-artifacts/trace-keyboard-${testInfo.title.replace(/[^a-z0-9]+/gi, '-')}.zip`,
  });
  await resetBoard(page).catch(() => undefined);
});

test('keyboard grab, arrow preview, Enter drop keeps focus and announces each step', async ({ page }) => {
  await tabToFirstCard(page);
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toBeFocused();

  await page.keyboard.press('Space');
  await expect(live(page)).toContainText('picked up');
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    'aria-grabbed',
    'true'
  );

  await page.keyboard.press('ArrowDown');
  await expect(live(page)).toContainText('position 2');

  await page.screenshot({
    path: 'test-results/kanban-artifacts/keyboard-preview.png',
    fullPage: true,
  });

  await page.keyboard.press('Enter');
  await expect(lastEvent(page)).toContainText('taskReordered: task-1');
  await expect(live(page)).toContainText('moved to');
  await expect.poll(() => activeTaskId(page)).toBe('task-1');
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    'aria-grabbed',
    'false'
  );
});

test('keyboard Escape cancels a preview without emitting a move', async ({ page }) => {
  await tabToFirstCard(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');

  await expect(lastEvent(page)).toContainText('taskMoveRejected: task-1 cancelled');
  await expect(live(page)).toContainText('Move cancelled');
  await expect(page.locator('[data-kanban-task-id="task-1"]')).toHaveAttribute(
    'aria-grabbed',
    'false'
  );
  await expect(lastEvent(page)).not.toContainText('taskReordered');
});

test('keyboard move into a full WIP column is rejected with a spoken reason', async ({ page }) => {
  await tabToFirstCard(page);
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');

  await expect(lastEvent(page)).toContainText('taskMoveRejected: task-1 wip-limit');
  await expect(live(page)).toContainText('work-in-progress limit');
  await page.keyboard.press('Escape');
  await expect(lastEvent(page)).toContainText('cancelled');
});
