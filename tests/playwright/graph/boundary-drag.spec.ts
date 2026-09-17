/**
 * G4-R4 — results output node drag (DECAF-50 §4.22).
 *
 * The workflow-boundary result badge is draggable like any other node, and a drag
 * keeps its input connection (`ResultLogNode:logged → output-result:value`). The
 * unit contract lives in
 * `src/graph/document/graph-boundary-moves.spec.ts`.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect } from '@playwright/test';
import { gotoGraph, getNodeArticle, isPortConnected, dragNodeBy } from './helpers';

test.describe('Graph — results boundary drag (G4-R4)', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('the results output node is draggable like any other node', async ({ page }) => {
    // FIXED (SAA-1478): the legacy snapshot carried the `output-result` badge
    // inside `document.nodes`; it is now dropped as a boundary artifact, so a
    // results-badge drag folds into `boundary.moves` and persists on
    // `document.ui.boundaryPositions` instead of snapping back.
    const before = await getNodeArticle(page, 'output-result').boundingBox();

    await dragNodeBy(page, 'output-result', { x: -80, y: 0 });

    const after = await getNodeArticle(page, 'output-result').boundingBox();
    expect(before && after ? Math.abs(after.x - before.x) : 0).toBeGreaterThan(40);
  });

  test('the results output node keeps its input connection across the drag', async ({ page }) => {
    await expect.poll(() => isPortConnected(page, 'output-result', 'value')).toBe(true);

    await dragNodeBy(page, 'output-result', { x: -80, y: 0 });

    await expect.poll(() => isPortConnected(page, 'output-result', 'value')).toBe(true);
  });

  test('member nodes remain draggable (regression baseline)', async ({ page }) => {
    const before = await getNodeArticle(page, 'ResultLogNode').boundingBox();

    await dragNodeBy(page, 'ResultLogNode', { x: -80, y: 0 });

    const after = await getNodeArticle(page, 'ResultLogNode').boundingBox();
    expect(before && after ? Math.abs(after.x - before.x) : 0).toBeGreaterThan(40);
  });
});
