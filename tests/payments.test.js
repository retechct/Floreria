const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { createStore } = require("../lib/store");
let server, gateway, directory, base, csrf, cookie, product, lastCharge, mode = "success", calls = 0;
const charges = new Map();
const webhookSecret = crypto.randomBytes(32).toString("hex");

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "floreria-payments-"));
  gateway = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { res.end(JSON.stringify(charges.get(req.url.split("/").pop()) || {})); return; }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks));
    calls++; lastCharge = body;
    if (mode === "3ds" && !body.authentication_3DS) { res.end(JSON.stringify({ action_code: "REVIEW" })); return; }
    if (mode === "rejected") { res.statusCode = 400; res.end(JSON.stringify({ object: "error", user_message: "Tarjeta rechazada." })); return; }
    if (mode === "uncertain") { res.statusCode = 500; res.end("{}"); return; }
    if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 100));
    const charge = { object: "charge", id: "chr_test_" + crypto.randomBytes(8).toString("hex"), amount: body.amount, currency_code: body.currency_code, metadata: body.metadata, capture: true, paid: false, outcome: { type: "venta_exitosa", code: "AUT0000" } };
    charges.set(charge.id, charge);
    res.statusCode = 201; res.end(JSON.stringify(charge));
  });
  await new Promise((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  const salt = crypto.randomBytes(16).toString("hex");
  Object.assign(process.env, {
    NODE_ENV: "test", VERCEL: "", DATABASE_URL: "", DATA_DIR: directory, ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD_HASH: `scrypt:${salt}:${crypto.scryptSync("test-password", salt, 64).toString("hex")}`,
    ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString("hex"),
    CULQI_PUBLIC_KEY: "pk_test_1234567890abcdef", CULQI_SECRET_KEY: "sk_test_1234567890abcdef",
    CULQI_WEBHOOK_SECRET: webhookSecret, CULQI_API_BASE: `http://127.0.0.1:${gateway.address().port}/v2`,
  });
  server = http.createServer(require("../server"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`; process.env.SITE_URL = base;
  const login = await request("/api/admin/login", { username: "admin", password: "test-password" });
  cookie = login.headers.get("set-cookie").split(";")[0]; csrf = login.data.csrf;
  product = (await request("/api/catalog", undefined, "GET")).data.products[0];
});
after(async () => {
  await Promise.all([server, gateway].filter(Boolean).map((s) => new Promise((resolve) => s.close(resolve))));
  if (directory && path.dirname(directory) === os.tmpdir() && path.basename(directory).startsWith("floreria-payments-")) await fs.rm(directory, { recursive: true, force: true });
});
async function request(route, body, method = "POST", origin) {
  const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json", Origin: origin || base, Cookie: cookie || "", "X-CSRF-Token": csrf || "" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
function order() {
  return { request_id: crypto.randomUUID(), expected_total: product.price + 15, cart: [{ id: product.id, qty: 1 }], customer: { first_name: "Test", last_name: "Buyer", email: "test@example.com", phone: "999999999" }, delivery: { district_id: "150122", address: "Test 123", date: "2099-01-01", slot: "09:00 - 12:00", recipient: "Persona", recipient_phone: "999999999" }, legal: { accepted_terms: true }, payment: { token_id: "tkn_test_1234567890abcdef", device_id: "test-device-123" } };
}
const auth3ds = { eci: "05", cavv: "AAABAWFlmQAAAABjRWWZEEFgFz+=", protocolVersion: "2.2.0", directoryServerTransactionId: "88debec7-a798-46d1-bcfb-db3075fedb82" };

test("Lima shipping and Culqi payment lifecycle", async (t) => {
  await t.test("all official districts exist; unset, zero and disabled tariffs stay distinct", async () => {
    let shipping = (await request("/api/admin/shipping", undefined, "GET")).data.shipping;
    assert.equal(shipping.districts.filter((d) => d.province === "Lima").length, 43);
    assert.equal(shipping.districts.filter((d) => d.province === "Callao").length, 7);
    assert.equal(new Set(shipping.districts.map((d) => d.id)).size, 50);
    assert.equal(shipping.districts.find((d) => d.id === "150122").fee, 15);
    const revision = shipping.revision;
    for (const district of [{ id: "999999", fee: 0, enabled: true }, { id: "150101", fee: null, enabled: true }, { id: "150101", fee: -1, enabled: true }, { id: "150101", fee: 0.001, enabled: true }]) assert.equal((await request("/api/admin/shipping", { revision, districts: [district] }, "PUT")).status, 400);
    const saved = await request("/api/admin/shipping", { revision, districts: [{ id: "150101", fee: 0, enabled: true }] }, "PUT");
    assert.equal(saved.status, 200);
    assert.equal((await request("/api/admin/shipping", { revision, districts: [{ id: "150101", fee: 10, enabled: true }] }, "PUT")).status, 409);
    const body = order(); body.delivery.district_id = "150101"; body.expected_total = product.price;
    const quote = await request("/api/checkout/quote", body);
    assert.equal(quote.data.delivery_fee, 0);
    assert.equal((await request("/api/checkout/culqi", body)).data.order.total, product.price);
    body.delivery.district_id = "150102";
    assert.equal((await request("/api/checkout/quote", body)).status, 400);
    const reopened = createStore({ directory });
    assert.equal((await reopened.read("shipping")).districts.find((d) => d.id === "150101").fee, 0);
  });
  await t.test("stale shipping totals cannot charge and cross-origin payment requests fail", async () => {
    const body = order(), count = calls;
    const shipping = (await request("/api/admin/shipping", undefined, "GET")).data.shipping;
    await request("/api/admin/shipping", { revision: shipping.revision, districts: [{ id: "150122", fee: 16, enabled: true }] }, "PUT");
    assert.equal((await request("/api/checkout/culqi", body)).status, 409);
    assert.equal(calls, count);
    assert.equal((await request("/api/checkout/culqi", body, "POST", "https://invalid.example")).status, 403);
    await request("/api/admin/shipping", { revision: shipping.revision + 1, districts: [{ id: "150122", fee: 15, enabled: true }] }, "PUT");
  });
  await t.test("captured charges are successful even before the merchant bank deposit", async () => {
    const body = order();
    const paid = await request("/api/checkout/culqi", body);
    assert.equal(paid.status, 200, paid.data.message);
    assert.equal(paid.data.order.status, "completed");
    assert.equal(lastCharge.amount, Math.round(body.expected_total * 100));
    assert.equal(lastCharge.antifraud_details.device_finger_print_id, body.payment.device_id);
    const replay = await request("/api/checkout/culqi", body);
    assert.equal(replay.data.order.id, paid.data.order.id);
    const state = await request("/api/checkout/status", { request_id: body.request_id });
    assert.equal(state.data.status, "completed");
    assert.equal(state.data.order.culqi_id, paid.data.order.culqi_id);
    const stored = await createStore({ directory }).read("checkout:" + body.request_id);
    assert.ok(!JSON.stringify(stored).includes(body.payment.token_id));
    const publicConfig = await request("/api/culqi-config", undefined, "GET");
    assert.ok(!JSON.stringify(publicConfig.data).includes("sk_test"));
  });
  await t.test("3DS binds the original token, device and amount; only one authenticated charge is sent", async () => {
    mode = "3ds";
    const body = order(), count = calls;
    const result = await request("/api/checkout/culqi", body);
    assert.equal(result.data.requires_action, true);
    const resume = { ...body, payment: { ...body.payment, authentication_3DS: auth3ds } };
    assert.equal((await request("/api/checkout/culqi", { ...resume, payment: { ...resume.payment, token_id: "tkn_test_abcdefghijklmnop" } })).status, 409);
    assert.equal((await request("/api/checkout/culqi", { ...resume, expected_total: 1 })).status, 409);
    const done = await request("/api/checkout/culqi", resume);
    assert.equal(done.data.order.status, "completed");
    assert.deepEqual(lastCharge.authentication_3DS, auth3ds);
    assert.equal((await request("/api/checkout/culqi", resume)).data.order.id, done.data.order.id);
    assert.equal(calls - count, 2);
    assert.equal((await request("/api/checkout/culqi", { ...order(), payment: resume.payment })).status, 409);
    mode = "success";
  });
  await t.test("3DS cancellation and expiry do not permit resuming the old charge", async () => {
    mode = "3ds";
    const body = order(); await request("/api/checkout/culqi", body);
    assert.equal((await request("/api/checkout/cancel", { request_id: body.request_id })).data.retry_allowed, true);
    assert.equal((await request("/api/checkout/culqi", { ...body, payment: { ...body.payment, authentication_3DS: auth3ds } })).status, 409);
    const expired = order(); await request("/api/checkout/culqi", expired);
    await createStore({ directory }).update("checkout:" + expired.request_id, null, (attempt) => ({ ...attempt, expiresAt: 1 }));
    assert.equal((await request("/api/checkout/culqi", { ...expired, payment: { ...expired.payment, authentication_3DS: auth3ds } })).status, 409);
    mode = "success";
  });
  await t.test("concurrent requests charge once; rejection differs from an uncertain provider result", async () => {
    mode = "slow";
    const body = order(), count = calls;
    const results = await Promise.all([request("/api/checkout/culqi", body), request("/api/checkout/culqi", body)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal(calls, count + 1);
    mode = "rejected";
    const rejected = await request("/api/checkout/culqi", order());
    assert.equal(rejected.data.retry_allowed, true);
    mode = "uncertain";
    const uncertain = order();
    const result = await request("/api/checkout/culqi", uncertain);
    assert.equal(result.data.retry_allowed, false);
    const after = calls;
    assert.equal((await request("/api/checkout/culqi", uncertain)).status, 409);
    assert.equal(calls, after);
    const status = await request("/api/checkout/status", { request_id: uncertain.request_id });
    assert.equal(status.data.status, "pending_review");
    assert.equal((await request("/api/checkout/cancel", { request_id: uncertain.request_id })).status, 409);
    mode = "success";
  });
  await t.test("webhooks verify the charge with Culqi before confirming an uncertain payment", async () => {
    mode = "uncertain";
    const body = order(); await request("/api/checkout/culqi", body);
    const stored = await createStore({ directory }).read("checkout:" + body.request_id);
    const id = "chr_test_webhook123456789";
    const charge = { object: "charge", id, amount: Math.round(body.expected_total * 100), currency_code: "PEN", metadata: { order_id: stored.orderId }, capture: true, paid: false, outcome: { code: "succesfull_charge" } };
    const event = { type: "charge.creation.succeeded", data: JSON.stringify({ ...charge, amount: 1 }) };
    assert.equal((await request("/api/webhooks/culqi/wrong", event)).status, 404);
    charges.set(id, { ...charge, amount: 1 });
    assert.equal((await request("/api/webhooks/culqi/" + webhookSecret, event)).status, 502);
    charges.set(id, charge);
    assert.equal((await request("/api/webhooks/culqi/" + webhookSecret, event)).status, 200);
    assert.equal((await request("/api/checkout/status", { request_id: body.request_id })).data.status, "completed");
    assert.equal((await request("/api/webhooks/culqi/" + webhookSecret, event)).status, 200);
    mode = "success";
  });
  await t.test("admin reconciliation rejects another order's charge and verifies the matching one", async () => {
    mode = "uncertain";
    const body = order(); await request("/api/checkout/culqi", body);
    const stored = await createStore({ directory }).read("checkout:" + body.request_id);
    const id = "chr_test_admin12345678901";
    const charge = { object: "charge", id, amount: Math.round(body.expected_total * 100), currency_code: "PEN", metadata: { order_id: "OTHER" }, capture: true, paid: false, outcome: { type: "venta_exitosa" } };
    charges.set(id, charge);
    const route = `/api/admin/orders/${stored.orderId}/reconcile`;
    assert.equal((await request(route, { charge_id: id })).status, 409);
    charge.metadata.order_id = stored.orderId;
    assert.equal((await request(route, { charge_id: id })).data.order.status, "completed");
    assert.equal((await request("/api/checkout/status", { request_id: body.request_id })).data.status, "completed");
    mode = "success";
  });
  await t.test("invalid quote inputs and malformed JSON objects have useful validation errors", async () => {
    assert.equal((await request("/api/checkout/quote", { ...order(), customer: {} })).status, 400);
    assert.equal((await request("/api/checkout/quote", null)).status, 400);
    assert.equal((await request("/api/checkout/quote", [])).status, 400);
    const body = order(); body.customer.phone = "abcdef";
    assert.equal((await request("/api/checkout/quote", body)).status, 400);
  });
});
