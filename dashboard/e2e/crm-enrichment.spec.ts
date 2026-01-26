
import { test, expect } from '@playwright/test';

test.describe('CRM Enrichment UI', () => {
    test('should show Auto-Enrich button in customer drawer', async ({ page }) => {
        // 1. Go to Accounts page
        await page.goto('http://localhost:3000/accounts');

        // 2. Wait for data to load
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow).not.toBeEmpty();
        await expect(firstRow).not.toContainText('No customers found', { timeout: 10000 });

        // 3. Click the first row
        await firstRow.click();

        // 4. Wait for Drawer
        await expect(page.locator('text=Stocking Matrix')).toBeVisible({ timeout: 10000 });

        // 5. Switch to "Contacts & Info" tab (named "details" in code)
        await page.getByText('Contacts & Info').click();

        // 6. Check for "Auto-Enrich" button
        const enrichBtn = page.locator('button:has-text("Auto-Enrich")');
        await expect(enrichBtn).toBeVisible();

        // Optional: click it and check loading state
        // await enrichBtn.click();
        // await expect(page.locator('text=Enriching...')).toBeVisible();
    });
});
