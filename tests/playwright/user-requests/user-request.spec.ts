import { Page, expect, test } from '@playwright/test';

const USER_REQUEST_URL = 'http://localhost:8110/user-request';

/**
 * Navigates to the demo page and opens the user-data request modal.
 */
async function openUserRequest(page: Page): Promise<void> {
  await page.goto(USER_REQUEST_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('[data-testid="request-user-data"]').click();
  await page.waitForSelector('ion-modal', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test('positive return: the request resolves with the normalized user data and the modal closes', async ({ page }) => {
  await openUserRequest(page);

  await page.locator('[id="name"] input').fill('  Ada Lovelace  ');
  await page.locator('ion-modal ion-button').filter({ hasText: 'Next' }).click();
  await page.locator('[id="email"] input').fill('ADA@EXAMPLE.COM');
  await page.locator('ion-modal ion-button').filter({ hasText: 'Submit' }).click();

  const result = page.locator('[data-testid="user-request-result"]');
  await expect(result).toContainText('Ada Lovelace');
  await expect(result).toContainText('ada@example.com');
  await expect(page.locator('ion-modal')).toHaveCount(0);
});

test('cancellation: the request rejects with CancelledError and the modal closes', async ({ page }) => {
  await openUserRequest(page);

  await page.locator('ion-modal ion-button.dcf-button-close').click();

  const error = page.locator('[data-testid="user-request-error"]');
  await expect(error).toContainText('CancelledError');
  await expect(page.locator('ion-modal')).toHaveCount(0);
});

test('erroring out: the request rejects with a decaf error and the modal closes', async ({ page }) => {
  await openUserRequest(page);

  await page.locator('[id="name"] input').fill('Ada Lovelace');
  await page.locator('ion-modal ion-button').filter({ hasText: 'Next' }).click();
  // Submit step 2 without an email to force the validation error path.
  await page.locator('ion-modal ion-button').filter({ hasText: 'Submit' }).click();

  const error = page.locator('[data-testid="user-request-error"]');
  await expect(error).toContainText('ValidationError');
  await expect(page.locator('ion-modal')).toHaveCount(0);
});
