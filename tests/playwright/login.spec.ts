import { expect } from '@playwright/test';
import { testWithVideo } from './utils/video-fixture';

const baseUrl = 'http://localhost:8110/login';

testWithVideo('Simulate Login', async ({ page, browser }) => {
  await page.goto(baseUrl);
  const username = "decaf";
  const password = "Passd123-";
  const usernameInput = page.locator('input[name=username]');
  await usernameInput.fill(username);
  const usernameValue = await usernameInput.inputValue();

  expect(usernameValue).toBe(username);

  const passwordInput = page.locator('input[name=password]');
  await passwordInput.fill(password);
  const passwordValue = await passwordInput.inputValue();

  expect(passwordValue).toBe(password);

  const button = page.getByRole('button', { name: 'login' });
  await button.click();

  await page.waitForTimeout(400);

  await expect(page).toHaveTitle(/Dashboard/i);
})



