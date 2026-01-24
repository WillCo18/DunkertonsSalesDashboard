import { test, expect } from '@playwright/test';

test('stocking matrix debug - Bath Road Beers', async ({ page }) => {
    // Capture console logs from the browser
    page.on('console', msg => {
        if (msg.text().includes('STOCKING MATRIX') || msg.text().includes('DRAWER DEBUG')) {
            console.log(`BROWSER LOG: ${msg.text()}`);
        }
    });

    // Go to accounts page
    await page.goto('http://localhost:3000/accounts');

    // Wait for load
    await page.waitForTimeout(3000);

    // Search for the specific customer
    await page.waitForSelector('input[type="text"]', { state: 'visible' });
    await page.fill('input[type="text"]', 'BATH ROAD BEERS');

    // Wait for filter
    await page.waitForTimeout(2000);

    // Screenshot results to confirm
    await page.screenshot({ path: 'search-results-correct.png' });

    // Click the first row results
    await page.click('table tbody tr:first-child');

    // Wait for drawer
    await page.waitForTimeout(1000);

    // Switch to Stocking Matrix tab (using specific click)
    await page.click('button:has-text("Stocking Matrix")');
    await page.waitForTimeout(2000);

    // Capture HTML
    const matrixTable = page.locator('.fixed.inset-y-0 table');
    const matrixHtml = await matrixTable.innerHTML();
    console.log('Matrix HTML Snapshot:', matrixHtml);

    // Take screenshot
    await page.screenshot({ path: 'matrix-bath-complete.png' });

    // Check active cells
    const activeCells = await page.evaluate(() => {
        const drawer = document.querySelector('.fixed.inset-y-0');
        if (!drawer) return [];

        // Look for cells that have a background color (success/warning/danger)
        const cells = drawer.querySelectorAll('td div[class*="bg-"]');
        return Array.from(cells).map(c => ({
            class: c.className,
            title: c.getAttribute('title')
        })).filter(c => !c.class.includes('bg-surface-elevated/30')); // Filter out empty ones
    });

    console.log('Found Active Cells:', activeCells);

    // Assert we found something
    expect(activeCells.length).toBeGreaterThan(0);
});
