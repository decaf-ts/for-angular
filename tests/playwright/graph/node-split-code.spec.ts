import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getNodeAccentColor,
  openNodeEditor,
  getNodeArticle,
  isPortConnected,
} from './helpers';

test.describe('SplitTextCodeNode (core.utility.code)', () => {
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

  test('renders the code field as an IDE-like CodeMirror editor (DECAF-50 r2)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    const codeField = inspection
      .locator('app-graph-port-field')
      .filter({ hasText: 'Code' })
      .first();

    // the manifest `element.tag: 'code-editor'` routes this input to the
    // CodeMirror editor, not a bare ion-input/ion-textarea
    const editor = codeField.locator('.cm-editor');
    await expect(editor).toBeVisible();
    await expect(codeField.locator('.cm-gutters')).toBeVisible();
    await expect(codeField.locator('.cm-content[contenteditable="true"]')).toBeVisible();
    await inspection.locator('.graph-node-inspection__close').click();
  });

  test('split view prefills the code field with the split code (G4-R1)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    const codeField = inspection
      .locator('app-graph-port-field')
      .filter({ hasText: 'Code' })
      .first();
    const value = (await codeField.locator('.cm-content').textContent()) ?? '';
    expect(value).toContain('$input.text');
    expect(value).toContain('$input.count');
    expect(value).toContain('return chunks');
    await inspection.locator('.graph-node-inspection__close').click();
  });

  test('split view marks the code checkbox selected but disabled (value provided) (G4-R3/R4-9)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    const ball = inspection
      .locator('app-graph-port-field .graph-port-field__ball')
      .first();
    await expect(ball).toHaveClass(/graph-port-field__ball--disabled/);
    await expect(ball).toHaveClass(/graph-port-field__ball--active/);
    await expect(ball).toHaveAttribute('aria-disabled', 'true');
    await expect(ball).toHaveAttribute(
      'title',
      'Value provided directly — clear it to connect from upstream'
    );
    await inspection.locator('.graph-node-inspection__close').click();
  });

  test('double-click opens the unified split-view editor (R4-8)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    await expect(inspection.locator('.graph-node-inspection__identity')).toContainText(
      'Split'
    );
    await expect(page.locator('ion-modal')).toBeHidden();
    await inspection.locator('.graph-node-inspection__close').click();
  });

  test('un-ran split view has a CRUD center with port fields and omits the run panes (R4-8)', async ({ page }) => {
    await openNodeEditor(page, 'SplitTextCodeNode');
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10000 });
    await expect(
      inspection.locator('.graph-node-inspection__pane--crud app-graph-node-inline-editor')
    ).toBeVisible();
    expect(await inspection.locator('app-graph-port-field').count()).toBeGreaterThan(0);
    await expect(inspection.locator('.graph-node-inspection__pane--inputs')).toHaveCount(0);
    await expect(inspection.locator('.graph-node-inspection__pane--outputs')).toHaveCount(0);
    await inspection.locator('.graph-node-inspection__close').click();
  });
});
