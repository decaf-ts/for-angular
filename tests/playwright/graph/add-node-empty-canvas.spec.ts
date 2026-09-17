/**
 * G4-R5 — add-node on empty canvas (DECAF-50 §4.22).
 *
 * Supersedes the G3-29/PR-H node-highlight "+" connector: the "+" button is
 * removed, and a connection drag released over empty canvas opens the same add-node
 * palette; the selected node is inserted already connected from the drag's source
 * output port into the node's first available input port.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getAllNodeIds,
  getEdgeCount,
  getNodeHost,
  dragPortToEmptyCanvas,
  emptyCanvasPoint,
  isPortConnected,
} from './helpers';

test.describe('Graph — add node on empty canvas (G4-R5)', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('the node-highlight "+" button is absent on every node', async ({ page }) => {
    expect(await page.locator('.graph-node__add').count()).toBe(0);
    for (const id of await getAllNodeIds(page)) {
      expect(await getNodeHost(page, id).locator('.graph-node__add').count()).toBe(0);
    }
  });

  test('releasing an output drag over empty canvas opens the add-node palette', async ({ page }) => {
    const drop = await emptyCanvasPoint(page);

    await dragPortToEmptyCanvas(page, 'SplitTextCodeNode', 'result', drop);

    await expect(page.locator('.graph-renderer__palette-list')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('the selected node appears pre-connected to its first input port', async ({ page }) => {
    const edgesBefore = await getEdgeCount(page);
    const drop = await emptyCanvasPoint(page);
    await dragPortToEmptyCanvas(page, 'SplitTextCodeNode', 'result', drop);

    const logEntry = page
      .locator('.graph-renderer__palette-item')
      .filter({ hasText: 'Utility Log' })
      .first();
    await expect(logEntry).toBeVisible({ timeout: 10_000 });
    await logEntry.click();
    await page.waitForTimeout(1200);

    const ids = await getAllNodeIds(page);
    const added = ids.find((id) => id.includes('core-utility-log'));
    expect(added, 'the selected node is inserted on the canvas').toBeTruthy();
    // Exactly one new edge: the drag source output into the new node's first
    // available input port (`value`).
    expect(await getEdgeCount(page)).toBe(edgesBefore + 1);
    await expect.poll(() => isPortConnected(page, added as string, 'value')).toBe(true);
  });
});
