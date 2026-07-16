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
    const label = await article.locator('div.graph-node__port--in .graph-node__port-label').textContent();
    expect(label?.trim()).toBe('Items');
  });

  test('items input port is connected from upstream Code node', async ({ page }) => {
    expect(await isPortConnected(page, 'GraphForeachLoopNode', 'items')).toBe(true);
  });

  test('results output port is hidden (has @uielement, not in port mode, not connected)', async ({ page }) => {
    const outputs = await getNodePorts(page, 'GraphForeachLoopNode', 'out');
    expect(outputs).not.toContain('results');
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
