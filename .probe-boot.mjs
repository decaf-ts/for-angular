import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const baseUrl = 'http://localhost:8110/';
const launchEnv = { ...process.env };
if (existsSync('/paperclip/.config/fontconfig/fonts.conf')) {
  launchEnv.FONTCONFIG_FILE = '/paperclip/.config/fontconfig/fonts.conf';
  launchEnv.FONTCONFIG_PATH = '/paperclip/.config/fontconfig';
}

const browser = await chromium.launch({ env: launchEnv });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => consoleMsgs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(baseUrl);
await page.waitForTimeout(3000);

const info = await page.evaluate(() => ({
  appRoot: !!document.querySelector('app-root'),
  title: document.title,
  hasUsername: !!document.querySelector('[id="username"] input') || !!document.querySelector('input[name="username"]'),
  menuLabels: Array.from(document.querySelectorAll('ion-menu ion-label')).map((e) => e.textContent?.trim()),
  bodyHead: document.body.innerHTML.slice(0, 300),
}));
console.log('STATE', JSON.stringify(info, null, 2));
console.log('CONSOLE', JSON.stringify(consoleMsgs.slice(0, 40), null, 2));
await browser.close();
