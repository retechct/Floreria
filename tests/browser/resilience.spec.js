const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('floral-welcome-seen', '1'));
  await page.route('https://js.culqi.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.CulqiCheckout = function(){};' }));
  await page.route('https://3ds.culqi.com/**', route => route.fulfill({ contentType: 'application/javascript', body: 'window.Culqi3DS = {};' }));
});

test('all public sections complete without script errors or admin redirects', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const catalog = await (await page.request.get('/api/catalog')).json();
  const pages = [
    ['index.html', '#hero-picks a'], ['catalogo.html', '.product-card'],
    ['catalogo.html?promociones=1', '#result-line'],
    [`producto.html?id=${catalog.products[0].id}`, '#product-detail h1'],
    ['colecciones.html', '.collection-block'], ['catalogo-original.html', '.catalog-page'],
    ['carrito.html', '#cart-summary'], ['checkout.html', '#checkout-summary'],
    ['confirmacion.html', '.confirmation-card'], ['contacto.html', 'main h1'],
    ['politicas.html', '#cookies'], ['reclamaciones.html', 'main form'],
    ['cuenta.html', '#login-form'], ['personalizar.html', '.product-card'],
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, selector] of pages) {
      await page.goto('/' + path);
      await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
      await expect(page.locator(selector).first()).toBeVisible();
      await expect(page.locator('.profile-menu:visible summary')).toBeVisible();
      await expect(page.locator('.catalog-load-error')).toHaveCount(0);
      expect(page.url()).not.toContain('admin');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('navigation remains usable while catalog waits and retries a transient failure', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let calls = 0;
  await page.route('**/api/catalog', async route => {
    calls++;
    if (calls === 1) { await gate; await route.fulfill({ status: 503, json: { ok: false } }); }
    else await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('.profile-menu:visible summary')).toBeVisible();
  await expect(page.locator('.catalog-load-error')).toContainText('Cargando');
  await page.locator('.profile-menu:visible summary').click();
  await expect(page.locator('.profile-menu:visible a[href="cuenta.html"]')).toBeVisible();
  release();
  await expect(page.locator('#hero-picks a').first()).toBeVisible();
  await expect(page.locator('.catalog-load-error')).toHaveCount(0);
  expect(calls).toBe(2);
});

test('catalog outage preserves account and legal pages, and retry recovers products', async ({ page }) => {
  await page.route('**/api/catalog', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/');
  await expect(page.locator('.catalog-load-error button')).toBeVisible();
  await expect(page.locator('.profile-menu:visible summary')).toBeVisible();
  await page.goto('/cuenta.html');
  await expect(page.locator('#login-form')).toBeVisible();
  await page.goto('/politicas.html');
  await expect(page.locator('#cookies')).toBeVisible();
  await page.goto('/catalogo.html');
  await expect(page.locator('.catalog-load-error button')).toBeVisible();
  await page.unroute('**/api/catalog');
  await page.locator('.catalog-load-error button').click();
  await expect(page.locator('.product-card').first()).toBeVisible();
});

test('shipping outage cannot hide products or enable checkout', async ({ page }) => {
  await page.route('**/api/shipping', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/');
  await expect(page.locator('#hero-picks a').first()).toBeVisible();
  await expect(page.locator('.catalog-load-error')).toContainText('tarifas');
  await page.goto('/checkout.html');
  await expect(page.locator('.catalog-load-error')).toContainText('Reintenta antes de pagar');
  await expect(page.locator('#pay-order')).toBeDisabled();
});

test('blocked storage and missing observer do not prevent rendering', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.getItem = () => '[null,{"qty":1},{"id":"missing","qty":1}]';
    delete window.IntersectionObserver;
  });
  await page.goto('/catalogo.html');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  await expect(page.locator('.product-card').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin session failures stay on admin and public visits never request admin auth', async ({ page }) => {
  const adminRequests = [];
  page.on('request', request => { if (request.url().includes('/api/admin/')) adminRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-store-ready', 'true');
  expect(adminRequests).toEqual([]);
  await page.route('**/api/admin/session', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/admin.html');
  await expect(page.locator('#admin-retry')).toBeVisible();
  await expect(page).toHaveURL(/admin\.html/);
  await page.unroute('**/api/admin/session');
  await page.locator('#admin-retry').click();
  await expect(page.locator('#admin-login-form')).toBeVisible();
  await page.locator('[name="username"]').fill('admin');
  await page.locator('[name="password"]').fill('Only-for-ui-tests-123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.locator('#admin-shell')).toBeVisible();
  await page.goto('/cuenta.html');
  await expect(page.locator('#login-form')).toBeVisible();
  await expect(page).toHaveURL(/cuenta\.html/);
});
