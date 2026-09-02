/**
 * @module tests/playwright/graph/node-switch.spec
 * @summary Switch node (core.flow.switch) UI coverage against the CURRENT demo.
 * @description The old demo workflow embedded a configured `LineLengthSwitchNode`
 * on canvas; the reworked demo (workflow-root.ts) no longer ships a switch
 * member node, so this suite adds a Switch node through the manifest-driven
 * palette first (the P7 cutover's only node-creation path) and then asserts
 * the port contract and the switch edit modal against the palette-added node
 * (SAA-550: stale demo-id selectors updated to the current demo).
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getNodeAccentColor,
  openNodeEditor,
  closeModal,
  getModalTitle,
  getNodeArticle,
} from './helpers';

/** Palette-added switch instance id (GraphNodePaletteFactory seed + label infix). */
const SWITCH = 'core-flow-switch-Switch';

/** Adds a Switch node through the manifest-driven palette (no constructors). */
async function addSwitchNode(page: Page): Promise<void> {
  await page.locator('button.graph-renderer__palette-btn').click();
  const entry = page
    .locator('.graph-renderer__palette-item')
    .filter({ hasText: 'Switch' })
    .first();
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(getNodeArticle(page, SWITCH)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
}

test.describe('Switch node (core.flow.switch), palette-added', () => {
  // The suite is heavy: each test's beforeEach boots the graph page and adds a
  // palette node, and the default-toggle flow reopens the modal twice with
  // bounded waits — the 30s default test timeout fires mid-flow, so this suite
  // carries an explicit bounded timeout.
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.route('**/graph/results/__health__', (route) =>
      route.fulfill({ status: 404, body: '' })
    );
    await page.route('**/graph/workflows/**', (route) =>
      route.fulfill({ status: 404, body: '' })
    );
    await gotoGraph(page);
    await addSwitchNode(page);
  });

  test('renders with correct title', async ({ page }) => {
    const article = getNodeArticle(page, SWITCH);
    await expect(article).toBeVisible();
    await expect(article.locator('.graph-node__name')).toHaveText('Switch');
  });

  test('has the Flow Control category accent colour (#f97316)', async ({ page }) => {
    const color = await getNodeAccentColor(page, SWITCH);
    expect(color.toLowerCase()).toBe('#f97316');
  });

  test('has a value input port', async ({ page }) => {
    const inputs = await getNodePorts(page, SWITCH, 'in');
    expect(inputs).toContain('value');
  });

  test('default output port is visible (manifest default port)', async ({ page }) => {
    const outputs = await getNodePorts(page, SWITCH, 'out');
    expect(outputs).toContain('default');
  });

  test('double-click opens the switch edit modal', async ({ page }) => {
    await openNodeEditor(page, SWITCH);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    const title = await getModalTitle(page);
    expect(title).toContain('Switch');
    await closeModal(page, 'cancel');
  });

  test('switch edit modal shows condition editor', async ({ page }) => {
    await openNodeEditor(page, SWITCH);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('ion-modal app-graph-switch-edit-modal')).toBeVisible({ timeout: 10_000 });
    await closeModal(page, 'cancel');
  });

  test('switch edit modal has drag handles for conditions', async ({ page }) => {
    await openNodeEditor(page, SWITCH);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    // A fresh palette switch carries an empty cases list — create one condition
    // first so the reorder machinery (drag handle per condition row) renders.
    await page.locator('ion-modal ion-button').filter({ hasText: 'Add' }).first().click();
    await page.waitForTimeout(400);
    const dragHandles = page.locator('ion-modal .condition-drag-handle, ion-modal [draggable="true"]');
    expect(await dragHandles.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });

  test('switch edit modal has a default toggle', async ({ page }) => {
    await openNodeEditor(page, SWITCH);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    const toggle = page.locator('ion-modal ion-toggle, ion-modal [type="checkbox"]');
    expect(await toggle.count()).toBeGreaterThan(0);
    await closeModal(page, 'cancel');
  });

  test('toggling default flips the default output port (canonical hasDefault parameter)', async ({ page }) => {
    // A fresh palette switch renders the manifest default port (hasDefault
    // carries the fixture manifest's initial value; read it, don't assume it).
    const outputsBefore = await getNodePorts(page, SWITCH, 'out');
    const hadDefaultPort = outputsBefore.includes('default');

    // Toggle default through the modal (writes parameters['hasDefault']).
    await openNodeEditor(page, SWITCH);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    const toggle = page.locator('ion-modal ion-toggle').first();
    const isCheckedBefore = await toggle.evaluate((el) => (el as HTMLElement & { checked?: boolean }).checked);
    await toggle.click();
    await page.waitForTimeout(500);
    await closeModal(page, 'save');
    await page.waitForTimeout(2000);

    // The default port visibility flipped with the toggle.
    const outputsAfter = await getNodePorts(page, SWITCH, 'out');
    expect(outputsAfter.includes('default')).toBe(!hadDefaultPort);

    // Toggle back — the default port visibility restores.
    await openNodeEditor(page, SWITCH);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    const toggle2 = page.locator('ion-modal ion-toggle').first();
    const isCheckedAfter = await toggle2.evaluate((el) => (el as HTMLElement & { checked?: boolean }).checked);
    expect(isCheckedAfter).toBe(!isCheckedBefore);
    await toggle2.click();
    await page.waitForTimeout(1000);
    await closeModal(page, 'save');
    await page.waitForTimeout(2000);

    const outputsRestored = await getNodePorts(page, SWITCH, 'out');
    expect(outputsRestored.includes('default')).toBe(hadDefaultPort);
  });
});
