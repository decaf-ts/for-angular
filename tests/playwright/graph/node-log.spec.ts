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

const LOG_NODES = [
  { id: 'ShortLogNode', title: 'Log Short' },
  { id: 'LongLogNode', title: 'Log Long' },
  { id: 'DefaultLogNode', title: 'Log Default' },
];

for (const node of LOG_NODES) {
  test.describe(`LogFlowNode — ${node.id} (core.flow.log)`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoGraph(page);
    });

    test('renders with correct title', async ({ page }) => {
      const article = getNodeArticle(page, node.id);
      await expect(article).toBeVisible();
      await expect(article.locator('.graph-node__name')).toHaveText(node.title);
    });

    test('has the Flow Control category accent colour (#6366f1)', async ({ page }) => {
      const color = await getNodeAccentColor(page, node.id);
      expect(color.toLowerCase()).toBe('#6366f1');
    });

    test('has a value input port', async ({ page }) => {
      const inputs = await getNodePorts(page, node.id, 'in');
      expect(inputs).toContain('value');
    });

    test('value input port is connected from Switch node', async ({ page }) => {
      expect(await isPortConnected(page, node.id, 'value')).toBe(true);
    });

    test('logged output port is hidden (has @uielement, not in port mode, not connected)', async ({ page }) => {
      const outputs = await getNodePorts(page, node.id, 'out');
      expect(outputs).not.toContain('logged');
    });

    test('double-click opens the node edit modal', async ({ page }) => {
      await openNodeEditor(page, node.id);
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
      const title = await getModalTitle(page);
      expect(title).toContain('Log');
      await closeModal(page, 'cancel');
    });

    test('edit modal has an Inputs section with port fields', async ({ page }) => {
      await openNodeEditor(page, node.id);
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('ion-modal h3').filter({ hasText: 'Inputs' })).toBeVisible();
      const portFields = page.locator('ion-modal app-graph-port-field');
      expect(await portFields.count()).toBeGreaterThan(0);
      await closeModal(page, 'cancel');
    });
  });
}
