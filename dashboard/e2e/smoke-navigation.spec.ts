import { test, expect } from '@playwright/test';

test('Smoke: Dashboard Navigation & Customer Click-through', async ({ page }) => {
    // 1. Load Dashboard
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Dunkerton/);

    // Wait for data loading (skeleton to disappear)
    await page.waitForSelector('h2:has-text("Performance Overview")');
    await page.waitForTimeout(3000); // Allow SWR fetch

    // 2. Test "Top Customers" Click
    // Click the first customer row in the main table
    // Assuming TopCustomersTable renders rows with class 'cursor-pointer'
    const firstCustomerRow = page.locator('table tbody tr').first();
    await firstCustomerRow.click();

    // Verify Drawer Opens
    const drawer = page.locator('.fixed.inset-y-0.right-0');
    await expect(drawer).toBeVisible();

    // Verify Matrix Tab exists in Drawer
    const matrixTab = page.locator('button:has-text("Stocking Matrix")');
    await expect(matrixTab).toBeVisible();

    // Close Drawer
    await page.locator('button:has-text("Close"), button > svg.lucide-x').first().click();
    await expect(drawer).not.toBeVisible();

    // 3. Test "New Customers" Widget Click
    // Find the NewCustomersList widget
    const newCustomerWidget = page.locator('#new-customers-section');
    await expect(newCustomerWidget).toBeVisible();

    // Click a customer in that list
    // The list items have 'cursor-pointer' class
    // We need to ensure there IS data first. If "No new customers", we skip.
    const noData = await newCustomerWidget.getByText('No new customers').isVisible();

    if (!noData) {
        const firstNewCust = newCustomerWidget.locator('.cursor-pointer').first();
        if (await firstNewCust.count() > 0) {
            await firstNewCust.click();
            await expect(drawer).toBeVisible();
            // Close again
            await page.keyboard.press('Escape'); // Test Esc to close
            await expect(drawer).not.toBeVisible();
        }
    }

    console.log('Smoke Test Passed: Navigation & Drawer interactions verified.');
});
