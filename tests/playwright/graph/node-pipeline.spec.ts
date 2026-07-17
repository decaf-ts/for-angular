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

test.describe('GraphPlanningPipeline (pipeline)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, 'GraphPlanningPipeline');
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('Planning');
  });

  test('has the Pipeline category accent colour (#0ea5e9)', async ({ page }) => {
    const color = await getNodeAccentColor(page, 'GraphPlanningPipeline');
    expect(color.toLowerCase()).toBe('#0ea5e9');
  });

  test('has a brief input port', async ({ page }) => {
    const inputs = await getNodePorts(page, 'GraphPlanningPipeline', 'in');
    expect(inputs).toContain('brief');
  });

  test('brief input port is connected from Intake workflow', async ({ page }) => {
    expect(await isPortConnected(page, 'GraphPlanningPipeline', 'brief')).toBe(true);
  });

  test('plan output port is connected to Draft node', async ({ page }) => {
    expect(await isPortConnected(page, 'GraphPlanningPipeline', 'plan')).toBe(true);
  });

  test('double-click opens the node edit modal', async ({ page }) => {
    await openNodeEditor(page, 'GraphPlanningPipeline');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const title = await getModalTitle(page);
    expect(title).toContain('Planning');
    await closeModal(page, 'cancel');
  });
});
