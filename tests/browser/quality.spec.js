const { test, expect } = require('@playwright/test');

test('small icon bundle renders controls and static assets revalidate', async ({ page, request }) => {
  const icons = await request.get('/assets/vendor/lucide.min.js');
  expect(icons.ok()).toBe(true);
  expect((await icons.body()).length).toBeLessThan(20000);
  expect(icons.headers()['cache-control']).toContain('max-age=300');
  const unchanged = await request.get('/assets/vendor/lucide.min.js', { headers: { 'If-None-Match': icons.headers().etag } });
  expect(unchanged.status()).toBe(304);
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await expect(page.locator('i[data-lucide]')).toHaveCount(0);
  await expect(page.locator('.mobile-tabbar svg.lucide')).not.toHaveCount(0);
});

test('collection arrows replace the scrollbar and reach hidden filters', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/colecciones.html');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  const rail = page.locator('#collection-filters');
  await expect(page.locator('#collection-carousel')).toHaveAttribute('data-scrollable', 'true');
  expect(await rail.evaluate(node => getComputedStyle(node).scrollbarWidth)).toBe('none');
  await page.getByRole('button', { name: 'Ver más colecciones' }).click();
  await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Ver colecciones anteriores' })).toBeEnabled();
});

test('brand palette keeps navigation usable, styles load, and headers have no overlap', async ({ page }) => {
  const failures = [];
  page.on('response', response => { if (response.url().includes('/assets/') && response.status() >= 400) failures.push(response.url()); });
  await page.addInitScript(() => sessionStorage.setItem('floral-welcome-seen', '1'));
  for (const width of [320, 390, 700, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
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
    if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/quality-brand-${width}.png` });
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
  await page.goto('/colecciones.html');
  await expect(page.locator('#collections-page .collection-block')).not.toHaveCount(0);
  await expect(page.locator('#collections-page a[href*="coleccion="]').first()).toBeVisible();
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

test('premium navigation works by keyboard and closes when dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  const menu = page.locator('.nav-left details.menu');
  const trigger = menu.locator('summary');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator('h1').click();
  await expect(menu).not.toHaveAttribute('open', '');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('premium product presentation stays usable on mobile and desktop', async ({ page, request }) => {
  const catalog = await (await request.get('/api/catalog')).json();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
    const cards = await page.locator('.hero-showcase .hero-card').evaluateAll(nodes => nodes.map(node => {
      const r = node.getBoundingClientRect();
      return { x: r.x, right: r.right, y: r.y, bottom: r.bottom };
    }));
    expect(cards.length).toBeGreaterThan(1);
    expect(cards[0].right <= cards[1].x || cards[1].right <= cards[0].x || cards[0].bottom <= cards[1].y || cards[1].bottom <= cards[0].y).toBe(true);
    await page.goto(`/producto.html?id=${catalog.products[0].id}`);
    await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
    await expect(page.locator('.breadcrumbs')).toBeVisible();
    await expect(page.locator('.product-intro')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/premium-product-${width}.png`, fullPage: true });
  }
});
