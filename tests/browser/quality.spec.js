const { test, expect } = require('@playwright/test');

test('both palettes keep navigation usable, styles load, and headers have no overlap', async ({ page }) => {
  const failures = [];
  page.on('response', response => { if (response.url().includes('/assets/') && response.status() >= 400) failures.push(response.url()); });
  await page.addInitScript(() => sessionStorage.setItem('floral-welcome-seen', '1'));
  for (const palette of ['original', 'multicolor']) {
    for (const width of [320, 390, 700, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.evaluate(value => localStorage.setItem('floreria-palette', value), palette);
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const brand = await page.locator('.brand-lockup').boundingBox();
      expect(Math.abs(brand.x + brand.width / 2 - width / 2)).toBeLessThan(2);
      const profile = page.locator('.profile-menu:visible summary');
      await profile.click();
      const dropdown = page.locator('.profile-menu:visible .profile-dropdown');
      await expect(dropdown).toBeVisible();
      const bounds = await dropdown.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/quality-${palette}-${width}.png` });
    }
  }
  expect(failures).toEqual([]);
});

test('SEO is available without JavaScript and public metadata is unique', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const titles = [];
  for (const file of ['index.html', 'catalogo.html', 'colecciones.html', 'contacto.html', 'politicas.html', 'reclamaciones.html']) {
    await page.goto('/' + file);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    titles.push(await page.title());
  }
  expect(new Set(titles).size).toBe(titles.length);
  const catalog = await (await request.get('/api/catalog')).json();
  await page.goto(`/producto.html?id=${catalog.products[0].id}`);
  await expect(page.locator('h1')).toHaveText(catalog.products[0].name);
  await expect(page.locator('.product-seo-fallback')).toBeVisible();
  const missing = await request.get('/producto.html?id=does-not-exist');
  expect(missing.status()).toBe(404);
  await context.close();
});

test('quote mode updates marketing text but preserves legal wording and product descriptions', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('floral-welcome-seen', '1'));
  await page.route('**/api/store-settings', route => route.fulfill({ json: { ok: true, settings: { sales_enabled: false } } }));
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await expect(page.locator('.service-item').filter({ hasText: 'WhatsApp' })).toHaveCount(1);
  await expect(page.locator('.service-item').filter({ hasText: 'Culqi' })).toHaveCount(0);
  const legal = await page.request.get('/politicas.html');
  await page.goto('/politicas.html');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  const original = await page.evaluate(html => {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.querySelector('#pagos').textContent;
  }, await legal.text());
  expect(await page.locator('#pagos').textContent()).toBe(original);
});
