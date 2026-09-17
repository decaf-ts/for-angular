/**
 * @module tests/playwright/graph/graph-boot-no-env.spec
 * @summary P0 regression — the graph route boots with no `window.ENV` bootstrap.
 * @description Reproduces the board's live-runtime crash (SAA-1467, parent
 * SAA-1364): `npm run start:dev` serves the app without any `window.ENV`
 * bootstrap, and opening the lazy graph route must not throw
 * `TypeError: can't access property "host", ... is undefined` at
 * `loadComponent` time. The graph surface must render on the plain dev target.
 *
 * This spec must FAIL on the unfixed code (the lazy graph chunk aborts on the
 * `environment.ts` module-eval `env.api.host` access) and PASS once
 * `graph.page.ts` stops importing `src/environments/environment`.
 *
 * RUN REQUIREMENTS: `npm run start` (the exact UI command `start:dev` runs, dev
 * server on :8110) with NO `window.ENV` bootstrap; graph backend on :3000.
 */
import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { GRAPH_URL } from './helpers';

/** The boot-crash signature the board reported at route `loadComponent` time. */
const BOOT_CRASH = /TypeError|can't access property|api is undefined/i;

interface BootErrors {
  pageErrors: string[];
  consoleErrors: string[];
}

/** Captures uncaught page errors and console errors before navigation. */
function watchBootErrors(page: Page): BootErrors {
  const captured: BootErrors = { pageErrors: [], consoleErrors: [] };
  page.on('pageerror', (error) => captured.pageErrors.push(`${error.name}: ${error.message}`));
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') captured.consoleErrors.push(message.text());
  });
  return captured;
}

test.describe('Graph route boot without window.ENV (P0 regression)', () => {
  test.setTimeout(180_000);

  test('graph route loads and renders with no window.ENV bootstrap', async ({ page }) => {
    const bootErrors = watchBootErrors(page);

    await page.goto(GRAPH_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    // The lazy graph route must render its surface; the boot crash leaves the
    // route unrendered because the dynamic import rejects.
    await expect(page.locator('.graph-renderer')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('ng-diagram')).toBeVisible({ timeout: 30_000 });

    const uncaught = bootErrors.pageErrors.filter((error) => BOOT_CRASH.test(error));
    expect(
      uncaught,
      `uncaught boot errors on the graph route:\n${uncaught.join('\n')}`,
    ).toEqual([]);

    const consoleErrors = bootErrors.consoleErrors.filter((error) => BOOT_CRASH.test(error));
    expect(
      consoleErrors,
      `console boot errors on the graph route:\n${consoleErrors.join('\n')}`,
    ).toEqual([]);
  });
});
