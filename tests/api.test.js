const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { createStore } = require("../lib/store");
let server, gateway, directory, base, cookie, csrf, snapshot, chargeCount = 0, chargedAmount;
const password = "Only-for-automated-tests-123";

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "floreria-api-"));
  gateway = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    chargedAmount = JSON.parse(Buffer.concat(chunks)).amount;
    chargeCount++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ object: "charge", id: "chr_test_1234567890abcdef", amount: chargedAmount, currency_code: "PEN", capture: true, paid: false, outcome: { type: "venta_exitosa" } }));
  });
  await new Promise((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  const salt = crypto.randomBytes(16).toString("hex");
  Object.assign(process.env, {
    NODE_ENV: "test", VERCEL: "", DATABASE_URL: "", DATA_DIR: directory, ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD_HASH: `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`,
    ADMIN_SESSION_SECRET: crypto.randomBytes(48).toString("hex"),
    CULQI_PUBLIC_KEY: "pk_test_1234567890abcdef", CULQI_SECRET_KEY: "sk_test_1234567890abcdef",
    CULQI_API_BASE: `http://127.0.0.1:${gateway.address().port}/v2`,
  });
  server = http.createServer(require("../server"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.SITE_URL = base;
});
after(async () => {
  await Promise.all([server, gateway].filter(Boolean).map((s) => new Promise((resolve) => s.close(resolve))));
  if (directory && path.dirname(directory) === os.tmpdir() && path.basename(directory).startsWith("floreria-api-")) await fs.rm(directory, { recursive: true, force: true });
});

async function request(route, method = "GET", body, auth = true, origin = base) {
  const response = await fetch(base + route, {
    method, headers: { "Content-Type": "application/json", Origin: origin, ...(auth ? { Cookie: cookie || "", "X-CSRF-Token": csrf || "" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => ({})), headers: response.headers };
}
async function save(kind, item, id, extra = {}) {
  const result = await request(`/api/admin/${kind}${id ? "/" + id : ""}`, id ? "PUT" : "POST", { item, revision: snapshot.revision, ...extra });
  if (result.data.catalog) snapshot = result.data.catalog;
  return result;
}

test("authenticated catalog lifecycle, shared persistence and checkout integrity", async (t) => {
  await t.test("private files and unauthenticated writes are blocked", async () => {
    for (const route of ["/.env.admin", "/.admin-access.txt", "/lib/admin.js", "/data/products.json", "/package.json"]) assert.equal((await fetch(base + route)).status, 404);
    assert.equal((await request("/api/admin/catalog", "GET", undefined, false)).status, 401);
    assert.equal((await request("/api/admin/products", "POST", {}, false)).status, 401);
  });
  await t.test("login sets a protected cookie and prevents cross-origin writes", async () => {
    assert.equal((await request("/api/admin/login", "POST", { username: "admin", password: "wrong" }, false)).status, 401);
    const login = await request("/api/admin/login", "POST", { username: "admin", password }, false);
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
    csrf = login.data.csrf;
    assert.equal((await request("/api/admin/products", "POST", {}, true, "https://other.example")).status, 403);
    const old = csrf; csrf = "";
    assert.equal((await request("/api/admin/products", "POST", {})).status, 403);
    csrf = old;
    snapshot = (await request("/api/admin/catalog")).data.catalog;
    assert.equal(snapshot.products.length, 77);
    assert.equal(snapshot.collections.length, 13);
  });
  let photos, product, collection;
  await t.test("uploads validate actual images and survive storage recreation", async () => {
    assert.equal((await request("/api/admin/images", "POST", { data: Buffer.from("<svg></svg>").toString("base64") })).status, 400);
    photos = [];
    for (const background of ["#ff6688", "#66aa88", "#99aaff"]) {
      const png = await sharp({ create: { width: 100, height: 120, channels: 3, background } }).png().toBuffer();
      const uploaded = await request("/api/admin/images", "POST", { data: png.toString("base64") });
      assert.equal(uploaded.status, 201);
      photos.push(uploaded.data.url);
      const image = await fetch(base + uploaded.data.url);
      assert.equal(image.headers.get("content-type"), "image/webp");
      assert.ok((await image.arrayBuffer()).byteLength > 50);
    }
    const reopened = createStore({ directory });
    assert.ok(await reopened.readImage(photos[0].split("/").pop()));
  });
  await t.test("publication validates price, real gallery and specifications", async () => {
    product = { name: "Producto API", description: "Descripcion de prueba", price: 129.90, category: "Ramos", images: [photos[0]], specifications: [{ label: "Altura", value: "40 cm" }], status: "published", available: true, compareAtPrice: 150, sku: "TEST-001" };
    assert.equal((await save("products", product)).status, 400);
    assert.equal((await save("products", { ...product, images: [photos[0], photos[0]] })).status, 400);
    assert.equal((await save("products", { ...product, images: photos, price: -1 })).status, 400);
    assert.equal((await save("products", { ...product, images: photos, price: 1.111 })).status, 400);
    assert.equal((await save("products", { ...product, images: photos, compareAtPrice: 10 })).status, 400);
    assert.equal((await save("products", { ...product, images: ["javascript:alert(1)", photos[0]] })).status, 400);
    assert.equal((await save("products", { ...product, images: photos })).status, 200);
    product = snapshot.products.at(-1);
    assert.equal(product.price, 129.90);
    const reopened = createStore({ directory });
    assert.equal((await reopened.read("catalog")).products.at(-1).name, product.name);
  });
  await t.test("collections honor explicit membership, including the empty case", async () => {
    assert.equal((await save("collections", { title: "Coleccion API", description: "Test", image: photos[0], productIds: [product.id], status: "published" })).status, 200);
    collection = snapshot.collections.at(-1);
    assert.deepEqual(collection.productIds, [product.id]);
    assert.equal((await save("collections", { ...collection, productIds: [] }, collection.id)).status, 200);
    assert.deepEqual((await request("/api/catalog", "GET", undefined, false)).data.collections.find((c) => c.id === collection.id).productIds, []);
    assert.equal((await save("products", product, product.id, { collectionIds: [collection.id] })).status, 200);
    assert.deepEqual(snapshot.collections.at(-1).productIds, [product.id]);
  });
  await t.test("drafts are private and stale edits cannot overwrite newer changes", async () => {
    const stale = snapshot.revision;
    assert.equal((await save("products", { ...product, status: "draft" }, product.id)).status, 200);
    assert.equal((await request("/api/admin/products/" + product.id, "PUT", { item: product, revision: stale })).status, 409);
    const publicData = (await request("/api/catalog", "GET", undefined, false)).data;
    assert.ok(!publicData.products.some((p) => p.id === product.id));
    assert.deepEqual(publicData.collections.find((c) => c.id === collection.id).productIds, []);
    assert.equal((await save("products", product, product.id)).status, 200);
  });
  await t.test("server prices override client prices and repeated payment requests charge once", async () => {
    const body = {
      request_id: crypto.randomUUID(), expected_total: 144.90,
      cart: [{ id: product.id, qty: 1, price: 1 }],
      customer: { first_name: "Test", last_name: "Buyer", email: "test@example.com", phone: "999999999" },
      delivery: { district: "Miraflores", address: "Test 123", date: "2099-01-01", slot: "09:00 - 12:00", recipient: "Test", recipient_phone: "999999999" },
      payment: { token_id: "tkn_test_1234567890abcdef", device_id: "fake-device" }, legal: { accepted_terms: true },
    };
    const tampered = await request("/api/checkout/culqi", "POST", { ...body, expected_total: 16 }, false);
    assert.equal(tampered.status, 409);
    assert.equal(chargeCount, 0);
    const response = await request("/api/checkout/culqi", "POST", body, false);
    assert.equal(response.status, 200, response.data.message);
    assert.equal(chargedAmount, 14490);
    assert.equal(response.data.order.items[0].unit_price, 129.90);
    assert.equal((await request("/api/checkout/culqi", "POST", body, false)).data.order.id, response.data.order.id);
    assert.equal(chargeCount, 1);
    assert.equal((await request("/api/checkout/culqi", "POST", { ...body, request_id: crypto.randomUUID(), cart: [{ id: product.id, qty: 1, custom: { admin_promotion: true, price: 1 } }] }, false)).status, 400);
    assert.equal((await request("/api/checkout/culqi", "POST", { ...body, request_id: crypto.randomUUID(), cart: [{ id: product.id, qty: 1, custom: { builder: { base: "ramo", stems: 1, additions: [] } } }] }, false)).status, 400);
    assert.equal((await save("products", { ...product, available: false }, product.id)).status, 200);
    assert.equal((await request("/api/checkout/culqi", "POST", { ...body, request_id: crypto.randomUUID() }, false)).status, 400);
    assert.equal(chargeCount, 1);
    const saved = (await request("/api/admin/orders")).data.orders[0];
    assert.equal(saved.status, "completed");
    assert.equal(saved.payment, undefined);
  });
  await t.test("renaming categories updates products and deletion protects assignments", async () => {
    await save("categories", { name: "Categoria API", image: photos[0] });
    const category = snapshot.categories.at(-1);
    await save("products", { ...product, category: category.name }, product.id);
    await save("categories", { ...category, name: "Categoria editada" }, category.id);
    assert.equal(snapshot.products.find((p) => p.id === product.id).category, "Categoria editada");
    assert.equal((await request("/api/admin/categories/" + category.id, "DELETE", { revision: snapshot.revision })).status, 409);
    const deleted = await request("/api/admin/products/" + product.id, "DELETE", { revision: snapshot.revision });
    snapshot = deleted.data.catalog;
    assert.equal(deleted.status, 200);
    assert.deepEqual(snapshot.collections.at(-1).productIds, []);
    assert.equal((await request("/api/admin/categories/" + category.id, "DELETE", { revision: snapshot.revision })).status, 200);
  });
  await t.test("legacy migration is repeat-safe and does not publish unfinished promotions", async () => {
    snapshot = (await request("/api/admin/catalog")).data.catalog;
    const old = { categories: [], products: [{ id: "promo-old", name: "Promo antigua", price: 50, category: "Ramos", image: photos[0], description: "Anterior" }], collections: [{ id: "old", title: "Coleccion antigua", image: photos[0] }], assignments: { old: ["promo-old"] } };
    const migrated = await request("/api/admin/import-legacy", "POST", { ...old, revision: snapshot.revision });
    assert.equal(migrated.status, 200, migrated.data.message);
    assert.equal(migrated.data.catalog.products.find((p) => p.id === "promo-old").status, "draft");
    assert.equal((await request("/api/admin/import-legacy", "POST", { ...old, revision: migrated.data.catalog.revision })).status, 409);
  });
  await t.test("claims are persistent and restricted to the administrator", async () => {
    const response = await request("/api/reclamaciones", "POST", {
      type: "reclamo", consumer_name: "Persona de prueba", document_type: "DNI", document_number: "12345678",
      email: "test@example.com", phone: "999999999", product: "Ramo de prueba", detail: "Detalle de prueba",
      request: "Solicitud de prueba", accepted_privacy: true,
    }, false);
    assert.equal(response.status, 200);
    const records = (await request("/api/admin/orders")).data.claims;
    assert.equal(records[0].code, response.data.code);
    const reopened = createStore({ directory });
    assert.equal((await reopened.read("claims"))[0].code, response.data.code);
    assert.equal((await request("/api/admin/orders", "GET", undefined, false)).status, 401);
  });
});
