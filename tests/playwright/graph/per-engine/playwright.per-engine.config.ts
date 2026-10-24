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

/**
 * The app hardcodes its graph backend origin to `http://localhost:3000`
 * (`GRAPH_BACKEND_URL`'s development default) and the production build exposes
 * no bootstrap hook to override it. When the harness runs the backend on a
 * dedicated port, map the browser's `localhost` hostname to that port so the
 * real app still reaches the real backend instead of being route-mocked. The
 * frontend must be addressed as `127.0.0.1` in that mode, or this rule would
 * also redirect the app itself. The default `:3000` lane keeps its old
 * behaviour (no rule), so existing invocations are unaffected.
 */
const backendUrl = process.env['GRAPH_BACKEND_URL'];
const backendPort = backendUrl ? new URL(backendUrl).port : '';
const backendHostRule =
  backendPort && backendPort !== '3000'
    ? `--host-resolver-rules=MAP localhost 127.0.0.1:${backendPort}`
    : undefined;

export default defineConfig({
  testDir: __dirname,
  testMatch: /fixtures-ui\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  // Steps 2 and 3 walk all 12 fixtures (one canvas open + one run each), so the
  // 30s Playwright default aborts them mid-iteration and the worker restart then
  // drops the already-recorded rows. Give the whole step room to finish: twelve
  // worst-case 120s terminal waits plus canvas opens must fit inside the step.
  timeout: 1_800_000,
  // Without an action timeout a click whose target is covered by an overlay
  // (for example a side panel over the Run button) retries forever and burns
  // the whole step on the first fixture. Bound every action so the failure is
  // reported against that fixture and the remaining rows still run.
  reporter: process.env['CI'] ? [['list']] : [['list']],
  outputDir: `./.results/${engine}`,
  use: {
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    video: 'off',
    launchOptions: {
      ...(backendHostRule ? { args: [backendHostRule] } : {}),
      ...(needsSandboxFontConfig
        ? {
            env: {
              ...process.env,
              FONTCONFIG_FILE: '/paperclip/.config/fontconfig/fonts.conf',
              FONTCONFIG_PATH: '/paperclip/.config/fontconfig',
            },
          }
        : {}),
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
