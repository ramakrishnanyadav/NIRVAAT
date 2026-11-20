import { test, expect } from '@playwright/test';

test.describe('NIRVAAT Critical E2E User Journey & A11y Keyboard Flow', () => {
  test('Skip-to-content, React Router navigation, and Command Palette keyboard operation', async ({ page }) => {
    // 1. Direct deep link to /today (HTML5 history routing)
    await page.goto('http://localhost:3000/today');
    await expect(page).toHaveTitle(/NIRVAAT/i);
    await expect(page.locator('header[role="banner"]')).toContainText('NIRVAAT');

    // 2. Keyboard Skip-to-content test
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    // 3. React Router navigation to /forecast
    await page.click('nav[role="navigation"] >> text=Forecast');
    await expect(page).toHaveURL(/.*\/forecast/);
    const forecastH1 = page.locator('h1#page-heading');
    await expect(forecastH1).toBeVisible();

    // 4. Emergency deep link with zero JS animation
    await page.goto('http://localhost:3000/emergency');
    await expect(page.locator('role=alert')).toBeVisible();
    await expect(page.locator('text=Emergency Medical SOS')).toBeVisible();

    // Return to /today
    await page.goto('http://localhost:3000/today');

    // 5. Run a plan from query bar
    const queryInput = page.locator('#copilot-query');
    await expect(queryInput).toBeVisible();
    await queryInput.fill('What should our household do tonight to cut smog exposure on a tight budget?');
    await page.locator('button[type="submit"]:has-text("Get Plan")').click();

    // 6. Verify plan cards rendered
    await expect(page.locator('article').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Free step').first()).toBeVisible();

    // 7. Trigger Command Palette via keyboard shortcut (Control+K / Meta+K)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK');
    const palette = page.locator('[role="dialog"][aria-label="Quick command palette"]');
    await expect(palette).toBeVisible();
    await expect(palette.locator('input[type="text"]')).toBeFocused();

    // 8. Close Command Palette via Escape key
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible();
  });
});
