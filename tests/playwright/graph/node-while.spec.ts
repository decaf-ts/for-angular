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

test.describe('GraphWhileLoopNode (core.loop.while)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, 'GraphWhileLoopNode');
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('While');
  });

  test('has the Loop category accent colour (#0891b2)', async ({ page }) => {
    const color = await getNodeAccentColor(page, 'GraphWhileLoopNode');
    expect(color.toLowerCase()).toBe('#0891b2');
  });

  test('has a state input port', async ({ page }) => {
    const inputs = await getNodePorts(page, 'GraphWhileLoopNode', 'in');
    expect(inputs).toContain('state');
  });

  test('input port label is "State"', async ({ page }) => {
    const article = getNodeArticle(page, 'GraphWhileLoopNode');
    const label = await article.locator('div.graph-node__port--in .graph-node__port-label').textContent();
    expect(label?.trim()).toBe('State');
  });

  test('state input port is not connected (no upstream node in this workflow)', async ({ page }) => {
    expect(await isPortConnected(page, 'GraphWhileLoopNode', 'state')).toBe(false);
  });

  test('stateOut output port is hidden (has @uielement, not in port mode, not connected)', async ({ page }) => {
    const outputs = await getNodePorts(page, 'GraphWhileLoopNode', 'out');
    expect(outputs).not.toContain('state');
  });

  test('double-click opens the node edit modal', async ({ page }) => {
    await openNodeEditor(page, 'GraphWhileLoopNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const title = await getModalTitle(page);
    expect(title).toContain('While');
    await closeModal(page, 'cancel');
  });

  test('edit modal has an Inputs section with port fields', async ({ page }) => {
    await openNodeEditor(page, 'GraphWhileLoopNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('ion-modal h3').filter({ hasText: 'Inputs' })).toBeVisible();
    const portFields = page.locator('ion-modal app-graph-port-field');
    expect(await portFields.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });
});
