const { test, expect } = require('@playwright/test');

test('navbar uses the server sales mode before the settings request finishes', async ({ page }) => {
  await page.route('**/api/store-settings', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-store-sales', 'true');
  await expect(page.locator('.nav-right .cart-link')).toBeVisible();
  await expect(page.locator('.nav-right a[href^="https://wa.me"]')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
});

test('visitors can browse without a signup interruption and open registration from their profile', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await expect(page.locator('.welcome-dialog')).toHaveCount(0);
  await page.locator('.profile-menu:visible summary').click();
  await page.locator('.profile-menu:visible').getByRole('link', { name: 'Registrarse', exact: true }).click();
  await expect(page).toHaveURL(/cuenta.html#register/);
  await expect(page.locator('#register-panel')).toBeVisible();
});

for (const width of [390, 820, 1040, 1440]) {
  test(`header centered and profile accessible at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/cuenta.html');
    const profile = page.locator('.profile-menu:visible summary');
    await expect(profile).toBeVisible();
    const brand = await page.locator('.brand-lockup').boundingBox();
    expect(Math.abs(brand.x + brand.width / 2 - width / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await profile.click();
    await expect(page.locator('.profile-menu:visible .profile-dropdown')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.profile-menu:visible .profile-dropdown')).toBeHidden();
    await page.screenshot({ path: `test-results/header-${width}.png` });
  });
}
