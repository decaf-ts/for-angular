import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const baseUrl = 'http://localhost:8110/';

const launchEnv = { ...process.env };
if (existsSync('/paperclip/.config/fontconfig/fonts.conf')) {
  launchEnv.FONTCONFIG_FILE = '/paperclip/.config/fontconfig/fonts.conf';
  launchEnv.FONTCONFIG_PATH = '/paperclip/.config/fontconfig';
}

const mode = process.argv[2] ?? 'report';

const browser = await chromium.launch({ env: launchEnv });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

if (mode === 'report') {
  await page.addInitScript(() => {
    globalThis.DECAF__I18N__ENABLED = 'false';
  });
}

await page.goto(baseUrl);
await page.waitForTimeout(1500);

const user = page.locator('[id="username"] input').or(page.getByRole('textbox', { name: /user/i })).first();
await user.fill('decaf');
const pass = page.locator('[id="password"] input').or(page.getByRole('textbox', { name: /password/i })).first();
await pass.fill('Passd123-');
await page.getByRole('button', { name: /login/i }).click();
await page.waitForTimeout(2500);

await page.getByText('Dashboard Builder').first().click();
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const txt = (sel) => Array.from(document.querySelectorAll(sel)).map((e) => e.textContent?.trim()).filter(Boolean);
  return {
    url: location.href,
    wrapperCount: document.querySelectorAll('.dcf-translation-key').length,
    wrappers: txt('.dcf-translation-key').slice(0, 30),
    sectionTitles: txt('.ngx-dashboard__section-title'),
    paletteItems: txt('.ngx-dashboard__palette-item'),
    toolbarButtons: txt('.dashboard-builder__toolbar ion-button'),
    menuItems: txt('ion-menu ion-label'),
    documentTitle: document.title,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
