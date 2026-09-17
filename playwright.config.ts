import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
/*
 * The Paperclip CI sandbox has no /etc/fonts configuration, so Skia cannot
 * resolve fonts and Chromium crashes with `SkFontMgr_FontConfigInterface: Not
 * implemented`. Only apply the fontconfig workaround in that environment
 * (detected by the sandbox flag or the sandbox's own fontconfig file); all
 * other environments are unaffected.
 */
const needsSandboxFontConfig =
  !!process.env['PAPERCLIP_SANDBOX'] || existsSync('/paperclip/.config/fontconfig/fonts.conf');

export default defineConfig({
  testDir: './tests/playwright',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env?.['CI'],
  /* Retry on CI only */
  retries: process.env?.['CI'] ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env?.['CI']? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: 'on',

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

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run the demo stack before starting the tests (DECAF-50 §4.25 PR-G /
   * G3-31): the frontend dev server (:8110) plus the graph backend (:3000)
   * the app talks to by default (`GRAPH_BACKEND_URL`). Both are managed so the
   * Playwright suite never depends on a manually booted server, and the backend
   * is launched from `for-angular`'s own `node_modules` (G3-30) — never via a
   * `../integrations` path traversal. */
  webServer: [
    {
      command: 'npm run start:backend',
      port: 3000,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run start',
      url: 'http://localhost:8110',
      reuseExistingServer: !process.env['CI'],
      timeout: 240_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
