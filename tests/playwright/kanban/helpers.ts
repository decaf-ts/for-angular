/**
 * Shared helpers for the SAA-1034 `/kanban` browser verification.
 * Requires the Playwright `webServer` frontend on :8110.
 */
import { expect, type Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:8110';
export const KANBAN_URL = `${BASE_URL}/kanban`;

async function gotoStable(page: Page, url: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      if (attempt === 2 || !/ERR_ABORTED/.test(String(error))) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

export async function login(page: Page): Promise<void> {
  await gotoStable(page, BASE_URL);
  const user = page
    .locator('[id="username"] input')
    .or(page.getByRole('textbox', { name: /user/i }))
    .first();
  await user.waitFor({ state: 'visible', timeout: 30_000 });
  await user.fill('decaf');
  const pass = page
    .locator('[id="password"] input')
    .or(page.getByRole('textbox', { name: /password/i }))
    .first();
  await pass.fill('Passd123-');
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/dashboard|graph|kanban/, { timeout: 30_000 }).catch(() => undefined);
}

export async function openKanban(page: Page): Promise<void> {
  await login(page);
  await gotoStable(page, KANBAN_URL);
  await expect(page.locator('[data-testid="kanban-board"] .dcf-kanban')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(7);
}

export function lastEvent(page: Page) {
  return page.locator('[data-testid="kanban-last-event"]');
}

export async function resetBoard(page: Page): Promise<void> {
  await page.locator('[data-testid="kanban-reset"]').click();
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(7);
}

/**
 * Performs a real CDK pointer drag from the card's drag handle to the target.
 */
export async function dragHandleTo(
  page: Page,
  cardId: string,
  target: import('@playwright/test').Locator,
  options: { targetY?: 'top' | 'middle' | 'bottom'; holdMs?: number } = {}
): Promise<void> {
  await page.locator('[data-testid="kanban-board"]').scrollIntoViewIfNeeded();
  const handle = page.locator(
    `[data-kanban-task-id="${cardId}"] .dcf-kanban-card__handle`
  );
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error(`No drag handle box for ${cardId}`);
  }
  const targetBox = await target.boundingBox();
  if (!targetBox) {
    throw new Error('No target box for drop');
  }
  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 12, startY + 12, { steps: 6 });
  await page.waitForTimeout(120);
  const y =
    options.targetY === 'top'
      ? targetBox.y + 8
      : options.targetY === 'bottom'
        ? targetBox.y + targetBox.height - 8
        : targetBox.y + targetBox.height / 2;
  await page.mouse.move(targetBox.x + targetBox.width / 2, y, { steps: 20 });
  await page.waitForTimeout(options.holdMs ?? 200);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

export function column(page: Page, columnId: string) {
  return page.locator(`[data-column-id="${columnId}"]`);
}

export function dropzone(page: Page, columnId: string) {
  return column(page, columnId).locator('.dcf-kanban-column__dropzone');
}

export function cardIds(page: Page, columnId: string) {
  return column(page, columnId).locator('[data-kanban-task-id]');
}
