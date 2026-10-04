const { test, expect } = require('@playwright/test');

test('mobile menu, bottom navigation and store mode remain accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogo.html?promociones=1');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  const tabs = page.locator('.mobile-tabbar');
  await expect(tabs.locator('a:visible')).toHaveCount(4);
  await expect(tabs.locator('[aria-current=page]')).toHaveText('Catálogo');
  await expect(page.locator('.mobile-cart-fab')).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  const menu = page.locator('#mobile-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Promociones', exact: true })).toBeVisible();
  await menu.getByText('Flores y arreglos', { exact: true }).click();
  await expect(menu.locator('[data-menu-categories] a').first()).toBeVisible();
  await menu.getByText('Por ocasión', { exact: true }).click();
  await expect(menu.locator('[data-menu-occasions] a').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-menu.png' });
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press('Tab');
    expect(await menu.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.locator('.mobile-menu-toggle')).toBeFocused();
  await tabs.locator('.cart-link').click();
  await expect(page.locator('#cart-drawer-shell')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await page.route('**/api/store-settings', route => route.fulfill({ json: { ok: true, settings: { sales_enabled: false } } }));
  await page.goto('/');
  await expect(tabs.getByRole('link', { name: 'Cotizar', exact: true })).toBeVisible();
  await expect(tabs.locator('.cart-link')).toHaveCount(0);
  await page.locator('.mobile-menu-toggle').click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(menu).toBeHidden();
  expect(await page.locator('body').evaluate(node => node.classList.contains('mobile-menu-open'))).toBe(false);
});

test('public pages fit narrow phones and tablets', async ({ page }) => {
  await page.route('https://js.culqi.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.CulqiCheckout = function(){};' }));
  await page.route('https://3ds.culqi.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.Culqi3DS = {};' }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const catalog = await (await page.request.get('/api/catalog')).json();
  for (const width of [320, 390, 760, 820]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/catalogo.html', `/producto.html?id=${catalog.products[0].id}`, '/colecciones.html', '/personalizar.html', '/contacto.html', '/cuenta.html', '/carrito.html', '/checkout.html', '/reclamaciones.html', '/politicas.html']) {
      await page.goto(route);
      await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
      const overflow = await page.locator('main').evaluate(main => [...main.querySelectorAll('input:not([type=checkbox]),textarea,select,form,.product-card,.account-panel')].filter(node => {
        const box = node.getBoundingClientRect();
        for (let ancestor = node.parentElement; ancestor && ancestor !== main; ancestor = ancestor.parentElement) {
          if (['auto', 'scroll'].includes(getComputedStyle(ancestor).overflowX)) {
            const bounds = ancestor.getBoundingClientRect();
            if (bounds.left >= -1 && bounds.right <= innerWidth + 1) return false;
          }
        }
        return box.width && box.height && (box.x < -1 || box.right > innerWidth + 1);
      }).map(node => node.className || node.tagName));
      expect(overflow, `${route} at ${width}px`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390 && ['/', '/catalogo.html', '/contacto.html'].includes(route)) await page.screenshot({ path: `test-results/mobile-${route === '/' ? 'home' : route.slice(1, -5)}.png`, fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test('home mobile layout makes featured products readable and footer sections operable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  const firstCard = page.locator('.featured-showcase .product-card').first();
  expect((await firstCard.boundingBox()).width).toBeGreaterThan(250);
  await expect(page.locator('.occasion-grid')).toHaveCSS('overflow-x', 'auto');
  const footer = page.locator('.footer-column').first();
  await expect(footer).not.toHaveAttribute('open');
  await footer.locator('summary').click();
  await expect(footer.getByRole('link', { name: 'Catálogo de flores' })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(footer).toHaveAttribute('open');
});
