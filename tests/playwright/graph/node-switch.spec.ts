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

test.describe('LineLengthSwitchNode (core.flow.switch)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, 'LineLengthSwitchNode');
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('Switch');
  });

  test('has the Flow Control category accent colour (#f97316)', async ({ page }) => {
    const color = await getNodeAccentColor(page, 'LineLengthSwitchNode');
    expect(color.toLowerCase()).toBe('#f97316');
  });

  test('has a value input port', async ({ page }) => {
    const inputs = await getNodePorts(page, 'LineLengthSwitchNode', 'in');
    expect(inputs).toContain('value');
  });

  test('case ports (short, long) are always visible (no @uielement)', async ({ page }) => {
    const outputs = await getNodePorts(page, 'LineLengthSwitchNode', 'out');
    expect(outputs).toContain('short');
    expect(outputs).toContain('long');
  });

  test('default port is visible (hasDefault is true)', async ({ page }) => {
    const outputs = await getNodePorts(page, 'LineLengthSwitchNode', 'out');
    expect(outputs).toContain('default');
  });

  test('port ordering is [value, short, long, default]', async ({ page }) => {
    const allPorts = await page.locator('[data-node-id="LineLengthSwitchNode"] [data-port-id]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-port-id') || '')
    );
    const valueIdx = allPorts.indexOf('value');
    const shortIdx = allPorts.indexOf('short');
    const longIdx = allPorts.indexOf('long');
    const defaultIdx = allPorts.indexOf('default');
    expect(valueIdx).toBeLessThan(shortIdx);
    expect(shortIdx).toBeLessThan(longIdx);
    expect(longIdx).toBeLessThan(defaultIdx);
  });

  test('value input port is connected from Code node', async ({ page }) => {
    expect(await isPortConnected(page, 'LineLengthSwitchNode', 'value')).toBe(true);
  });

  test('short output port is connected to ShortLogNode', async ({ page }) => {
    expect(await isPortConnected(page, 'LineLengthSwitchNode', 'short')).toBe(true);
  });

  test('long output port is connected to LongLogNode', async ({ page }) => {
    expect(await isPortConnected(page, 'LineLengthSwitchNode', 'long')).toBe(true);
  });

  test('default output port is connected to DefaultLogNode', async ({ page }) => {
    expect(await isPortConnected(page, 'LineLengthSwitchNode', 'default')).toBe(true);
  });

  test('double-click opens the switch edit modal', async ({ page }) => {
    await openNodeEditor(page, 'LineLengthSwitchNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const title = await getModalTitle(page);
    expect(title).toContain('Switch');
    await closeModal(page, 'cancel');
  });

  test('switch edit modal shows condition editor', async ({ page }) => {
    await openNodeEditor(page, 'LineLengthSwitchNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('ion-modal app-graph-switch-edit-modal')).toBeVisible({ timeout: 10000 });
    await closeModal(page, 'cancel');
  });

  test('switch edit modal has drag handles for conditions', async ({ page }) => {
    await openNodeEditor(page, 'LineLengthSwitchNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const dragHandles = page.locator('ion-modal .condition-drag-handle, ion-modal [draggable="true"]');
    expect(await dragHandles.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });

  test('switch edit modal has a default toggle', async ({ page }) => {
    await openNodeEditor(page, 'LineLengthSwitchNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const toggle = page.locator('ion-modal ion-toggle, ion-modal [type="checkbox"]');
    expect(await toggle.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });

  test('toggling default off hides the default port; toggling on auto-creates a Log node', async ({ page }) => {
    // Initially hasDefault is true and default port is visible
    let outputs = await getNodePorts(page, 'LineLengthSwitchNode', 'out');
    expect(outputs).toContain('default');

    // Toggle default OFF
    await openNodeEditor(page, 'LineLengthSwitchNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const toggle = page.locator('ion-modal ion-toggle').first();
    const isChecked = await toggle.evaluate((el) => el.checked);
    expect(isChecked).toBe(true);
    await toggle.click();
    await page.waitForTimeout(500);
    await closeModal(page, 'save');
    await page.waitForTimeout(2000);

    // default port should no longer be visible on the switch node
    outputs = await getNodePorts(page, 'LineLengthSwitchNode', 'out');
    expect(outputs).not.toContain('default');

    // Re-enable default — should auto-create a new Log node
    const idsBefore = await page.locator('[data-node-id]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-node-id') || '')
    );
    await openNodeEditor(page, 'LineLengthSwitchNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const toggle2 = page.locator('ion-modal ion-toggle').first();
    const isChecked2 = await toggle2.evaluate((el) => el.checked);
    expect(isChecked2).toBe(false);
    await toggle2.click();
    await page.waitForTimeout(1000);
    await closeModal(page, 'save');
    await page.waitForTimeout(2000);

    // default port should be visible again
    outputs = await getNodePorts(page, 'LineLengthSwitchNode', 'out');
    expect(outputs).toContain('default');

    // A new Log node should have been auto-created
    const idsAfter = await page.locator('[data-node-id]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-node-id') || '')
    );
    const newNodes = idsAfter.filter(id => !idsBefore.includes(id));
    expect(newNodes.length).toBeGreaterThan(0);
  });
});
