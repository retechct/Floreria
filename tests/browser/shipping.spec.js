const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ page }) => { await page.addInitScript(() => sessionStorage.setItem("floral-welcome-seen", "1")); });

test("district editing persists and checkout uses the shared tariffs on desktop and mobile", async ({ page, browser }) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin.html");
  await page.locator('#admin-login-form [name="username"]').fill("admin");
  await page.locator('#admin-login-form [name="password"]').fill("Only-for-ui-tests-123");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/admin\.html/);
  await expect(page.locator("#admin-shell")).toBeVisible();
  await page.goto("/admin.html#shipping");
  await expect(page.locator(".shipping-row")).toHaveCount(50);
  await expect(page.locator("[data-section]:visible")).toHaveCount(1);
  await page.locator("#shipping-province").selectOption("Lima");
  await expect(page.locator(".shipping-row")).toHaveCount(43);
  await page.locator("#shipping-province").selectOption("Callao");
  await expect(page.locator(".shipping-row")).toHaveCount(7);
  await page.locator("#shipping-province").selectOption("");
  await page.locator("#shipping-search").fill("ancon");
  await expect(page.locator(".shipping-row")).toHaveCount(1);
  await page.locator('[data-fee="150102"]').fill("0");
  await page.locator('[data-enabled="150102"]').check();
  await page.locator("#save-shipping").click();
  await expect(page.locator("#shipping-message")).toHaveText("Tarifas guardadas.");
  await page.reload();
  await expect(page.locator('[data-fee="150102"]')).toHaveValue("0");
  await expect(page.locator('[data-enabled="150102"]')).toBeChecked();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/shipping-${width}.png`, fullPage: width === 390 ? false : true });
    if (width === 390) {
      await page.locator("#menu-toggle").click();
      await page.screenshot({ path: "test-results/shipping-menu-mobile.png" });
      await page.locator('[data-view="products"]').click();
      await expect(page.locator('[data-section="shipping"]')).toBeHidden();
      await page.locator("#menu-toggle").click();
      await page.locator('[data-view="shipping"]').click();
    }
  }
  const visitor = await browser.newContext();
  await visitor.addInitScript(() => sessionStorage.setItem("floral-welcome-seen", "1"));
  const shop = await visitor.newPage();
  await shop.route("https://js.culqi.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: "window.CulqiCheckout = function(){};" }));
  await shop.route("https://3ds.culqi.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: "window.Culqi3DS = {};" }));
  await shop.goto("/catalogo.html");
  const products = (await (await shop.request.get("/api/catalog")).json()).products;
  await shop.evaluate((id) => localStorage.setItem("la-casa-cart-v1", JSON.stringify([{ id, qty: 1 }])), products[0].id);
  for (const width of [1440, 768, 390, 320]) {
    await shop.setViewportSize({ width, height: 1000 });
    await shop.goto("/checkout.html");
    await expect(shop.locator("#delivery-district option")).toHaveCount(51);
    await shop.locator("#delivery-district").selectOption("150102");
    await expect(shop.locator("#pay-order")).toBeEnabled();
    await expect(shop.locator("#checkout-summary")).toContainText("0.00");
    expect(await shop.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) await shop.screenshot({ path: "test-results/checkout-mobile.png", fullPage: true });
  }
  expect(errors).toEqual([]);
  await visitor.close();
});

test("hosted Culqi checkout completes 3DS and confirms against the server", async ({ page }) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://js.culqi.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: `
    window.CulqiCheckout = class {
      constructor(key, config) { window.testCulqiConfig = config; }
      open() { setTimeout(() => { this.token = { id: 'tkn_test_1234567890abcdef' }; this.culqi(); }, 50); }
      close() {}
    };` }));
  await page.route("https://3ds.culqi.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: `
    window.Culqi3DS = {
      reset() {}, generateDevice: async () => 'test-browser-device',
      initAuthentication(token) {
        window.test3dsToken = token;
        setTimeout(() => window.postMessage({ parameters3DS: { eci: '05', cavv: 'test-cryptogram', protocolVersion: '2.2.0' } }, location.origin), 100);
      }
    };` }));
  await page.goto("/catalogo.html");
  const product = (await (await page.request.get("/api/catalog")).json()).products[0];
  await page.evaluate((id) => localStorage.setItem("la-casa-cart-v1", JSON.stringify([{ id, qty: 1 }])), product.id);
  await page.goto("/checkout.html");
  await expect(page.locator('[autocomplete="cc-number"], [autocomplete="cc-csc"]')).toHaveCount(0);
  for (const [name, value] of Object.entries({ first_name: "Ana", last_name: "Prueba", email: "ana@example.com", phone: "999999999", recipient: "Persona de prueba", recipient_phone: "999999999", delivery_date: "2099-01-01", delivery_address: "Calle de prueba 123" })) await page.locator(`[name="${name}"]`).fill(value);
  await page.locator("#delivery-slot").selectOption("09:00 - 12:00");
  await page.locator("#delivery-district").selectOption("150122");
  await page.locator("#legal-acceptance").check();
  await expect(page.locator("#pay-order")).toBeEnabled();
  await page.locator("#pay-order").click();
  await expect(page).toHaveURL(/confirmacion\.html/);
  await expect(page.locator("#confirmation-panel")).toContainText("Pago confirmado");
  await expect(page.locator("#confirmation-panel")).toContainText("chr_test_");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("la-casa-cart-v1")))).toEqual([]);
  await page.evaluate(() => localStorage.setItem("la-casa-last-order-v1", JSON.stringify({ status: "completed", id: "FAKE", total: 1 })));
  await page.reload();
  await expect(page.locator("#confirmation-panel")).not.toContainText("FAKE");
  await expect(page.locator("#confirmation-panel")).toContainText("Pago confirmado");
  expect(errors).toEqual([]);
});
