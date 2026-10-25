/**
 * SAA-1473 — accessibility sanity for the six new feature-demo pages.
 *
 * Asserts no critical/serious axe violations in the page content region and
 * checks the labels, roles, and keyboard paths the demo pages expose.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { ARTIFACTS, ensureArtifacts, openRoute } from './helpers';

test.setTimeout(120_000);

async function audit(
  page: Page,
  root: string,
  name: string,
  knownFindings: string[] = []
): Promise<void> {
  ensureArtifacts();
  const results = await new AxeBuilder({ page }).include(root).analyze();
  fs.writeFileSync(
    `${ARTIFACTS}/axe-${name}.json`,
    JSON.stringify(
      {
        url: page.url(),
        scope: root,
        violations: results.violations,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
      },
      null,
      2
    )
  );
  await page.screenshot({
    path: `${ARTIFACTS}/axe-${name}.png`,
    fullPage: true,
  });
  const serious = results.violations.filter(
    (violation) =>
      (violation.impact === 'critical' || violation.impact === 'serious') &&
      !knownFindings.includes(violation.id)
  );
  expect(
    serious.map((violation) => violation.id),
    `serious/critical axe violations on ${name}: ${JSON.stringify(
      serious.flatMap((violation) =>
        violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        }))
      )
    )}`
  ).toEqual([]);
}

test('barcode page: labelled controls and a named image preview', async ({ page }) => {
  await openRoute(page, '/barcode', '[data-testid="barcode-preview"] svg');

  await expect(page.getByLabel('Payload')).toBeVisible();
  await expect(page.getByLabel('Symbology')).toBeVisible();
  await expect(page.getByLabel('Scale')).toBeVisible();
  const preview = page.locator('[data-testid="barcode-preview"]');
  await expect(preview).toHaveAttribute('role', 'img');
  await expect(preview).toHaveAttribute('aria-label', /barcode/i);

  await page.getByLabel('Payload').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Symbology')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Scale')).toBeFocused();

  await audit(page, '.barcode-page', 'barcode');
});

test('charts page: table headers, named inputs, and chart role', async ({ page }) => {
  await openRoute(page, '/charts', '[data-testid="charts-chart"] canvas');

  await expect(page.getByRole('columnheader')).toHaveCount(5);
  await expect(page.getByLabel('Category 1')).toBeVisible();
  await expect(page.getByLabel('Value 1')).toBeVisible();
  await expect(page.getByRole('img', { name: /chart/i }).first()).toBeVisible();

  await page.getByLabel('Category 1').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Value 1')).toBeFocused();

  await audit(page, '.charts-page', 'charts');
});

test('code editor page: named editor surface and mode control', async ({ page }) => {
  await openRoute(page, '/code-editor', '.cm-content');

  await expect(page.getByLabel('Editing mode')).toBeVisible();
  await expect(page.locator('.cm-content')).toHaveAttribute('aria-label', /code editor/i);
  await expect(page.locator('[data-testid="code-editor-syntax"]')).toHaveAttribute(
    'aria-live',
    'polite'
  );

  await page.locator('.cm-content').focus();
  await expect(page.locator('.cm-content')).toBeFocused();

  // SAA-1483 D4 fixed the success-hint and one-dark contrast palette, so the
  // gate now enforces color-contrast on this page rather than allowlisting it.
  await audit(page, '.code-editor-page', 'code-editor');

  // Prove the specific rule was actually evaluated against the rendered
  // editor tokens, not merely absent from the full audit.
  const contrast = await new AxeBuilder({ page })
    .include('.code-editor-page')
    .withRules(['color-contrast'])
    .analyze();
  expect(
    contrast.violations.map((violation) => violation.id),
    `color-contrast violations: ${JSON.stringify(contrast.violations)}`
  ).toEqual([]);
  // Line-number gutters are too short for axe to classify, but the rule must
  // still have produced a real pass on the page's text rather than being
  // skipped wholesale.
  expect(contrast.passes.map((result) => result.id)).toContain('color-contrast');
});

test('math page: labelled formula field and live result region', async ({ page }) => {
  await openRoute(page, '/math', 'math-field');

  await expect(page.locator('decaf-math-input')).toHaveAttribute(
    'aria-labelledby',
    'math-input-label'
  );
  await expect(page.locator('.math-page__output')).toHaveAttribute('aria-live', 'polite');

  await expect(page.locator('math-field')).toHaveAttribute('tabindex', '0', {
    timeout: 15_000,
  });
  await page.locator('math-field').click();
  await expect(page.locator('math-field')).toBeFocused({ timeout: 10_000 });

  await audit(page, '.math-page', 'math');
});

test('storyboard page: keyboard-activated controls and a live status region', async ({
  page,
}) => {
  await openRoute(page, '/storyboard', '[data-testid="storyboard-start"]');

  await expect(page.getByRole('button', { name: 'Start tutorial' })).toBeVisible();
  await expect(page.locator('.storyboard-page__status')).toHaveAttribute(
    'aria-live',
    'polite'
  );

  const start = page.locator('[data-testid="storyboard-start"]');
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="storyboard-status"]')).toHaveText('Running');

  await audit(page, '.storyboard-page', 'storyboard');
});

test('diagrams page: canvas renders a named workflow region', async ({ page }) => {
  await openRoute(page, '/diagrams', '.ng-diagram-node');

  await expect(page.locator('.diagrams-page__meta')).toContainText('Two-step pipeline');
  await expect(page.locator('[data-testid="diagrams-canvas"]')).toBeVisible();

  // Pre-existing renderer evidence (recorded in axe-diagrams.json before
  // SAA-1473): the graph-renderer workflow-inputs side body is scrollable
  // without focusable content. That is a graph-renderer contract issue, not a
  // demo-page regression, and the pinned manifest excludes
  // `for-angular/src/graph`, so the entry stays with this recorded note.
  await audit(page, '.diagrams-page', 'diagrams', ['scrollable-region-focusable']);
});

test('calendar page: named grid, labelled controls, and a keyboard day grid', async ({
  page,
}) => {
  await openRoute(page, '/calendar', '[data-testid="calendar-grid"]');

  await expect(page.locator('[data-testid="calendar-grid"] .dcf-calendar')).toHaveAttribute(
    'aria-label',
    /calendar/i
  );
  await expect(page.locator('[data-testid="calendar-grid"] [role="grid"]')).toBeVisible();
  await expect(page.getByLabel('Event title')).toBeVisible();
  await expect(page.getByLabel('Marker colour')).toBeVisible();

  const selected = page.locator(
    '[data-testid="calendar-grid"] .dcf-calendar__day--selected'
  );
  await selected.focus();
  await expect(selected).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.locator('[data-testid="calendar-grid"] [role="gridcell"][tabindex="0"]')
  ).toHaveCount(1);

  await audit(page, '.calendar-page', 'calendar');
});
