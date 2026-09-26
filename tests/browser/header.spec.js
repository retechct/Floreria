const { test, expect } = require('@playwright/test');

test('welcome consent, visit persistence and profile registration', async ({ page }) => {
  await page.goto('/');
  const welcome = page.locator('.welcome-dialog');
  await expect(welcome).toBeVisible();
  await page.screenshot({ path: "test-results/welcome.png" });
  await welcome.locator('button[value="register"]').click();
  await expect(welcome).toBeVisible();
  await welcome.locator('[name="privacy"]').check();
  await welcome.locator('button[value="register"]').click();
  await expect(page).toHaveURL(/cuenta.html#register/);
  await expect(page.locator('#register-panel')).toBeVisible();
  await page.goto('/');
  await expect(welcome).toHaveCount(0);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(welcome).toBeVisible();
  await page.locator('.welcome-guest').click();
  await expect(welcome).toHaveCount(0);
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
