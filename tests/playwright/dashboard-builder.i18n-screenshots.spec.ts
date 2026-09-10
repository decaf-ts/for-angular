/**
 * @module tests/playwright/dashboard-builder.i18n-screenshots.spec
 * @description Mandatory decaf-ts UI i18n screenshot test for the lazy-loaded
 * `dashboard-builder` route (DECAF-53 AC-13). Produces the numbered
 * localization screenshots (report mode) and the plain user-guide screenshots
 * (normal mode) that Technical Documentation Specialist consumes, plus a
 * stable `mapping.json`.
 *
 * Structural logic (mode detection, scenario iteration, overlay injection,
 * mapping output and the afterAll completeness check) is reused from the
 * `decaf-ts-tests-ui-i18n-screenshots` template. Only the SCENARIOS list and
 * the app-specific setup helpers are project-specific.
 *
 * Run:
 *  - normal:  `UI_REPORT_MODE=false npx playwright test tests/playwright/dashboard-builder.i18n-screenshots.spec.ts`
 *  - report:  `UI_REPORT_MODE=true DECAF__I18N__ENABLED=false npx playwright test tests/playwright/dashboard-builder.i18n-screenshots.spec.ts`
 */

import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const isReportMode = process.env['UI_REPORT_MODE'] === 'true';

// The app under test reads DECAF__I18N__ENABLED from globalThis at bootstrap
// (see src/app/app.config.ts). In report mode the app MUST have booted with
// i18n disabled so DecafTranslatePipe renders the raw key. The test-runner env
// var is a guard; the browser flag is set by addInitScript below.
if (isReportMode && process.env['DECAF__I18N__ENABLED'] !== 'false') {
  throw new Error(
    'UI_REPORT_MODE=true requires the app to have booted with i18n disabled ' +
      '(DECAF__I18N__ENABLED=false) -- set it on the npm script that runs this test.',
  );
}

// The visible-key rendering for these keys is produced by DecafTranslatePipe
// (name `translate`), which returns the raw key whenever I18nLoader.enabled is
// false. The overlay enumerates rendered elements whose text equals a mandated
// key, in document order, and numbers them.
const MANDATED_KEYS = new Set([
  'component.dashboard.palette',
  'component.dashboard.emptyPalette',
  'component.dashboard.deleteTitle',
  'component.dashboard.deleteConfirm',
  'component.dashboard.cancel',
  'component.dashboard.delete',
  'component.dashboard.save',
  'dashboard-builder.title',
  'dashboard-builder.create',
  'dashboard-builder.read',
  'dashboard-builder.update',
  'dashboard-builder.delete',
  'dashboard.demo.stats',
  'dashboard.demo.list',
  'dashboard.demo.note',
  'menu.dashboard-builder',
]);

const OUTPUT_ROOT = path.resolve(__dirname, '..', '..', 'docs-output', 'screenshots');

const APP_URL = 'http://localhost:8110/';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

interface PageScenario {
  /** Stable id -- used in screenshot filenames and the mapping file. */
  id: string;
  /** Human-readable description, goes verbatim into the mapping file. */
  description: string;
  /** Reaches the exact state this scenario screenshots. */
  setup: (page: Page) => Promise<void>;
}

async function login(page: Page): Promise<void> {
  await page.goto(APP_URL);
  await page.waitForTimeout(1500);
  const user = page
    .locator('[id="username"] input')
    .or(page.getByRole('textbox', { name: /user/i }))
    .first();
  await user.fill('decaf');
  const pass = page
    .locator('[id="password"] input')
    .or(page.getByRole('textbox', { name: /password/i }))
    .first();
  await pass.fill('Passd123-');
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForTimeout(2500);
}

