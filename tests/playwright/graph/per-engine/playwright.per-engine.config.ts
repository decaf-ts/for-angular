import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated Playwright config for the SAA-729 per-engine UI validation lane.
 *
 * The default `playwright.config.ts` cannot express "boot a different as-graph
 * engine per run": its `webServer` starts the local backend unconditionally.
 * Here the runner (`run-per-engine-ui.sh`) owns the services — it boots the
 * seeded as-graph host for `GRAPH_BACKEND_ENGINE` on :3000 and the for-angular
 * dev server on :8110 — so this config declares no `webServer` and points at
 * only the per-engine spec.
 */
const needsSandboxFontConfig =
  !!process.env['PAPERCLIP_SANDBOX'] || existsSync('/paperclip/.config/fontconfig/fonts.conf');

const engine = process.env['GRAPH_BACKEND_ENGINE'] ?? 'local';

export default defineConfig({
  testDir: __dirname,
  testMatch: /fixtures-ui\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  // Steps 2 and 3 walk all 12 fixtures (one canvas open + one run each), so the
  // 30s Playwright default aborts them mid-iteration and the worker restart then
  // drops the already-recorded rows. Give the whole step room to finish.
  timeout: 1_200_000,
  reporter: process.env['CI'] ? [['list']] : [['list']],
  outputDir: `./.results/${engine}`,
  use: {
    trace: 'retain-on-failure',
    video: 'off',
    ...(needsSandboxFontConfig
      ? {
          launchOptions: {
            env: {
              ...process.env,
              FONTCONFIG_FILE: '/paperclip/.config/fontconfig/fonts.conf',
              FONTCONFIG_PATH: '/paperclip/.config/fontconfig',
            },
          },
        }
      : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
