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

  test('code input port is NOT rendered/connectable (G4-R1, value-provided)', async ({ page }) => {
    // FIXED (SAA-1478): G4-R1 requires the prefilled `code` input port to be
    // hidden. `graphPortVisible` now evaluates the value-mode rule before the
    // `required` rule, and the canvas derives the value mode from the node's
    // prefilled `defaultCode`, so no connectable `code` handle renders.
    const inputs = await getNodePorts(page, 'SplitTextCodeNode', 'in');
    expect(inputs).not.toContain('code');
  });

  test('edit modal prefills the code field with the split code (G4-R1)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const codeField = page
      .locator('ion-modal app-graph-port-field')
      .filter({ hasText: 'Code' })
      .first();
    const value = await codeField.locator('input.native-input, textarea').first().inputValue();
    expect(value).toContain('$input.text');
    expect(value).toContain('$input.count');
    expect(value).toContain('return chunks');
    await closeModal(page, 'cancel');
  });

  test('edit modal disables the code checkbox (value provided directly) (G4-R3)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10000 });
    const ball = page
      .locator('ion-modal app-graph-port-field .graph-port-field__ball')
      .first();
    await expect(ball).toHaveClass(/graph-port-field__ball--disabled/);
    await expect(ball).toHaveAttribute('aria-disabled', 'true');
    await expect(ball).toHaveAttribute(
      'title',
      'Value provided directly — clear it to connect from upstream'
    );
    await closeModal(page, 'cancel');
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
