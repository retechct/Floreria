const { test, expect } = require('@playwright/test');

test('catalog paginates, respects boundaries and resets when filtering or sorting', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('floral-welcome-seen', '1'));
  const catalog = await (await page.request.get('/api/catalog')).json();
  catalog.products = Array.from({ length: 25 }, (_, index) => ({
    ...catalog.products[0], id: `page-${index}`, name: `Flor ${String(index + 1).padStart(2, '0')}`,
    featured: false, isPromotion: false, price: index + 1,
  }));
  await page.route('**/api/catalog', route => route.fulfill({ json: catalog }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogo.html');
  const cards = page.locator('#product-grid .product-card');
  const next = page.getByRole('button', { name: 'Página siguiente', exact: true });
  const previous = page.getByRole('button', { name: 'Página anterior', exact: true });
  await expect(cards).toHaveCount(12);
  await expect(previous).toBeDisabled();
  await expect(page.locator('#result-line')).toContainText('1–12 de 25');
  await next.click();
  await expect(cards).toHaveCount(12);
  await expect(cards.first()).toContainText('Flor 13');
  await expect(page.locator('#catalog-page-label')).toHaveText('Página 2 de 3');
  await next.click();
  await expect(cards).toHaveCount(1);
  await expect(next).toBeDisabled();
  await expect(cards.first()).toContainText('Flor 25');
  await previous.click();
  await expect(cards.first()).toContainText('Flor 13');
  await page.locator('#catalog-sort').selectOption('name');
  await expect(cards.first()).toContainText('Flor 01');
  await expect(previous).toBeDisabled();
  await next.click();
  await page.locator('#catalog-search').fill('Flor 25');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('#catalog-pagination')).toBeHidden();
  await page.locator('#catalog-search').fill('sin coincidencias');
  await expect(cards).toHaveCount(0);
  await expect(page.locator('#catalog-pagination')).toBeHidden();
  await expect(page.locator('#result-line')).toContainText('0 arreglos');
  await page.locator('#catalog-search').clear();
  await expect(cards).toHaveCount(12);
  await expect(previous).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
