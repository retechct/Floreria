const { test, expect } = require("@playwright/test");
const path = require("node:path");
const fs = require("node:fs/promises");

test("product editing, real photos, collections and responsive storefront", async ({ page, browser }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/cuenta.html");
  await page.locator('[name="identifier"]').fill("admin");
  await page.locator('#login-form [name="password"]').fill("Only-for-ui-tests-123");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("#admin-shell")).toBeVisible();
  await expect(page.locator("[data-section]:visible")).toHaveCount(1);
  await page.screenshot({ path: "test-results/admin-overview-desktop.png", fullPage: true });

  await page.locator('[data-view="collections"]').click();
  await expect(page.locator(".collection-card")).toHaveCount(13);
  await page.getByRole("button", { name: "Nueva colección", exact: true }).click();
  await page.locator('[name="title"]').fill("Coleccion de prueba");
  await page.locator('[name="status"]').selectOption("published");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(page.locator(".collection-card")).toHaveCount(14);

  await page.locator('[data-view="products"]').click();
  await page.getByRole("button", { name: "Nuevo producto", exact: true }).click();
  await page.locator('[name="name"]').fill("Ramo de prueba QA");
  await page.locator('[name="sku"]').fill("QA-001");
  await page.locator('[name="description"]').fill("Rosas frescas con tarjeta personalizada.\nPresentacion floral de prueba.");
  await page.locator('[name="price"]').fill("129.90");
  await page.locator('[name="compareAtPrice"]').fill("149.90");
  await page.locator('[name="status"]').selectOption("published");
  await page.locator('[name="featured"]').check();
  await page.getByRole("checkbox", { name: "Coleccion de prueba", exact: true }).check();
  await page.getByRole("button", { name: "Agregar especificación" }).click();
  await page.getByLabel("Nombre de especificacion").fill("Dimensiones");
  await page.getByLabel("Valor de especificacion").fill("35 x 45 cm");
  await page.locator("#image-files").setInputFiles([
    path.resolve("public/assets/products/ramo-love.jpg"),
    path.resolve("public/assets/products/box-bella.jpg"),
  ]);
  await expect(page.locator("#image-slots img")).toHaveCount(2);
  await expect(page.locator("#save-record")).toBeEnabled();
  await page.getByRole("button", { name: "Mover foto 2 antes" }).click();
  await page.screenshot({ path: "test-results/admin-product-editor-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.locator("#product-search").fill("Ramo de prueba QA");
  await expect(page.locator("#products-list .product-row")).toHaveCount(1);
  await expect(page.locator("#products-list")).toContainText("129.90");
  await page.reload();
  await expect(page.locator("#admin-shell")).toBeVisible();
  await page.locator("#product-search").fill("Ramo de prueba QA");
  await expect(page.locator("#products-list")).toContainText("QA-001");

  const visitor = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const shop = await visitor.newPage();
  shop.on("pageerror", (error) => errors.push(error.message));
  await shop.goto("/catalogo.html");
  await shop.locator("#catalog-search").fill("Ramo de prueba QA");
  await expect(shop.locator(".product-card")).toHaveCount(1);
  const href = await shop.locator(".product-card .product-media").getAttribute("href");
  await shop.goto("/" + href);
  await expect(shop.locator(".thumb")).toHaveCount(2);
  const firstSrc = await shop.locator("[data-main-gallery-img]").getAttribute("src");
  await shop.locator(".thumb").nth(1).click();
  expect(await shop.locator("[data-main-gallery-img]").getAttribute("src")).not.toEqual(firstSrc);
  await expect(shop.locator(".product-specs")).toContainText("35 x 45 cm");
  await shop.locator("#add-product-detail").click();
  await expect(shop.locator("#cart-drawer-shell")).toHaveClass(/is-open/);
  await shop.goto("/carrito.html");
  await expect(shop.locator(".cart-item")).toHaveCount(1);
  await shop.goto("/checkout.html");
  await expect(shop.locator("#checkout-summary")).toContainText("Ramo de prueba QA");

  await page.getByRole("button", { name: "Editar Ramo de prueba QA", exact: true }).click();
  await page.locator('[name="price"]').fill("139.50");
  await page.locator('[name="available"]').uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await shop.goto("/" + href);
  await expect(shop.locator("#add-product-detail")).toBeDisabled();
  await expect(shop.locator(".buy-price")).toContainText("139.50");

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin.html#products");
    await expect(page.locator("#products-list .product-row").first()).toBeVisible();
    await expect(page.locator("[data-section]:visible")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      await page.screenshot({ path: "test-results/admin-products-mobile.png", fullPage: true });
      await page.locator("#menu-toggle").click();
      await expect(page.locator("#sidebar")).toHaveClass(/is-open/);
      await page.locator('[data-view="collections"]').click();
      await expect(page.locator('[data-section="collections"]')).toBeVisible();
      await expect(page.locator("#sidebar-shade")).not.toBeVisible();
      await page.getByRole("button", { name: "Editar Coleccion de prueba", exact: true }).click();
      await page.locator("[data-pick-product]:checked").uncheck();
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(page.locator("#editor")).not.toBeVisible();
      await expect(page.locator(".collection-card").filter({ hasText: "Coleccion de prueba" })).toContainText("0 productos");
      await page.getByRole("button", { name: "Nueva colección", exact: true }).click();
      await page.screenshot({ path: "test-results/admin-collection-editor-mobile.png", fullPage: true });
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    await shop.setViewportSize({ width, height: 900 });
    await shop.goto("/catalogo.html");
    await expect(shop.locator(".product-card").first()).toBeVisible();
    expect(await shop.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await shop.locator(".catalog-tools").boundingBox();
    expect(bounds.width).toBeGreaterThan(Math.min(width - 70, 1150));
    if (width === 390) await shop.screenshot({ path: "test-results/catalog-mobile.png", fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#product-search").fill("Ramo de prueba QA");
  await page.getByRole("button", { name: "Eliminar Ramo de prueba QA", exact: true }).click();
  await page.locator("#confirm-dialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page.locator("#products-list .product-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Eliminar Ramo de prueba QA", exact: true }).click();
  await page.locator("#confirm-dialog").getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.locator("#products-list .product-row")).toHaveCount(0);
  await shop.goto("/" + href);
  await expect(shop.locator("#product-detail")).toContainText("Producto no disponible");
  expect(errors).toEqual([]);
  await fs.writeFile("test-results/ui-verification.json", JSON.stringify({ viewports: [1440, 768, 390, 320], browserErrors: errors, productCrud: true, independentVisitor: true, gallery: true, emptyCollection: true }, null, 2));
  await visitor.close();
});

test("withdrawing original featured products does not break home or saved carts", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cuenta.html");
  await page.locator('#login-form [name="identifier"]').fill("admin");
  await page.locator('#login-form [name="password"]').fill("Only-for-ui-tests-123");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("#admin-shell")).toBeVisible();
  const auth = await (await page.request.get("/api/admin/session")).json();
  let catalog = (await (await page.request.get("/api/admin/catalog")).json()).catalog;
  for (const id of ["ramo-love", "box-amber"]) {
    const product = catalog.products.find((p) => p.id === id);
    const result = await page.request.put("/api/admin/products/" + id, {
      headers: { Origin: "http://127.0.0.1:3011", "X-CSRF-Token": auth.csrf },
      data: { item: { ...product, status: "draft" }, revision: catalog.revision },
    });
    expect(result.ok()).toBe(true);
    catalog = (await result.json()).catalog;
  }
  await page.evaluate(() => localStorage.setItem("la-casa-cart-v1", JSON.stringify([{ id: "ramo-love", qty: 1 }])));
  await page.goto("/index.html");
  await expect(page.locator("#hero-picks .hero-card")).toHaveCount(2);
  await expect(page.locator('#hero-picks a[href*="ramo-love"]')).toHaveCount(0);
  await page.goto("/carrito.html");
  await expect(page.locator("#cart-items")).toContainText("Tu selección");
  for (const route of ["/colecciones.html", "/personalizar.html", "/contacto.html", "/politicas.html", "/reclamaciones.html", "/confirmacion.html", "/catalogo-original.html"]) {
    await page.goto(route);
    await page.waitForFunction(() => document.querySelector(".mobile-tabbar"));
  }
  expect(errors).toEqual([]);
});
