const { test, expect } = require('@playwright/test');

test('catalog filters preserve search on reload and can clear every constraint', async ({ page }) => {
  const catalog = await (await page.request.get('/api/catalog')).json();
  catalog.products = [
    { ...catalog.products[0], id: 'audit-a', name: 'Orquídea pequeña', price: 90, occasion: 'Amor', available: true },
    { ...catalog.products[0], id: 'audit-b', name: 'Orquídea agotada', price: 80, occasion: 'Amor', available: false },
    { ...catalog.products[0], id: 'audit-c', name: 'Ramo especial', price: 350, occasion: 'Cumpleaños', available: true },
  ];
  await page.route('**/api/catalog', route => route.fulfill({ json: catalog }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogo.html');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await page.locator('#catalog-refine summary').click();
  await page.locator('#catalog-search').fill('orquidea');
  await page.locator('#catalog-budget').selectOption('100');
  await page.locator('#catalog-occasion').selectOption('Amor');
  await page.locator('#catalog-available').check();
  await expect(page.locator('#product-grid .product-card')).toHaveCount(1);
  await expect(page.locator('#product-grid')).toContainText('Orquídea pequeña');
  expect(new URL(page.url()).searchParams.get('presupuesto')).toBe('100');
  await page.reload();
  await expect(page.locator('#product-grid .product-card')).toHaveCount(1);
  await expect(page.locator('#catalog-search')).toHaveValue('orquidea');
  await page.locator('#catalog-clear').click();
  await expect(page.locator('#product-grid .product-card')).toHaveCount(3);
  expect(new URL(page.url()).search).toBe('');
  await page.locator('#catalog-refine summary').click();
  await page.locator('#catalog-budget').selectOption('mas300');
  await expect(page.locator('#product-grid .product-card')).toHaveCount(1);
  await expect(page.locator('#product-grid')).toContainText('Ramo especial');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('claims receipt print works under the script policy', async ({ page }) => {
  await page.addInitScript(() => { window.print = () => { document.body.dataset.printCalled = 'true'; }; });
  await page.route('**/api/reclamaciones', route => route.fulfill({ json: { ok: true, code: 'TEST-CLAIM' } }));
  await page.goto('/reclamaciones.html');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await page.locator('#claim-type').selectOption('reclamo');
  await page.locator('#consumer-name').fill('Prueba local');
  await page.locator('#document-type').selectOption('DNI');
  await page.locator('#document-number').fill('12345678');
  await page.locator('#claim-email').fill('prueba@example.test');
  await page.locator('#claim-phone').fill('999999999');
  await page.locator('#claim-product').fill('Ramo de prueba');
  await page.locator('#claim-detail').fill('Detalle de prueba');
  await page.locator('#claim-request').fill('Respuesta de prueba');
  await page.locator('[name=accepted_privacy]').check();
  await page.locator('#claims-form button[type=submit]').click();
  await page.getByRole('button', { name: 'Imprimir constancia' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-print-called', 'true');
});

test('bespoke arrangements lead to contact instead of the retired builder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await page.locator('.mobile-menu-toggle').click();
  await page.getByRole('link', { name: 'Arreglos a medida y contacto' }).click();
  await expect(page).toHaveURL(/contacto.html$/);
  await expect(page.locator('main h1')).toHaveText('Coordinamos cada detalle contigo');
});
