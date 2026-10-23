/**
 * SAA-1050 — `/scrum` responsive layout, touch targets, label associations and
 * keyboard/a11y contract.
 */
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import {
  ARTIFACTS,
  backlog,
  lastEvent,
  openScrum,
  sprintBoard,
  sprintSelector,
} from './helpers';

test.setTimeout(120_000);

const VIEWPORTS = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1280, height: 900, name: 'desktop' },
] as const;

function boxOf(page: Page, selector: string) {
  return page.locator(selector).first().boundingBox();
}

test.beforeEach(async () => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
});

test('backlog then board stack, no horizontal overflow, no clipped controls at every viewport', async ({
  page,
}) => {
  await openScrum(page);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(backlog(page)).toBeVisible();
    await expect(sprintBoard(page)).toBeVisible();

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
      innerWidth: window.innerWidth,
    }));
    expect(
      overflow.document,
      `${viewport.name}: document horizontal overflow ${JSON.stringify(overflow)}`
    ).toBeLessThanOrEqual(0);
    expect(
      overflow.body,
      `${viewport.name}: body horizontal overflow ${JSON.stringify(overflow)}`
    ).toBeLessThanOrEqual(0);

    const backlogBox = await backlog(page).boundingBox();
    const boardBox = await sprintBoard(page).boundingBox();
    expect(backlogBox, `${viewport.name}: backlog box`).not.toBeNull();
    expect(boardBox, `${viewport.name}: board box`).not.toBeNull();
    expect(
      backlogBox!.y,
      `${viewport.name}: backlog must stack above the board`
    ).toBeLessThan(boardBox!.y);
    expect(
      backlogBox!.x,
      `${viewport.name}: backlog must not start off-screen`
    ).toBeGreaterThanOrEqual(-1);
    expect(
      boardBox!.x,
      `${viewport.name}: board must not start off-screen`
    ).toBeGreaterThanOrEqual(-1);
    expect(
      backlogBox!.x + backlogBox!.width,
      `${viewport.name}: backlog must not overflow horizontally`
    ).toBeLessThanOrEqual(viewport.width + 1);
    expect(
      boardBox!.x + boardBox!.width,
      `${viewport.name}: board must not overflow horizontally`
    ).toBeLessThanOrEqual(viewport.width + 1);

    const selectors = [
      '[data-testid="scrum-reset"]',
      '[data-testid="scrum-search"]',
      '[data-testid="scrum-sprint-selector"] select',
      '[data-scrum-assign-task-id]',
    ];
    for (const selector of selectors) {
      const locators = page.locator(selector);
      const count = await locators.count();
      for (let index = 0; index < count; index += 1) {
        const box = await locators.nth(index).boundingBox();
        if (!box) {
          continue;
        }
        expect(
          box.x,
          `${viewport.name}: ${selector}[${index}] clipped on the left`
        ).toBeGreaterThanOrEqual(-1);
        expect(
          box.x + box.width,
          `${viewport.name}: ${selector}[${index}] clipped on the right`
        ).toBeLessThanOrEqual(viewport.width + 1);
        expect(
          box.height,
          `${viewport.name}: ${selector}[${index}] has no height`
        ).toBeGreaterThan(0);
      }
    }

    await page.screenshot({
      path: `${ARTIFACTS}/responsive-${viewport.name}.png`,
      fullPage: true,
    });
  }
});

test('touch targets are at least 24 CSS px (toolbar, selector, assignment rows)', async ({
  page,
}) => {
  await openScrum(page);
  const measured: Array<{ selector: string; width: number; height: number }> = [];
  const targets = [
    '[data-testid="scrum-reset"]',
    '[data-testid="scrum-search"]',
    '.scrum-page__toolbar label:has([data-testid="scrum-readonly"])',
    '.scrum-page__toolbar label:has([data-testid="scrum-loading"])',
    '.scrum-page__toolbar label:has([data-testid="scrum-error"])',
    '[data-testid="scrum-sprint-selector"] select',
    '[data-scrum-assign-task-id]',
  ];

  for (const selector of targets) {
    const locators = page.locator(selector);
    const count = await locators.count();
    for (let index = 0; index < count; index += 1) {
      const box = await locators.nth(index).boundingBox();
      if (!box) {
        continue;
      }
      measured.push({ selector: `${selector}[${index}]`, width: box.width, height: box.height });
    }
  }

  fs.writeFileSync(
    `${ARTIFACTS}/touch-targets.json`,
    JSON.stringify({ viewport: '1280x900', measured }, null, 2)
  );

  const undersized = measured.filter(
    (target) => target.height < 24 || target.width < 24
  );
  expect(
    undersized,
    `touch targets under 24 CSS px: ${JSON.stringify(undersized)}`
  ).toEqual([]);
});

test('labels and section names are associated and keyboard operation works', async ({ page }) => {
  await openScrum(page);

  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Read only' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Loading' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Error' })).toBeVisible();

  const sprintLabel = page.locator('label[for]');
  await expect(page.getByLabel('Sprint', { exact: true })).toBeVisible();
  expect(await sprintLabel.count()).toBeGreaterThan(0);

  for (const title of [
    'Refine backlog ordering rules',
    'Document sprint scoping contract',
    'Triage sprint assignment feedback',
    'Align filter predicates with search',
  ]) {
    await expect(page.getByRole('combobox', { name: `Assign to sprint: ${title}` })).toBeVisible();
  }

  await expect(
    page.locator('h2.scrum-page__heading', { hasText: 'Backlog' })
  ).toBeVisible();
  await expect(
    page.locator('h2.scrum-page__heading', { hasText: 'Sprint board' })
  ).toBeVisible();
  await expect(page.locator('section[aria-label="Sprint selection"]')).toBeVisible();
  await expect(page.locator('section[aria-label="Backlog"]')).toBeVisible();
  await expect(page.locator('section[aria-label="Sprint board"]')).toBeVisible();

  await sprintSelector(page).focus();
  await page.keyboard.press('ArrowDown');
  await expect(sprintSelector(page)).not.toHaveValue('');
  await expect(lastEvent(page)).toContainText('sprintSelected:');
});

test('loading and error regions are announced with the right roles', async ({ page }) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-loading"]').check();

  await expect(page.getByRole('status').filter({ hasText: 'Loading backlog...' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading sprint...' })).toBeVisible();
  await expect(page.locator('.dcf-kanban').first()).toHaveAttribute('aria-busy', 'true');

  await page.locator('[data-testid="scrum-loading"]').uncheck();
  await page.locator('[data-testid="scrum-error"]').check();
  await expect(page.getByRole('alert')).toHaveCount(2);
  await expect(page.getByRole('alert').first()).toContainText('The sprint could not be loaded.');
});
