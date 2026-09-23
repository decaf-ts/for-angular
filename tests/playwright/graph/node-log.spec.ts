import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getNodeAccentColor,
  openNodeEditor,
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

  test('double-click opens the unified split-view editor (R4-8)', async ({ page }) => {
    await openNodeEditor(page, LOG);
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    await expect(inspection.locator('.graph-node-inspection__identity')).toContainText(
      'Log Results'
    );
    // The old pre-run Ionic edit modal is gone (R4-8).
    await expect(page.locator('ion-modal')).toBeHidden();
    await inspection.locator('.graph-node-inspection__close').click();
    await expect(inspection).toBeHidden();
  });

  test('un-ran split view has a CRUD center and omits the run panes (R4-8)', async ({ page }) => {
    await openNodeEditor(page, LOG);
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    await expect(inspection).toHaveClass(/graph-node-inspection--crud-only/);
    await expect(
      inspection.locator('.graph-node-inspection__pane--crud app-graph-node-inline-editor')
    ).toBeVisible();
    await expect(inspection.locator('.graph-node-inspection__pane--inputs')).toHaveCount(0);
    await expect(inspection.locator('.graph-node-inspection__pane--outputs')).toHaveCount(0);
    await inspection.locator('.graph-node-inspection__close').click();
  });
});
