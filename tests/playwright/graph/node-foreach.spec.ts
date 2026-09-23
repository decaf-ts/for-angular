import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getNodeAccentColor,
  openNodeEditor,
  getNodeArticle,
  isPortConnected,
  getAllNodeIds,
  getEdgeCount,
  emptyCanvasPoint,
} from './helpers';

/** The canvas-only foreach containment ghost article. */
function getGhostArticle(page: Parameters<typeof getNodeArticle>[0]) {
  return page.locator('[data-node-id="ghost-GraphForeachLoopNode"] article.graph-ghost-node');
}

test.describe('GraphForeachLoopNode (core.loop.foreach)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, 'GraphForeachLoopNode');
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('Foreach');
  });

  test('has the Loop category accent colour (#eab308)', async ({ page }) => {
    const color = await getNodeAccentColor(page, 'GraphForeachLoopNode');
    expect(color.toLowerCase()).toBe('#eab308');
  });

  test('has an items input port', async ({ page }) => {
    const inputs = await getNodePorts(page, 'GraphForeachLoopNode', 'in');
    expect(inputs).toContain('items');
  });

  test('input port label is "Items"', async ({ page }) => {
    const article = getNodeArticle(page, 'GraphForeachLoopNode');
    const label = await article.locator('div.graph-node__port--in .graph-node__port-label').first().textContent();
    expect(label?.trim()).toBe('Items');
  });

  test('items input port is connected from upstream Code node', async ({ page }) => {
    await expect.poll(() => isPortConnected(page, 'GraphForeachLoopNode', 'items')).toBe(true);
  });

  test('required output ports (item, completed) are visible (D2/G3-05)', async ({ page }) => {
    const outputs = await getNodePorts(page, 'GraphForeachLoopNode', 'out');
    expect(outputs).toContain('item');
    expect(outputs).toContain('completed');
  });

  test('required input port slice stays visible while unconnected (D2/G3-06)', async ({ page }) => {
    const inputs = await getNodePorts(page, 'GraphForeachLoopNode', 'in');
    expect(inputs).toContain('slice');
    expect(await isPortConnected(page, 'GraphForeachLoopNode', 'slice')).toBe(false);
  });

  test('double-click opens the unified split-view editor (R4-8)', async ({ page }) => {
    await openNodeEditor(page, 'GraphForeachLoopNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    await expect(inspection.locator('.graph-node-inspection__identity')).toContainText(
      'Foreach'
    );
    await expect(page.locator('ion-modal')).toBeHidden();
    await inspection.locator('.graph-node-inspection__close').click();
  });

  test('un-ran foreach split view has a CRUD center with port fields (R4-8)', async ({ page }) => {
    await openNodeEditor(page, 'GraphForeachLoopNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    await expect(
      inspection.locator('.graph-node-inspection__pane--crud app-graph-node-inline-editor')
    ).toBeVisible();
    expect(await inspection.locator('app-graph-port-field').count()).toBeGreaterThan(0);
    await inspection.locator('.graph-node-inspection__close').click();
  });
});

test.describe('GraphForeachLoopNode — single loop discipline (G4-R2)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('keeps exactly one loop: one ghost and one item/loop edge pair', async ({ page }) => {
    const ids = await getAllNodeIds(page);
    expect(ids.filter((id) => id.startsWith('ghost-'))).toHaveLength(1);

    const labels = (await page.locator('.ng-diagram-default-edge-label').allTextContents()).map(
      (label) => label.trim()
    );
    expect(labels.filter((label) => label === 'item')).toHaveLength(1);
    expect(labels.filter((label) => label === 'loop')).toHaveLength(1);
  });

  test('addNode inside the foreach inserts between the foreach and its ghost', async ({ page }) => {
    const edgesBefore = await getEdgeCount(page);
    const labelsBefore = (await page.locator('.ng-diagram-default-edge-label').allTextContents()).map(
      (label) => label.trim()
    );
    await page.locator('.graph-ghost-node').first().click();
    await expect(page.locator('.graph-renderer__palette-list')).toBeVisible({ timeout: 10000 });
    await page
      .locator('.graph-renderer__palette-item')
      .filter({ hasText: 'Utility Log' })
      .first()
      .click();
    await page.waitForTimeout(1200);

    // R2-3(3): the node is spliced between the foreach and its ghost —
    // for-each → <added> → ghost → for-each. The ghost's `item → ghost:in`
    // edge is replaced by `item → <added>` + `<added> → ghost:in`, so exactly
    // one edge is added net (remove one, add two).
    expect(await getEdgeCount(page)).toBe(edgesBefore + 1);
    // Still exactly one ghost: no second loop body is created on the foreach.
    const ids = await getAllNodeIds(page);
    expect(ids.filter((id) => id.startsWith('ghost-'))).toHaveLength(1);
    // The new node joins the same single loop: one extra `item` edge, the
    // single `loop` back-edge is unchanged.
    const labelsAfter = (await page.locator('.ng-diagram-default-edge-label').allTextContents()).map(
      (label) => label.trim()
    );
    const countOf = (labels: string[], label: string) =>
      labels.filter((candidate) => candidate === label).length;
    expect(countOf(labelsAfter, 'item')).toBe(countOf(labelsBefore, 'item') + 1);
    expect(countOf(labelsAfter, 'loop')).toBe(countOf(labelsBefore, 'loop'));
  });
});

test.describe('GraphForeachLoopNode — R2-3(5) hover-only ghost visibility', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('keeps the ghost visible while the loop holds no body node', async ({ page }) => {
    const ghost = getGhostArticle(page);
    await expect(ghost).toBeVisible();
    await expect(ghost).not.toHaveClass(/graph-ghost-node--muted/);
  });

  test('fades the ghost once the loop holds a body node and reveals it on ghost hover', async ({
    page,
  }) => {
    const ghost = getGhostArticle(page);

    // add a real loop body through the ghost's own add-node anchor
    await page.locator('.graph-ghost-node').first().click();
    await expect(page.locator('.graph-renderer__palette-list')).toBeVisible({ timeout: 10000 });
    await page
      .locator('.graph-renderer__palette-item')
      .filter({ hasText: 'Utility Log' })
      .first()
      .click();
    await page.waitForTimeout(1200);

    // park the pointer off the ghost so no lingering hover keeps it revealed
    const empty = await emptyCanvasPoint(page);
    await page.mouse.move(empty.x, empty.y);
    await expect(ghost).toHaveClass(/graph-ghost-node--muted/);
    await expect(ghost).toHaveCSS('opacity', '0');

    // hovering the (invisible) ghost reveals it as the insertion anchor
    await ghost.hover();
    await expect(ghost).not.toHaveClass(/graph-ghost-node--muted/);
    await expect(ghost).toHaveCSS('opacity', '1');
  });
});
