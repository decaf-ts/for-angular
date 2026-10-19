/**
 * Shared helpers for the SAA-1050 `/scrum` browser verification.
 * Requires the Playwright `webServer` frontend on :8110.
 */
import { expect, type Page } from '@playwright/test';
import { login as kanbanLogin } from '../kanban/helpers';

export const BASE_URL = 'http://localhost:8110';
export const SCRUM_URL = `${BASE_URL}/scrum`;

export const ARTIFACTS = 'test-results/scrum-artifacts';

export async function login(page: Page): Promise<void> {
  await kanbanLogin(page);
}

async function gotoScrumStable(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await page.goto(SCRUM_URL);
      return;
    } catch (error) {
      if (attempt === 3 || !/ERR_ABORTED|ECONNREFUSED|ERR_CONNECTION/.test(String(error))) {
        throw error;
      }
      await page.waitForTimeout(1_000);
    }
  }
}

export async function openScrum(page: Page): Promise<void> {
  await login(page);
  await gotoScrumStable(page);
  await expect(page.locator('[data-testid="scrum-backlog"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('[data-testid="scrum-sprint-selector"]')).toBeVisible();
}

export function lastEvent(page: Page) {
  return page.locator('[data-testid="scrum-last-event"]');
}

export function sprintSelector(page: Page) {
  return page.locator('[data-testid="scrum-sprint-selector"] select');
}

export function backlog(page: Page) {
  return page.locator('[data-testid="scrum-backlog"]');
}

export function sprintBoard(page: Page) {
  return page.locator('[data-testid="scrum-sprint-board"]');
}

export function backlogCardIds(page: Page) {
  return page.locator('[data-scrum-backlog-task-id]');
}

export function backlogCardIdSequence(page: Page): Promise<string[]> {
  return backlogCardIds(page).evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset['scrumBacklogTaskId'] ?? '')
  );
}

export function boardCardIds(page: Page) {
  return sprintBoard(page).locator('[data-kanban-task-id]');
}

export function boardCardIdSequence(page: Page): Promise<string[]> {
  return boardCardIds(page).evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset['kanbanTaskId'] ?? '')
  );
}

export async function resetScrum(page: Page): Promise<void> {
  await page.locator('[data-testid="scrum-reset"]').click();
  await expect(backlogCardIds(page)).toHaveCount(4);
  await expect(boardCardIds(page)).toHaveCount(4);
}

/**
 * Performs a real CDK pointer drag from a backlog card handle to the target
 * card inside the backlog drop zone.
 */
export async function dragBacklogHandleTo(
  page: Page,
  cardId: string,
  targetId: string,
  options: { targetY?: 'top' | 'middle' | 'bottom'; holdMs?: number } = {}
): Promise<void> {
  await backlog(page).scrollIntoViewIfNeeded();
  const handle = backlog(page).locator(
    `[data-kanban-task-id="${cardId}"] .dcf-kanban-card__handle`
  );
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error(`No drag handle box for ${cardId}`);
  }
  const target = backlog(page).locator(`[data-kanban-task-id="${targetId}"]`);
  const targetBox = await target.boundingBox();
  if (!targetBox) {
    throw new Error(`No target box for ${targetId}`);
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

export async function focusBacklogCard(page: Page, cardId: string): Promise<void> {
  const card = backlog(page).locator(`[data-kanban-task-id="${cardId}"]`);
  await card.focus();
  await expect(card).toBeFocused();
}
