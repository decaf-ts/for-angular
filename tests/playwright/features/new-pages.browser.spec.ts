/**
 * SAA-1473 — browser-level verification of the six new feature-demo routes.
 *
 * Each scenario drives the real demo page served by the Playwright `webServer`
 * on :8110: barcode re-rendering, chart data/family updates, code-editor
 * mode/emission, math evaluation, the storyboard tour lifecycle, and the
 * standalone diagrams canvas.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  chartCanvasSignature,
  collectPageErrors,
  ensureArtifacts,
  openRoute,
  withoutKnownAssetNoise,
} from './helpers';

test.setTimeout(120_000);

test.beforeEach(() => {
  ensureArtifacts();
});

function barcodeSvg(page: Page) {
  return page.locator('[data-testid="barcode-preview"] svg');
}

test.describe('Barcode feature page', () => {
  test('payload and symbology edits re-render the SVG in place', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openRoute(page, '/barcode', '[data-testid="barcode-preview"] svg');

    const initial = await barcodeSvg(page).innerHTML();
    await expect(page.locator('[data-testid="barcode-payload"]')).toHaveValue(
      'DECAF-1234-5678'
    );

    await page.locator('[data-testid="barcode-payload"]').fill('SAA-1473-PAYLOAD');
    await expect
      .poll(() => barcodeSvg(page).innerHTML(), { timeout: 10_000 })
      .not.toBe(initial);
    await expect(page.locator('.barcode-page__meta')).toContainText(
      '16 characters encoded'
    );

    const afterPayload = await barcodeSvg(page).innerHTML();
    await page.locator('[data-testid="barcode-symbology"]').selectOption('qrcode');
    await expect
      .poll(() => barcodeSvg(page).innerHTML(), { timeout: 10_000 })
      .not.toBe(afterPayload);
    await expect(page.locator('[data-testid="barcode-symbology"]')).toHaveValue(
      'qrcode'
    );

    const afterSymbology = await barcodeSvg(page).innerHTML();
    await page.locator('[data-testid="barcode-scale"]').fill('8');
    await expect
      .poll(() => barcodeSvg(page).innerHTML(), { timeout: 10_000 })
      .not.toBe(afterSymbology);

    await page.locator('[data-testid="barcode-reset"]').click();
    await expect(page.locator('[data-testid="barcode-payload"]')).toHaveValue(
      'DECAF-1234-5678'
    );
    await expect(page.locator('[data-testid="barcode-symbology"]')).toHaveValue(
      'datamatrix'
    );

    expect(errors, `console errors on /barcode: ${errors.join('\n')}`).toEqual([]);
  });

  test('first render exposes the symbology that the preview actually renders (SAA-1483 D1)', async ({
    page,
  }) => {
    await openRoute(page, '/barcode', '[data-testid="barcode-preview"] svg');

    const select = page.locator('[data-testid="barcode-symbology"]');
    // D1: the select used to bind its value before the @for options existed,
    // painting gs1datamatrix while the signal and SVG were datamatrix.
    await expect(select).toHaveValue('datamatrix');
    const firstRender = await barcodeSvg(page).innerHTML();

    // The first `@for` option (gs1datamatrix) cannot encode the default
    // payload and would render the error state, so the first paint (a real
    // DataMatrix SVG) cannot have been gs1datamatrix.
    await select.selectOption('gs1datamatrix');
    await expect(page.locator('.barcode-page__error[role="alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="barcode-preview"]')).toHaveCount(0);

    // A different symbology must produce different markup; switching back to
    // datamatrix must reproduce the first render exactly, proving the first
    // SVG is datamatrix.
    await select.selectOption('qrcode');
    await expect
      .poll(async () => barcodeSvg(page).innerHTML(), { timeout: 10_000 })
      .not.toBe(firstRender);

    await select.selectOption('datamatrix');
    await expect
      .poll(async () => barcodeSvg(page).innerHTML(), { timeout: 10_000 })
      .toBe(firstRender);
  });

  test('an empty payload replaces the preview with the empty state', async ({ page }) => {
    await openRoute(page, '/barcode', '[data-testid="barcode-preview"] svg');

    await page.locator('[data-testid="barcode-payload"]').fill('   ');

    await expect(page.locator('[data-testid="barcode-preview"]')).toHaveCount(0);
    await expect(page.locator('.barcode-page__empty')).toBeVisible();
  });
});

test.describe('Charts feature page', () => {
  test('switching the family renders the matching chart component', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openRoute(page, '/charts', '[data-testid="charts-chart"] canvas');

    await expect(page.locator('ngx-decaf-line-chart')).toHaveCount(1);
    const lineSignature = await chartCanvasSignature(page);

    await page.locator('[data-testid="charts-family"]').selectOption('bar');
    await expect(page.locator('ngx-decaf-bar-chart')).toBeVisible();
    await expect(page.locator('ngx-decaf-line-chart')).toHaveCount(0);

    await page.locator('[data-testid="charts-family"]').selectOption('pie');
    await expect(page.locator('ngx-decaf-pie-chart')).toBeVisible();

    await page.locator('[data-testid="charts-family"]').selectOption('scatter');
    await expect(page.locator('ngx-decaf-scatter-chart')).toBeVisible();

    await page.locator('[data-testid="charts-family"]').selectOption('line');
    await expect(page.locator('ngx-decaf-line-chart')).toBeVisible();
    await expect
      .poll(() => chartCanvasSignature(page), { timeout: 15_000 })
      .not.toBe(lineSignature);

    expect(errors, `console errors on /charts: ${errors.join('\n')}`).toEqual([]);
  });

  test('editing a dataset value and toggling options re-renders the live chart', async ({
    page,
  }) => {
    await openRoute(page, '/charts', '[data-testid="charts-chart"] canvas');
    const initial = await chartCanvasSignature(page);

    const valueInput = page
      .locator('.charts-page__table tbody tr')
      .first()
      .locator('input[type="number"]')
      .first();
    await valueInput.fill('180');
    await expect(valueInput).toHaveValue('180');
    await expect
      .poll(() => chartCanvasSignature(page), { timeout: 15_000 })
      .not.toBe(initial);

    await expect(
      page.locator('.charts-page__table tbody tr')
    ).toHaveCount(5);
    await page.locator('[data-testid="charts-add-row"]').click();
    await expect(page.locator('.charts-page__table tbody tr')).toHaveCount(6);

    await page.locator('[data-testid="charts-legend"]').uncheck();
    await expect(page.locator('[data-testid="charts-legend"]')).not.toBeChecked();
    await page.locator('.charts-page__table tbody tr').last().getByRole('button').click();
    await expect(page.locator('.charts-page__table tbody tr')).toHaveCount(5);
  });
});

test.describe('Code editor feature page', () => {
  test('typing emits codeChange and updates the live counters and syntax state', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await openRoute(page, '/code-editor', '.cm-content');

    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('return 42;');

    await expect(page.locator('[data-testid="code-editor-emitted"]')).toContainText(
      'return 42;'
    );
    await expect(page.locator('[data-testid="code-editor-lines"]')).toHaveText('1');
    await expect(page.locator('[data-testid="code-editor-characters"]')).toHaveText(
      '10'
    );
    await expect(page.locator('[data-testid="code-editor-syntax"]')).toContainText(
      'Syntax valid'
    );

    await page.locator('[data-testid="code-editor-mode"]').selectOption('formula');
    await expect(page.locator('.code-editor-host--formula')).toBeVisible();
    await expect(page.locator('[data-testid="code-editor-syntax"]')).toContainText(
      'Formula mode'
    );

    await page.locator('[data-testid="code-editor-snippet-formula"]').click();
    await expect(page.locator('[data-testid="code-editor-mode"]')).toHaveValue(
      'formula'
    );

    await page.locator('[data-testid="code-editor-reset"]').click();
    await expect(page.locator('[data-testid="code-editor-lines"]')).toHaveText('0');
    await expect(page.locator('[data-testid="code-editor-syntax"]')).toContainText(
      'Start typing'
    );

    expect(errors, `console errors on /code-editor: ${errors.join('\n')}`).toEqual([]);
  });

  test('accepts multi-statement code and flags malformed code (SAA-1483 D2)', async ({
    page,
  }) => {
    await openRoute(page, '/code-editor', '.cm-content');

    const editor = page.locator('.cm-content');
    const syntax = page.locator('[data-testid="code-editor-syntax"]');

    // D2: validation wrapped the body in `return (...)`; a plain const
    // declaration is valid JavaScript but threw under that wrapper.
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('const answer = 42;');
    await expect(syntax).toContainText('Syntax valid');
    await expect(page.locator('.code-editor-page__syntax--error')).toHaveCount(0);

    await page.keyboard.press('Control+A');
    await page.keyboard.type('const value = ;');
    await expect(page.locator('.code-editor-page__syntax--error')).toBeVisible();
    await expect(syntax).toContainText('Syntax error');
    await expect(syntax).not.toContainText('Syntax valid');
  });
});

test.describe('Math feature page', () => {
  test('evaluates examples, live input, and clears back to the empty state', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await openRoute(page, '/math', 'math-field');

    await expect(page.locator('[data-testid="math-result"]')).toContainText('x');

    await page.locator('[data-testid="math-example-fraction"]').click();
    await expect(page.locator('[data-testid="math-latex"]')).toContainText(
      '\\frac{3}{4}'
    );
    await expect(page.locator('[data-testid="math-result"]')).toHaveText('0.875');

    await page.locator('[data-testid="math-example-integral"]').click();
    await expect
      .poll(
        async () => Number(await page.locator('[data-testid="math-result"]').innerText()),
        { timeout: 10_000 }
      )
      .toBeCloseTo(1 / 3, 6);

    await page.locator('math-field').evaluate((element) => {
      const field = element as HTMLElement & { value: string };
      field.value = '5+7';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('[data-testid="math-result"]')).toHaveText('12');

    await page.locator('[data-testid="math-clear"]').click();
    await expect(page.locator('[data-testid="math-result"]')).toHaveCount(0);
    await expect(page.locator('.math-page__empty')).toBeVisible();

    expect(
      withoutKnownAssetNoise(errors),
      `console errors on /math: ${errors.join('\n')}`
    ).toEqual([]);
  });

  test('rejects invalid LaTeX instead of printing a parse error as a result (SAA-1483 D3)', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await openRoute(page, '/math', 'math-field');

    await expect(page.locator('[data-testid="math-result"]')).toContainText('x');

    // D3: an incomplete fraction parses to an invalid expression whose error
    // object used to be stringified into the result as if it were a value.
    await page.locator('math-field').evaluate((element) => {
      const field = element as HTMLElement & { value: string };
      field.value = '\\frac{1}{';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(page.locator('.math-page__error[role="alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="math-result"]')).toHaveCount(0);

    // A valid formula recovers from the error state.
    await page.locator('math-field').evaluate((element) => {
      const field = element as HTMLElement & { value: string };
      field.value = '\\frac{1}{2}';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('.math-page__error')).toHaveCount(0);
    await expect(page.locator('[data-testid="math-result"]')).toHaveText('0.5');

    expect(
      withoutKnownAssetNoise(errors),
      `console errors on /math: ${errors.join('\n')}`
    ).toEqual([]);
  });
});

test.describe('Storyboard feature page', () => {
  test('runs the start/next/confirm/end tour lifecycle', async ({ page }) => {
    const errors = collectPageErrors(page);
    await openRoute(page, '/storyboard', '[data-testid="storyboard-start"]');

    const next = page.locator('[data-testid="storyboard-next"]');
    const previous = page.locator('[data-testid="storyboard-previous"]');
    const end = page.locator('[data-testid="storyboard-end"]');
    const status = page.locator('[data-testid="storyboard-status"]');
    const activeStep = page.locator('[data-testid="storyboard-active-step"]');

    await expect(status).toHaveText('Idle');
    await expect(next).toBeDisabled();
    await expect(previous).toBeDisabled();
    await expect(end).toBeDisabled();

    await page.locator('[data-testid="storyboard-start"]').click();
    await expect(status).toHaveText('Running');
    await expect(next).toBeEnabled();
    await expect(activeStep).toContainText('Welcome');
    await expect(page.locator('ngx-decaf-storyboard-tutorial')).toBeAttached();

    await next.click();
    await expect(activeStep).toContainText('Type your name');

    await page.locator('[data-testid="storyboard-name"]').fill('Demo user');
    await page.locator('[data-testid="storyboard-confirm"]').click();
    await expect(page.locator('[data-testid="storyboard-confirmed"]')).toContainText(
      'Demo user'
    );

    await next.click();
    await expect(activeStep).toContainText('Confirm the value');
    await next.click();
    await expect(activeStep).toContainText('Tour complete');

    await end.click();
    await expect(status).toHaveText('Completed');
    await expect(page.locator('[data-testid="storyboard-last-event"]')).toContainText(
      'Completed'
    );
    await expect(next).toBeDisabled();
    await expect(page.locator('ngx-decaf-storyboard-tutorial')).toHaveCount(1);

    expect(errors, `console errors on /storyboard: ${errors.join('\n')}`).toEqual([]);
  });
});

test.describe('Diagrams feature page', () => {
  test('renders the two-node preview without touching the /graph document store', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    const mutations: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (request.method() !== 'GET' || /workflow|document/i.test(url)) {
        mutations.push(`${request.method()} ${url}`);
      }
    });

    await openRoute(page, '/diagrams', '.ng-diagram-node');

    await expect(page.locator('.ng-diagram-node')).toHaveCount(2);
    const nodeText = page.locator('.ng-diagram-node');
    await expect(nodeText.filter({ hasText: 'Transform' })).toBeVisible();
    await expect(nodeText.filter({ hasText: 'Log result' })).toBeVisible();
    await expect(page.locator('.diagrams-page__meta')).toContainText('2 nodes');
    await expect(page.locator('.diagrams-page__meta')).toContainText('1 connections');
    await expect(page).toHaveURL(/\/diagrams$/);

    expect(
      mutations,
      `the /diagrams preview must not mutate the /graph workflow store: ${mutations.join(', ')}`
    ).toEqual([]);
    expect(errors, `console errors on /diagrams: ${errors.join('\n')}`).toEqual([]);
  });
});
