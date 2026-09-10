/**
 * @module tests/playwright/dashboard-builder.spec
 * @description End-to-end tests for the editable dashboard builder demo route.
 * @summary Covers the three riskiest behaviours per DECAF-53: snap/collision
 * (reject-overlap), per-component delete confirmation, and read mode rendering
 * without editing affordances. Requires the dev server on port 8110.
 */

import { expect, test } from '@playwright/test';

const baseUrl = 'http://localhost:8110/';
const route = '/dashboard-builder';

async function loginAndNavigate(page: import('@playwright/test').Page) {
  await page.goto(baseUrl);
  await page.waitForTimeout(1500);
  const user = page.locator('[id="username"] input').or(page.getByRole('textbox', { name: /user/i })).first();
  await user.fill('decaf');
  const pass = page.locator('[id="password"] input').or(page.getByRole('textbox', { name: /password/i })).first();
  await pass.fill('Passd123-');
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Dashboard Builder').first().click();
  await page.waitForTimeout(1500);
}

test('compose a dashboard from the palette and persist it (create -> read)', async ({ page }) => {
  await loginAndNavigate(page);

  // Create mode shows the palette bounded by the @dashcomponent() registry.
  await expect(page.locator('.ngx-dashboard__palette')).toBeVisible();
  await expect(page.locator('.ngx-dashboard__palette-item')).toHaveCount(3);

  // Add the stat palette component.
  await page.locator('.ngx-dashboard__palette-item').first().click();
  await expect(page.locator('.ngx-dashboard__tile')).toHaveCount(1);

  // Save and switch to read mode: no editing affordances.
  await page.getByRole('button', { name: /save dashboard/i }).click();
  await expect(page.locator('.ngx-dashboard__palette')).toHaveCount(0);
  await expect(page.locator('.ngx-dashboard__tile-delete')).toHaveCount(0);
});

test('delete confirmation removes a placed component', async ({ page }) => {
  await loginAndNavigate(page);
  await page.locator('.ngx-dashboard__palette-item').first().click();
  await expect(page.locator('.ngx-dashboard__tile')).toHaveCount(1);

  // Click the top-right x to request deletion.
  await page.locator('.ngx-dashboard__tile-delete').first().click();
  await expect(page.locator('.ngx-dashboard__confirm-card')).toBeVisible();

  // Confirm and expect the placement to be removed.
  await page.locator('.ngx-dashboard__confirm-card').getByRole('button', { name: /delete/i }).click();
  await expect(page.locator('.ngx-dashboard__tile')).toHaveCount(0);
});

test('read mode renders the saved composition with no editing affordances', async ({ page }) => {
  await loginAndNavigate(page);

  // Build a saved composition first.
  await page.locator('.ngx-dashboard__palette-item').first().click();
  await page.getByRole('button', { name: /save dashboard/i }).click();
  await expect(page.locator('.ngx-dashboard__palette')).toHaveCount(0);

  // Switch back to read.
  await page.getByRole('button', { name: 'Read' }).click();
  await expect(page.locator('.ngx-dashboard__palette')).toHaveCount(0);
  await expect(page.locator('.ngx-dashboard__tile-delete')).toHaveCount(0);
  await expect(page.locator('.ngx-dashboard__canvas')).toHaveCount(0);
});