// The custom-webpack dev-server does no SPA fallback for direct route hits, so
// we always navigate from "/" and reach dashboard-builder via the app menu.
// The ion-menu item carries class `dcf-menu-dashboard-builder`; clicking it via
// evaluate works whether or not the drawer is open (desktop split-pane vs.
// mobile overlay).
async function navigateToDashboardBuilder(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.querySelector('.dcf-menu-dashboard-builder');
    if (!el) throw new Error('dashboard-builder menu item not found');
    (el as HTMLElement).click();
  });
  await page.waitForTimeout(2500);
  // The mobile drawer stays open after a programmatic item click; close it so
  // it no longer overlays the page content.
  await page.evaluate(async () => {
    const menu = document.querySelector('ion-menu') as (HTMLElement & {
      close?: () => Promise<void>;
    }) | null;
    if (menu?.close) await menu.close();
  });
  await page.waitForTimeout(500);
  await expect(page.locator('.ngx-dashboard__palette').first()).toBeVisible();
}

const SCENARIOS: PageScenario[] = [
  {
    id: 'dashboard-builder-create-empty',
    description: 'Dashboard Builder -- create mode, empty palette populated',
    setup: async (page) => {
      await login(page);
      await navigateToDashboardBuilder(page);
      // Landing state of the route is create mode with an empty canvas.
      await expect(page.locator('.ngx-dashboard__palette-item')).toHaveCount(3);
    },
  },
  {
    id: 'dashboard-builder-create-placed',
    description: 'Dashboard Builder -- create mode with a placed component',
    setup: async (page) => {
      await login(page);
      await navigateToDashboardBuilder(page);
      await page.locator('.ngx-dashboard__palette-item').first().click();
      await expect(page.locator('.ngx-dashboard__tile')).toHaveCount(1);
    },
  },
  {
    id: 'dashboard-builder-delete-confirm',
    description: 'Dashboard Builder -- per-component delete confirmation overlay',
    setup: async (page) => {
      await login(page);
      await navigateToDashboardBuilder(page);
      await page.locator('.ngx-dashboard__palette-item').first().click();
      await page.locator('.ngx-dashboard__tile-delete').first().click();
      await expect(page.locator('.ngx-dashboard__confirm-card')).toBeVisible();
    },
  },
  {
    id: 'dashboard-builder-read',
    description: 'Dashboard Builder -- read mode with no editing affordances',
    setup: async (page) => {
      await login(page);
      await navigateToDashboardBuilder(page);
      await page.locator('.ngx-dashboard__palette-item').first().click();
      // Save the composition; the dashboard switches to read mode.
      await page.locator('.ngx-dashboard__actions ion-button').click();
      await expect(page.locator('.ngx-dashboard__palette')).toHaveCount(0);
      await page.getByRole('button', { name: /read/i }).click();
      await expect(page.locator('.ngx-dashboard__canvas')).toHaveCount(0);
    },
  },
];

interface ScreenshotRecord {
  id: string;
  description: string;
  mode: 'normal' | 'report';
  viewport: string;
  file: string;
  numbering?: Array<{ number: number; key: string }>;
}

