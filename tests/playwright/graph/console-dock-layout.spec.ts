/**
 * @module tests/playwright/graph/console-dock-layout.spec
 * @summary SAA-1378 regression pin for the docked run-console layout.
 * @description Proves, in a real Chromium viewport against the running app,
 * that the lowered console bar stays inside the clipped `ion-content` viewport
 * and that the raised console controls paint and hit above the floating
 * workflow inputs/outputs panels.
 *
 * Two defects from SAA-1362 req 7 are covered:
 *  1. `min-height: 100vh` on the renderer/canvas pushed the docked bar below the
 *     breadcrumb-offset content viewport.
 *  2. `z-index: 1` on the canvas created a stacking context that trapped the
 *     console and its controls under the side panels (z-index 6).
 *
 * Real viewports: 1280x800 and 1440x1000. No `force` clicks are used — pointer
 * interception is the defect under test.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const GRAPH_URL = 'http://localhost:8110/workflows/graph-workflow-root';

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 1000 },
] as const;

const HANDLE = '.graph-logs__handle';
const DOCK = '.graph-logs-dock';
const DOCK_OPEN = 'graph-logs-dock--open';
const FILTERS = '.graph-logs__filter';
const ENTRY = '.graph-logs__entry';

interface HitReport {
  cx: number;
  cy: number;
  hitTag: string | null;
  hitClass: string;
  hitInside: boolean;
  hitSidePanel: boolean;
}

interface ViewportBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Opens the workflow route and waits for the editor + docked console. */
async function gotoWorkflow(page: Page): Promise<void> {
  await page.goto(GRAPH_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('ng-diagram').waitFor({ state: 'visible', timeout: 60_000 });
  await expect(page.locator(DOCK)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(HANDLE)).toBeVisible({ timeout: 30_000 });
}

/** Viewport-relative box of `locator`, plus the live viewport size. */
async function viewportBox(locator: Locator): Promise<ViewportBox> {
  const box = await locator.boundingBox();
  expect(box, `expected ${await locator.evaluate((el) => el.className)} to have a box`).not.toBeNull();
  const viewport = await locator.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  return {
    left: box!.x,
    top: box!.y,
    right: box!.x + box!.width,
    bottom: box!.y + box!.height,
    width: box!.width,
    height: box!.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
}

/** Center hit-test: which element actually paints/hits at the control center. */
async function hitTest(locator: Locator): Promise<HitReport> {
  const box = await locator.boundingBox();
  expect(box, 'hit-test target has no box').not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  return locator.evaluate(
    (el, point) => {
      const hit = document.elementFromPoint(point.cx, point.cy);
      return {
        cx: point.cx,
        cy: point.cy,
        hitTag: hit ? hit.tagName.toLowerCase() : null,
        hitClass: hit ? (hit.getAttribute('class') ?? '') : '',
        hitInside: !!hit && (hit === el || el.contains(hit)),
        hitSidePanel: !!hit && !!hit.closest('.graph-renderer__side'),
      };
    },
    { cx, cy }
  );
}

/** Asserts the center of `locator` hits the control itself, never a side panel. */
async function expectControlHittable(locator: Locator, label: string): Promise<void> {
  const hit = await hitTest(locator);
  expect(
    hit.hitInside,
    `${label} center (${hit.cx.toFixed(1)},${hit.cy.toFixed(1)}) should hit the control, ` +
      `but hit <${hit.hitTag} class="${hit.hitClass}">`
  ).toBe(true);
  expect(hit.hitSidePanel, `${label} must not resolve into a side panel`).toBe(false);
}

/** Clicks the run control and waits for the streamed console entries. */
async function runWorkflow(page: Page): Promise<void> {
  const run = page.locator('button.graph-float-btn--run');
  await expect(run).toBeVisible({ timeout: 30_000 });
  await expect(run).toBeEnabled({ timeout: 60_000 });
  await run.click();
  await expect
    .poll(() => page.locator(ENTRY).count(), {
      timeout: 90_000,
      message: 'workflow run should stream at least 8 console entries',
    })
    .toBeGreaterThanOrEqual(8);
}

/** Raises the console through its real affordance (handle when lowered). */
async function raiseConsole(page: Page): Promise<void> {
  const dock = page.locator(DOCK);
  const open = await dock.evaluate((el) => el.classList.contains('graph-logs-dock--open'));
  if (!open) {
    const handle = page.locator(HANDLE);
    if (await handle.count()) {
      await handle.click();
    } else {
      await page.locator('.graph-logs__toggle').click();
    }
  }
  await expect(dock).toHaveClass(new RegExp(DOCK_OPEN));
  await expect(page.locator(FILTERS)).toHaveCount(4, { timeout: 15_000 });
}

for (const viewport of VIEWPORTS) {
  test.describe(`docked run console at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('lowered bar stays in viewport and raised controls paint above the side panels', async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await gotoWorkflow(page);

      const handle = page.locator(HANDLE);
      const lowered = await viewportBox(handle);
      expect(lowered.left, 'handle left edge inside viewport').toBeGreaterThanOrEqual(0);
      expect(lowered.top, 'handle top edge inside viewport').toBeGreaterThanOrEqual(0);
      expect(
        lowered.right,
        `handle right edge ${lowered.right} <= viewport ${lowered.viewportWidth}`
      ).toBeLessThanOrEqual(lowered.viewportWidth);
      expect(
        lowered.bottom,
        `handle bottom edge ${lowered.bottom} <= viewport ${lowered.viewportHeight}`
      ).toBeLessThanOrEqual(lowered.viewportHeight);

      const loweredHit = await hitTest(handle);
      expect(
        loweredHit.hitInside,
        `lowered handle center should hit the handle, but hit ` +
          `<${loweredHit.hitTag} class="${loweredHit.hitClass}">`
      ).toBe(true);
      expect(loweredHit.hitSidePanel, 'lowered handle must not resolve into a side panel').toBe(false);
      expect(loweredHit.hitClass).not.toContain('graph-renderer__side-body');

      await runWorkflow(page);
      await raiseConsole(page);

      const filters = page.locator(FILTERS);
      const filterCount = await filters.count();
      expect(filterCount).toBe(4);
      for (let i = 0; i < filterCount; i += 1) {
        const filter = filters.nth(i);
        await expectControlHittable(filter, `filter ${i}`);
      }
      const clear = page.locator('[title="Clear log"]');
      const dismiss = page.locator('[title="Dismiss console"]');
      await expectControlHittable(clear, 'Clear log');
      await expectControlHittable(dismiss, 'Dismiss console');

      for (let i = 0; i < filterCount; i += 1) {
        const filter = filters.nth(i);
        const label = (await filter.innerText()).trim();
        await filter.click();
        await expect(filter, `clicked filter ${label} becomes active`).toHaveClass(
          /graph-logs__filter--active/
        );
        await expect
          .poll(() => page.locator(`${FILTERS}.graph-logs__filter--active`).count(), {
            message: `exactly one active filter after clicking ${label}`,
          })
          .toBe(1);
        expect(await filters.nth(i).evaluate((el) => el.classList.contains('graph-logs__filter--active'))).toBe(true);
      }

      await clear.click();
      await expect(page.locator(ENTRY), 'Clear empties the console entries').toHaveCount(0, {
        timeout: 15_000,
      });

      await dismiss.click();
      await expect(page.locator(DOCK)).not.toHaveClass(new RegExp(DOCK_OPEN), {
        timeout: 15_000,
      });
      await expect(handle, 'dismiss restores the lowered handle').toBeVisible({ timeout: 15_000 });
      const restored = await viewportBox(handle);
      expect(restored.bottom, 'restored handle stays inside the viewport').toBeLessThanOrEqual(
        restored.viewportHeight
      );
    });
  });
}
