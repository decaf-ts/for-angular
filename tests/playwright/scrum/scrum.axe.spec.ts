/**
 * SAA-1050 — axe-core audit of the `/scrum` demo at every host-controlled
 * state and the mobile viewport.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import { ARTIFACTS, openScrum } from './helpers';

test.setTimeout(120_000);

const axeVersion = (
  JSON.parse(fs.readFileSync('node_modules/axe-core/package.json', 'utf8')) as {
    version: string;
  }
).version;

const SCOPE = 'main.scrum-page';

async function audit(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).include(SCOPE).analyze();
  fs.writeFileSync(
    `${ARTIFACTS}/axe-${state}.json`,
    JSON.stringify(
      {
        axeVersion,
        scope: SCOPE,
        url: page.url(),
        viewport: page.viewportSize(),
        violations: results.violations,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length,
      },
      null,
      2
    )
  );
  await page.screenshot({ path: `${ARTIFACTS}/axe-${state}.png`, fullPage: true });

  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  }));
  expect(summary, `axe violations in ${state} (axe-core ${axeVersion})`).toEqual([]);
  return results;
}

test.beforeEach(async () => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
});

test('default /scrum has 0 axe violations (all impacts)', async ({ page }) => {
  await openScrum(page);
  const results = await audit(page, 'default');
  console.log(`axe-core ${axeVersion} default: ${results.violations.length} violations`);
});

test('readonly /scrum has 0 axe violations (all impacts)', async ({ page }) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-readonly"]').check();
  const results = await audit(page, 'readonly');
  console.log(`axe-core ${axeVersion} readonly: ${results.violations.length} violations`);
});

test('loading /scrum has 0 axe violations (all impacts)', async ({ page }) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-loading"]').check();
  const results = await audit(page, 'loading');
  console.log(`axe-core ${axeVersion} loading: ${results.violations.length} violations`);
});

test('error /scrum has 0 axe violations (all impacts)', async ({ page }) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-error"]').check();
  const results = await audit(page, 'error');
  console.log(`axe-core ${axeVersion} error: ${results.violations.length} violations`);
});

test('empty-filter /scrum has 0 axe violations (all impacts)', async ({ page }) => {
  await openScrum(page);
  await page.locator('[data-testid="scrum-search"]').fill('zzzz-no-match');
  const results = await audit(page, 'empty-filter');
  console.log(`axe-core ${axeVersion} empty-filter: ${results.violations.length} violations`);
});

test('mobile 375x812 /scrum has 0 axe violations (all impacts)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openScrum(page);
  const results = await audit(page, 'mobile');
  console.log(`axe-core ${axeVersion} mobile: ${results.violations.length} violations`);
});
