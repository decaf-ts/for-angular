import { expect, test } from '@playwright/test';
import { testWithVideo } from './utils/video-fixture';

const baseUrl = 'http://localhost:8110/login';

testWithVideo('Simulate Login', async ({ page, browser }) => {
  await page.goto(baseUrl);
  const username = "decaf";
  const password = "Passd123-";

  await page.locator('.native-wrapper').first().click();
  const usernameInput = page.getByRole('textbox', { name: 'Username' });
  await usernameInput.fill(username);

  const usernameValue = await usernameInput.inputValue();
  expect(usernameValue).toBe(username);

  await page.waitForTimeout(500);

  const passwordInput = page.getByRole('textbox', { name: 'Password' });
  await passwordInput.fill(password);
  const passwordValue = await passwordInput.inputValue();

  expect(passwordValue).toBe(password);

  await page.waitForTimeout(500);


  const button = page.getByRole('button', { name: 'login' });
  await button.click();

  await page.waitForTimeout(500);

  await expect(page).toHaveTitle(/Dashboard/i);

  await page.waitForTimeout(1000);

})