// Finds every rendered element (in document order) whose trimmed text is one of
// the mandated translation keys, keeps only the innermost match per key, and
// annotates it with a sequential number badge + outline. Returns the
// number-to-key pairs so mapping.json does not re-derive numbering.
async function applyReportOverlay(
  page: Page,
): Promise<Array<{ number: number; key: string }>> {
  return page.evaluate((keys) => {
    const keySet = new Set(keys as string[]);
    const all = Array.from(document.querySelectorAll('*'));
    const matches = all.filter((el) => {
      const text = (el.textContent ?? '').trim();
      if (!text || !keySet.has(text)) return false;
      const rect = el.getBoundingClientRect();
      // Ignore elements that are laid out horizontally off-screen (e.g. the
      // closed mobile drawer) so numbering matches what the screenshot shows.
      return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth;
    });
    // Keep only the innermost element for each key (no descendant also matches),
    // so a wrapping container is not double-counted for the same key.
    const innermost = matches.filter(
      (el) => !matches.some((other) => other !== el && el.contains(other)),
    );

    for (let index = 0; index < innermost.length; index += 1) {
      const el = innermost[index];
      const number = index + 1;
      const key = (el.textContent ?? '').trim();
      const rect = el.getBoundingClientRect();

      const badge = document.createElement('div');
      badge.textContent = String(number);
      badge.setAttribute('data-ui-report-badge', 'true');
      badge.style.position = 'absolute';
      badge.style.left = `${rect.left + window.scrollX}px`;
      badge.style.top = `${rect.top + window.scrollY - 14}px`;
      badge.style.background = '#ff0055';
      badge.style.color = '#fff';
      badge.style.font = '12px/1.2 monospace';
      badge.style.padding = '1px 5px';
      badge.style.zIndex = '999999';
      document.body.appendChild(badge);

      const outline = document.createElement('div');
      outline.setAttribute('data-ui-report-outline', 'true');
      outline.style.position = 'absolute';
      outline.style.left = `${rect.left + window.scrollX}px`;
      outline.style.top = `${rect.top + window.scrollY}px`;
      outline.style.width = `${rect.width}px`;
      outline.style.height = `${rect.height}px`;
      outline.style.border = '1px solid #ff0055';
      outline.style.pointerEvents = 'none';
      outline.style.zIndex = '999998';
      document.body.appendChild(outline);

      void key;
    }

    return innermost.map((el, index) => ({
      number: index + 1,
      key: (el.textContent ?? '').trim(),
    }));
  }, Array.from(MANDATED_KEYS));
}

test.describe('UI i18n screenshots -- dashboard-builder', () => {
  // Run serially in a single worker so the shared `records` array is fully
  // populated before the afterAll completeness check and mapping output.
  test.describe.configure({ mode: 'serial' });

  const records: ScreenshotRecord[] = [];

  test.beforeEach(async ({ page }) => {
    if (isReportMode) {
      // Must run before the Angular app module evaluates so
      // src/app/app.config.ts reads the flag from globalThis.
      await page.addInitScript(() => {
        (globalThis as Record<string, unknown>)['DECAF__I18N__ENABLED'] = 'false';
      });
    }
  });

  for (const scenario of SCENARIOS) {
    for (const viewport of VIEWPORTS) {
      test(`${scenario.id} [${viewport.name}] -- ${scenario.description}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await scenario.setup(page);

        let numbering: Array<{ number: number; key: string }> | undefined;
        if (isReportMode) {
          numbering = await applyReportOverlay(page);
        }

        const mode = isReportMode ? 'report' : 'normal';
        const outDir = path.join(OUTPUT_ROOT, mode);
        mkdirSync(outDir, { recursive: true });
        const file = path.join(outDir, `${scenario.id}-${viewport.name}.png`);
        await page.screenshot({ path: file, fullPage: true });

        records.push({
          id: scenario.id,
          description: scenario.description,
          mode,
          viewport: viewport.name,
          file: path.relative(OUTPUT_ROOT, file),
          numbering,
        });
      });
    }
  }

  test.afterAll(async () => {
    const byMode = records.filter((r) => r.mode === (isReportMode ? 'report' : 'normal'));
    const expected = SCENARIOS.length * VIEWPORTS.length;
    if (byMode.length !== expected) {
      throw new Error(
        `UI i18n screenshot test expected ${expected} records for mode ${isReportMode ? 'report' : 'normal'} but produced ${byMode.length}`,
      );
    }

    const missing = SCENARIOS.flatMap((s) =>
      VIEWPORTS.filter(
        (v) => !byMode.some((r) => r.id === s.id && r.viewport === v.name),
      ).map((v) => `${s.id}[${v.name}]`),
    );
    if (missing.length > 0) {
      throw new Error(
        `UI i18n screenshot test did not cover: ${missing.join(', ')}`,
      );
    }

    const mode = isReportMode ? 'report' : 'normal';
    const mappingPath = path.join(OUTPUT_ROOT, mode, 'mapping.json');
    writeFileSync(mappingPath, JSON.stringify(byMode, null, 2));
  });
});
