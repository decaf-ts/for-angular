/**
 * @module tests/playwright/graph/node-geometry.spec
 * @summary Gate-2 P0 #1 (D1) E2E — manifest-authoritative rendered geometry.
 * @description The canvas must render every demo node at the size its manifest
 * `display.width`/`display.height` declares (D1/G3-01..03). The assertion reads
 * the computed size of the `[data-node-id]` host — never a CSS variable — so a
 * template override (the legacy hardcoded `--node-size: 96px`) fails the test.
 * `boundingBox()` is deliberately NOT used: the canvas is zoomed (~0.56), so screen
 * pixels differ from diagram units.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110).
 */
import { test, expect, type Page } from '@playwright/test';
import {
  gotoGraph,
  getNodeHost,
  getNodeArticle,
  getNodeComputedSize,
  DEMO_MANIFEST_DISPLAY,
  addPaletteNode,
} from './helpers';

/** Palette-added switch instance id (GraphNodePaletteFactory seed + label). */
const SWITCH = 'core-flow-switch-Switch';

async function openSwitchEditor(page: Page): Promise<void> {
  await getNodeArticle(page, SWITCH).evaluate((el: HTMLElement) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(1500);
}

test.describe('Graph node geometry — manifest-authoritative (D1/G3-01..03)', () => {
  test.setTimeout(180_000);

  test('every demo node renders at its manifest display size', async ({ page }) => {
    await gotoGraph(page);

    for (const node of DEMO_MANIFEST_DISPLAY) {
      await expect(getNodeHost(page, node.id), `${node.id} host`).toBeVisible();
      const size = await getNodeComputedSize(page, node.id);
      expect(size.width, `${node.id} width`).toBe(node.width);
      expect(size.height, `${node.id} height`).toBe(node.height);
    }
  });

  test('the node face fills the manifest height (no 96px template override)', async ({ page }) => {
    await gotoGraph(page);

    for (const node of DEMO_MANIFEST_DISPLAY) {
      const articleHeight = await getNodeArticle(page, node.id).evaluate(
        (el) => parseFloat(getComputedStyle(el).height)
      );
      expect(articleHeight, `${node.id} face height`).toBe(node.height);
    }
  });

  test('a palette switch grows by one manifest case row when a case is added', async ({ page }) => {
    await gotoGraph(page);
    await addPaletteNode(page, 'Switch');
    await expect(getNodeHost(page, SWITCH)).toBeVisible({ timeout: 10_000 });

    const base = await getNodeComputedSize(page, SWITCH);
    expect(base).toEqual({ width: 120, height: 140 });

    await openSwitchEditor(page);
    await page.locator('ion-modal ion-button').filter({ hasText: 'Add' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('ion-modal ion-button').filter({ hasText: 'Save' }).click();
    await page.waitForTimeout(1500);

    const grown = await getNodeComputedSize(page, SWITCH);
    expect(grown).toEqual({ width: 120, height: 164 });
  });
});
