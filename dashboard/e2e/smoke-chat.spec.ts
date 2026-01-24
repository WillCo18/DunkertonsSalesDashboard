import { test, expect } from '@playwright/test';

test('Smoke: Agent D Chat Widget', async ({ page }) => {
    // Capture console
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    await page.goto('http://localhost:3000');
    await page.waitForTimeout(3000); // Wait for hydration

    // 1. Verify Floating Button exists
    // Try finding by role button
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    console.log('Found buttons:', count);

    // Specific selector for the floating button
    const widgetButton = page.locator('.fixed.bottom-6.right-6 button');
    if (await widgetButton.isVisible()) {
        console.log('Widget button IS visible');
        await widgetButton.click();
    } else {
        console.log('Widget button NOT visible. Dumping HTML...');
        // console.log(await page.content());
        throw new Error('Widget button not found');
    }

    // 3. Verify Window Opens
    await page.waitForTimeout(1000); // Wait for animation
    const chatWindow = page.locator('h3:has-text("Agent D")');
    await expect(chatWindow).toBeVisible();

    // 4. Send a message
    const input = page.getByPlaceholder('Ask intelligence...');
    await expect(input).toBeVisible();
    await input.fill('Hello Agent D');
    await page.keyboard.press('Enter');

    // 5. Verify Mic Button exists
    await expect(page.locator('button:has(svg.lucide-mic)')).toBeVisible();

    // 6. Verify user message appears in list
    await expect(page.locator('div').filter({ hasText: 'Hello Agent D' }).first()).toBeVisible();
});
