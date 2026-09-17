import { test, expect, type Page } from '@playwright/test';
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
 * The current demo workflow (workflow-root.ts) ships no `core.loop.while`
 * member node, so the suite adds one through the manifest-driven palette (the P7
 * cutover's only node-creation path) and asserts the Loop contract against it.
 * Palette-added ids follow `GraphNodePaletteFactory` (kind slug + display name).
 */
const WHILE = 'core-loop-while-GraphWhileLoopNode';

async function addWhileNode(page: Page): Promise<void> {
  await page.locator('button.graph-renderer__palette-btn').click();
  const entry = page
    .locator('.graph-renderer__palette-item')
    .filter({ hasText: 'GraphWhileLoopNode' })
    .first();
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(getNodeArticle(page, WHILE)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
}

test.describe('GraphWhileLoopNode (core.loop.while), palette-added', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
    await addWhileNode(page);
  });

  test('renders with the manifest display name', async ({ page }) => {
    const article = getNodeArticle(page, WHILE);
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('GraphWhileLoopNode');
  });

  test('has the Loop category accent colour (#eab308)', async ({ page }) => {
    const color = await getNodeAccentColor(page, WHILE);
    expect(color.toLowerCase()).toBe('#eab308');
  });

  test('has a state input port', async ({ page }) => {
    const inputs = await getNodePorts(page, WHILE, 'in');
    expect(inputs).toContain('state');
  });

  test('input port label is "State"', async ({ page }) => {
    const article = getNodeArticle(page, WHILE);
    const label = await article.locator('div.graph-node__port--in .graph-node__port-label').first().textContent();
    expect(label?.trim()).toBe('State');
  });

  test('state input port is not connected (fresh palette node)', async ({ page }) => {
    expect(await isPortConnected(page, WHILE, 'state')).toBe(false);
  });

  test('required output port stateOut is visible (D2/G3-05)', async ({ page }) => {
    const outputs = await getNodePorts(page, WHILE, 'out');
    expect(outputs).toContain('stateOut');
  });

  test('required input port state stays visible while unconnected (D2/G3-06)', async ({ page }) => {
    const inputs = await getNodePorts(page, WHILE, 'in');
    expect(inputs).toContain('state');
    expect(await isPortConnected(page, WHILE, 'state')).toBe(false);
  });

  test('double-click opens the node edit modal', async ({ page }) => {
    await openNodeEditor(page, WHILE);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 20000 });
    const title = await getModalTitle(page);
    expect(title).toContain('While');
    await closeModal(page, 'cancel');
  });

  test('edit modal has an Inputs section with port fields', async ({ page }) => {
    await openNodeEditor(page, WHILE);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('ion-modal h3').filter({ hasText: 'Inputs' })).toBeVisible();
    const portFields = page.locator('ion-modal app-graph-port-field');
    expect(await portFields.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });
});
