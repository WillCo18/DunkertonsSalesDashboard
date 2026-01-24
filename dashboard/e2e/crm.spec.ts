import { test, expect } from '@playwright/test';

test.describe('Soft CRM Features', () => {
    test('Dashboard loads successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Dunkertons Sales Dashboard/);
    });

    // Skipped until UI is built
    test.skip('Customer details modal opens', async ({ page }) => {
        await page.goto('/');
        // TODO: Click a customer row
        // await page.click('tr[data-account-id="..."]');
        // await expect(page.locator('#customer-modal')).toBeVisible();
    });
});
