const { test, expect } = require('@playwright/test');

test('product quote keeps gift preferences and only estimates an exact district', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/store-settings', route => route.fulfill({ json: { ok: true, settings: { sales_enabled: false, hide_prices_when_closed: false, quote_phone: '51999999999' } } }));
  await page.route('**/api/shipping', route => route.fulfill({ json: { ok: true, districts: [
    { name: 'Miraflores', enabled: true, fee: 15 },
    { name: 'San Juan de Miraflores', enabled: true, fee: 30 },
    { name: 'Ancón', enabled: false, fee: null },
  ] } }));
  const product = (await (await page.request.get('/api/catalog')).json()).products[0];
  await page.goto(`/producto.html?id=${product.id}`);
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await page.getByLabel('Dedicatoria', { exact: true }).fill('Para ti, con cariño & flores.');
  await page.getByLabel('Fecha de entrega preferida').fill('2099-04-25');
  await page.getByLabel('Horario preferido').selectOption('15:00 - 18:00');
  const district = page.getByLabel('Distrito de entrega', { exact: true });
  await district.fill('Mir');
  await expect(page.locator('[data-shipping-result]')).toContainText('nombre completo');
  await expect(page.locator('[data-shipping-result]')).not.toContainText('S/');
  await page.locator('[data-district="San Juan de Miraflores"]').click();
  await expect(page.locator('[data-shipping-result]')).toContainText('30.00');
  await expect(page.locator('[data-shipping-result]')).toContainText('WhatsApp');
  const url = new URL(await page.locator('.sticky-add a').getAttribute('href'));
  const text = url.searchParams.get('text');
  for (const expected of [product.name, `producto.html?id=${product.id}`, 'Para ti, con cariño & flores.', '2099-04-25', '15:00 - 18:00', 'San Juan de Miraflores']) expect(text).toContain(expected);
  await district.fill('ancon');
  await expect(page.locator('[data-shipping-result]')).toContainText('no realizamos entregas');
  await expect(page.locator('#delivery-slot')).not.toContainText('Hoy disponible');
  await expect(page.locator('#delivery-preferences-note')).toContainText('sujetas a disponibilidad');
  await expect(page.locator('.thumb[aria-pressed="true"]')).toHaveCount(1);
  await page.locator('.thumb').last().click();
  await expect(page.locator('.thumb').last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.thumb[aria-pressed="true"]')).toHaveCount(1);
});

test('cart drawer contains keyboard focus, restores it and blocks empty checkout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const product = (await (await page.request.get('/api/catalog')).json()).products.find(item => item.available !== false);
  await page.goto(`/producto.html?id=${product.id}`);
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  const add = page.locator('#add-product-detail');
  await add.click();
  const shell = page.locator('#cart-drawer-shell');
  const close = shell.locator('.cart-drawer-head [data-cart-close]');
  await expect(close).toBeFocused();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await shell.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await shell.getByRole('button', { name: `Aumentar cantidad de ${product.name}`, exact: true }).click();
  await expect(shell.getByRole('button', { name: `Aumentar cantidad de ${product.name}`, exact: true })).toBeFocused();
  await expect(shell.locator('.qty-controls span')).toHaveText('2');
  await shell.getByRole('button', { name: `Quitar ${product.name}`, exact: true }).click();
  await expect(shell.getByRole('link', { name: 'Explorar arreglos' })).toBeFocused();
  await expect(shell.locator('[data-drawer-checkout]')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(shell).toHaveAttribute('inert', '');
  await expect(add).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await page.goto('/carrito.html');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await expect(page.locator('#checkout-action')).not.toHaveAttribute('href');
});

test('product delivery rejects a past date before adding the gift', async ({ page }) => {
  const product = (await (await page.request.get('/api/catalog')).json()).products.find(item => item.available !== false);
  await page.goto(`/producto.html?id=${product.id}`);
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await page.getByLabel('Fecha de entrega preferida').fill('2000-01-01');
  await page.locator('#add-product-detail').click();
  await expect(page.locator('#delivery-date')).toBeFocused();
  expect(await page.locator('#delivery-date').evaluate(node => node.validity.rangeUnderflow)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('la-casa-cart-v1') || '[]'))).toEqual([]);
});
