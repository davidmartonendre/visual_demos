import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('should load and have a title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Generative Art/);
  });

  test('should not have any console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });

  test('should display the art components', async ({ page }) => {
    await page.goto('/');
    const buttons = await page.getByRole('button').all();
    expect(buttons).toHaveLength(7);
  });
});
