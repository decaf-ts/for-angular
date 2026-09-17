import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getNodeAccentColor,
  openNodeEditor,
  closeModal,
  getModalTitle,
  getNodeArticle,
  isPortConnected,
  getAllNodeIds,
  getEdgeCount,
} from './helpers';

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

  test('double-click opens the node edit modal', async ({ page }) => {
    await openNodeEditor(page, 'GraphForeachLoopNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const title = await getModalTitle(page);
    expect(title).toContain('Foreach');
    await closeModal(page, 'cancel');
  });

  test('edit modal has an Inputs section with port fields', async ({ page }) => {
    await openNodeEditor(page, 'GraphForeachLoopNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('ion-modal h3').filter({ hasText: 'Inputs' })).toBeVisible();
    const portFields = page.locator('ion-modal app-graph-port-field');
    expect(await portFields.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
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

  test('addNode inside the foreach appends to the same single loop', async ({ page }) => {
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

    // Two mandatory loop edges (item → new, new → loop) are added …
    expect(await getEdgeCount(page)).toBe(edgesBefore + 2);
    // … still exactly one ghost: no second loop body is created on the foreach.
    const ids = await getAllNodeIds(page);
    expect(ids.filter((id) => id.startsWith('ghost-'))).toHaveLength(1);
    // … and the new node joins the same single loop (one extra item/loop edge).
    const labelsAfter = (await page.locator('.ng-diagram-default-edge-label').allTextContents()).map(
      (label) => label.trim()
    );
    const countOf = (labels: string[], label: string) =>
      labels.filter((candidate) => candidate === label).length;
    expect(countOf(labelsAfter, 'item')).toBe(countOf(labelsBefore, 'item') + 1);
    expect(countOf(labelsAfter, 'loop')).toBe(countOf(labelsBefore, 'loop') + 1);
  });
});
