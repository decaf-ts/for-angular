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

/**
 * The current demo workflow (workflow-root.ts) ships a single `core.flow.log`
 * member node — `ResultLogNode` ("Log Results"). The legacy Short/Long/Default
 * log nodes are no longer on the canvas, so the suite is re-anchored to that node.
 */
const LOG = 'ResultLogNode';

test.describe('LogFlowNode — ResultLogNode (core.flow.log)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, LOG);
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('Log Results');
  });

  test('has the Utility category accent colour (#0d9488)', async ({ page }) => {
    const color = await getNodeAccentColor(page, LOG);
    expect(color.toLowerCase()).toBe('#0d9488');
  });

  test('has a value input port', async ({ page }) => {
    const inputs = await getNodePorts(page, LOG, 'in');
    expect(inputs).toContain('value');
  });

  test('value input port is connected from the upstream Foreach node', async ({ page }) => {
    await expect.poll(() => isPortConnected(page, LOG, 'value')).toBe(true);
  });

  test('logged output port is visible (uielement port on the canvas)', async ({ page }) => {
    const outputs = await getNodePorts(page, LOG, 'out');
    expect(outputs).toContain('logged');
  });

  test('double-click opens the node edit modal', async ({ page }) => {
    await openNodeEditor(page, LOG);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const title = await getModalTitle(page);
    expect(title).toContain('Log Results');
    await closeModal(page, 'cancel');
  });

  test('edit modal has an Inputs section with port fields', async ({ page }) => {
    await openNodeEditor(page, LOG);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('ion-modal h3').filter({ hasText: 'Inputs' })).toBeVisible();
    const portFields = page.locator('ion-modal app-graph-port-field');
    expect(await portFields.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });
});
