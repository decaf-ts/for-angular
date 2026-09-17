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

test.describe('SplitTextCodeNode (core.flow.code)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, 'SplitTextCodeNode');
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('Split');
  });

  test('has the Utility category accent colour (#0d9488)', async ({ page }) => {
    const color = await getNodeAccentColor(page, 'SplitTextCodeNode');
    expect(color.toLowerCase()).toBe('#0d9488');
  });

  test('data input port is visible (from CodeInputSchema, no @uielement)', async ({ page }) => {
    const inputs = await getNodePorts(page, 'SplitTextCodeNode', 'in');
    expect(inputs).toContain('data');
  });

  test('result output port is connected to the downstream Foreach node', async ({ page }) => {
    await expect.poll(() => isPortConnected(page, 'SplitTextCodeNode', 'result')).toBe(true);
  });

  test('code input port is visible (uielement code-editor port)', async ({ page }) => {
    const inputs = await getNodePorts(page, 'SplitTextCodeNode', 'in');
    expect(inputs).toContain('code');
  });

  test('required code input port stays visible while unconnected (D2/G3-06)', async ({ page }) => {
    const inputs = await getNodePorts(page, 'SplitTextCodeNode', 'in');
    expect(inputs).toContain('code');
    expect(await isPortConnected(page, 'SplitTextCodeNode', 'code')).toBe(false);
  });

  test('double-click opens the node edit modal', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const title = await getModalTitle(page);
    expect(title).toContain('Split');
    await closeModal(page, 'cancel');
  });

  test('edit modal has a Code section with port fields', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('ion-modal h3').filter({ hasText: 'Code' })).toBeVisible();
    const portFields = page.locator('ion-modal app-graph-port-field');
    expect(await portFields.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });
});
