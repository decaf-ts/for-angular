import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * SAA-1045 — functional/a11y verification of the `/gantt` stories.
 * Serves the static Storybook build so verification never depends on the
 * demo application or graph backend.
 */
export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: process.env['GANTT_PW_OUT'] || '/tmp/saa1045-gantt-playwright',
  use: {
    baseURL: 'http://127.0.0.1:6007',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `python3 -m http.server 6007 --bind 127.0.0.1 --directory "${resolve(
      __dirname,
      '..',
      '..',
      'dist',
      'storybook',
      'for-angular'
    )}"`,
    url: 'http://127.0.0.1:6007/iframe.html',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
