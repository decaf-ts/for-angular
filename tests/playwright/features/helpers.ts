/**
 * Shared helpers for the SAA-1473 feature-demo page verification.
 * Requires the Playwright `webServer` frontend on :8110.
 */
import { expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';

export const BASE_URL = 'http://localhost:8110';

export const ARTIFACTS = 'test-results/feature-pages-artifacts';

export function ensureArtifacts(): void {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
}

/**
 * Attaches console/page error collectors.
 * @returns the live array that receives the collected errors.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${message.text()} @ ${message.location().url}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

/**
 * MathLive resolves its KaTeX fonts from `/fonts` by default; the demo app does
 * not ship that directory, so the network requests 404 while the field still
 * renders with the fallback faces. Those asset 404s are not page errors and are
 * reported separately from the route behaviour.
 */
export function withoutKnownAssetNoise(errors: string[]): string[] {
  return errors.filter(
    (error) =>
      !/\/fonts\/KaTeX_/.test(error) &&
      !/MathLive .*math fonts could not be loaded/i.test(error)
  );
}

/** Rejects the custom-webpack dev-server error overlay, if it is present. */
async function expectNoDevOverlay(page: Page): Promise<void> {
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
}

/** Navigates to a route and waits for its page-specific ready selector. */
export async function openRoute(
  page: Page,
  path: string,
  ready: string
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      break;
    } catch (error) {
      if (attempt === 2 || !/ERR_ABORTED|ECONNREFUSED|ERR_CONNECTION/.test(String(error))) {
        throw error;
      }
      await page.waitForTimeout(1_000);
    }
  }
  await expect(page.locator(ready).first()).toBeVisible({ timeout: 45_000 });
  await expectNoDevOverlay(page);
}

/** Returns a stable-enough signature of the currently rendered ECharts canvas. */
export async function chartCanvasSignature(page: Page): Promise<string> {
  const canvas = page.locator('[data-testid="charts-chart"] canvas').first();
  await expect(canvas).toBeVisible();
  const dataUrl = await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    return canvasElement.toDataURL();
  });
  return dataUrl;
}
