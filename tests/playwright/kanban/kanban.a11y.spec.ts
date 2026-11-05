/**
 * SAA-1034 §5 — axe-core on Default / ReadOnly / Empty, keyboard focus ring,
 * drop-state styling, and `prefers-reduced-motion: reduce`.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { dragHandleTo, dropzone, openKanban, resetBoard } from './helpers';

// First run also compiles the lazy /kanban route on the dev server.
test.setTimeout(90_000);

const ARTIFACTS = 'test-results/kanban-artifacts';

const axe = (page: Page) =>
  new AxeBuilder({ page }).include('.dcf-kanban').analyze();

function serious(violations: Awaited<ReturnType<typeof axe>>['violations']) {
  return violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious'
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  await openKanban(page);
});

test.afterEach(async ({ page }) => {
  await resetBoard(page).catch(() => undefined);
});

async function audit(page: Page, state: string): Promise<void> {
  const results = await axe(page);
  fs.writeFileSync(
    `${ARTIFACTS}/axe-${state}.json`,
    JSON.stringify(
      {
        url: page.url(),
        scope: '.dcf-kanban',
        violations: results.violations,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
      },
      null,
      2
    )
  );
  await page.screenshot({ path: `${ARTIFACTS}/axe-${state}.png`, fullPage: true });
  expect(
    serious(results.violations).map((violation) => violation.id),
    `serious/critical axe violations in ${state}: ${JSON.stringify(
      serious(results.violations).flatMap((violation) =>
        violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        }))
      )
    )}`
  ).toEqual([]);

  const ids = results.violations.map((violation) => violation.id);
  expect(ids, `defect-specific axe rules still firing in ${state}`).not.toContain(
    'heading-order'
  );
  expect(ids).not.toContain('aria-required-children');
  expect(ids).not.toContain('aria-allowed-attr');
  expect(ids).not.toContain('scrollable-region-focusable');
}

test('Default board has no critical/serious axe violations', async ({ page }) => {
  await audit(page, 'default');
});

test('ReadOnly board has no critical/serious axe violations', async ({ page }) => {
  await page.locator('[data-testid="kanban-readonly"]').check();
  await expect(page.locator('.dcf-kanban-card__handle')).toHaveCount(0);
  await audit(page, 'readonly');
});

test('Empty board has no critical/serious axe violations', async ({ page }) => {
  await page.locator('[data-testid="kanban-clear"]').click();
  await expect(page.locator('[data-kanban-task-id]')).toHaveCount(0);
  await audit(page, 'empty');

  const board = page.locator('.dcf-kanban__board');
  await expect(board).toHaveAttribute('role', 'group');
  await expect(board).toHaveAttribute('tabindex', '0');
  await expect(board).toHaveAttribute('aria-label', 'Sprint board');

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let focused = false;
  for (let index = 0; index < 60; index += 1) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(
      () =>
        (document.activeElement as HTMLElement | null)?.classList.contains(
          'dcf-kanban__board'
        ) ?? false
    );
    if (focused) {
      break;
    }
  }
  expect(focused).toBe(true);
  const ring = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    const computed = getComputedStyle(active);
    return {
      focusVisible: active.matches(':focus-visible'),
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
    };
  });
  expect(ring.focusVisible).toBe(true);
  expect(ring.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
  await page.screenshot({
    path: `${ARTIFACTS}/empty-board-focus-ring.png`,
    fullPage: true,
  });
});

test('keyboard focus shows a visible ring and the drop state is visibly highlighted', async ({
  page,
}) => {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset['kanbanTaskId'] ?? null
    );
    if (id) {
      break;
    }
  }
  const styles = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const computed = getComputedStyle(element);
    return {
      id: element.dataset['kanbanTaskId'],
      focusVisible: element.matches(':focus-visible'),
      boxShadow: computed.boxShadow,
      outline: computed.outlineStyle,
    };
  });
  expect(styles.id).toBeTruthy();
  expect(styles.focusVisible).toBe(true);
  expect(styles.boxShadow).not.toBe('none');
  await page.screenshot({ path: `${ARTIFACTS}/focus-ring.png`, fullPage: true });

  const handle = page.locator('[data-kanban-task-id="task-1"] .dcf-kanban-card__handle');
  const box = await handle.boundingBox();
  const target = await dropzone(page, 'done').boundingBox();
  if (!box || !target) {
    throw new Error('Missing drag geometry');
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, {
    steps: 6,
  });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
    steps: 20,
  });
  await page.waitForTimeout(200);
  await expect(
    page.locator('.cdk-drop-list-receiving, .cdk-drop-list-dragging').first()
  ).toBeVisible();
  await page.screenshot({ path: `${ARTIFACTS}/drop-state.png`, fullPage: true });
  await page.mouse.up();
});

test('prefers-reduced-motion disables transitions and the loading spinner', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cardTransition = await page
    .locator('[data-kanban-task-id="task-1"]')
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  for (const duration of cardTransition.split(',')) {
    expect(duration.trim()).toBe('0s');
  }

  await page.locator('[data-testid="kanban-loading"]').check();
  const spinner = page.locator('.dcf-kanban__spinner');
  await expect(spinner).toBeVisible();
  const animation = await spinner.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { name: computed.animationName, duration: computed.animationDuration };
  });
  expect(animation.name).toBe('none');
  await page.screenshot({
    path: `${ARTIFACTS}/reduced-motion-loading.png`,
    fullPage: true,
  });
});
