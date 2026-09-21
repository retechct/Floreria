const crypto = require("node:crypto");
const { fail } = require("./catalog");
const { readJson } = require("./admin");
const { culqiConfig, culqiRequest, normalizePayment, createCharge, chargeStatus } = require("./culqi");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const requestId = (id) => { if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id || "")) fail("Actualiza la pagina antes de realizar el pago."); return id; };

function createCheckout({ store, getOrder, sendJson }) {
  const orderById = async (id) => (await store.read("orders", [])).find((order) => order.orderId === id);
  const summary = (order) => ({ id: order.orderId, subtotal: order.subtotal, delivery_fee: order.deliveryFee, total: order.total, status: order.status, culqi_id: order.culqi_id, items: order.items, delivery: order.delivery });
  async function updateOrder(id, patch) {
    const orders = await store.update("orders", [], (items) => items.map((order) => order.orderId === id ? { ...order, ...patch, status: order.status === "completed" ? "completed" : patch.status || order.status, updatedAt: new Date().toISOString() } : order));
    return orders.find((order) => order.orderId === id);
  }
  function requireOrigin(req) {
    const expected = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : `http://${req.headers.host}`;
    if (req.headers.origin !== expected) fail("Origen de solicitud no permitido.", 403);
  }
  async function limit(req) {
    const ip = process.env.VERCEL ? req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress : req.socket.remoteAddress;
    const value = await store.update(`payments-rate:${hash(String(ip))}`, { count: 0, reset: 0 }, (current) => current.reset < Date.now() ? { count: 1, reset: Date.now() + 900000 } : { ...current, count: Math.min(31, current.count + 1) });
    if (value.count > 30) fail("Demasiados intentos de pago. Espera unos minutos antes de continuar.", 429);
  }
  async function pay(req, res, body) {
    const key = `checkout:${requestId(body.request_id)}`;
    const fingerprint = hash(JSON.stringify([body.cart, body.customer, body.delivery, body.legal, body.expected_total]));
    let claimed = false, order, chargeStarted = false;
    try {
      const previous = await store.read(key);
      if (previous && previous.fingerprint !== fingerprint) fail("Este intento corresponde a otro pedido.", 409);
      if (previous) {
        order = await orderById(previous.orderId);
        if (order?.status === "completed") { sendJson(res, 200, { ok: true, order: summary(order) }); return; }
        if (previous.status !== "requires_action") fail("Este pago ya fue enviado. Consulta su estado antes de volver a pagar.", 409);
      }
      if (!culqiConfig().configured) fail("El pago con Culqi aun no esta habilitado.", 503);
      const payment = normalizePayment(body.payment);
      const sourceHash = hash(`${payment.token}:${payment.device}`);
      if (previous) {
        if (!order || previous.sourceHash !== sourceHash) fail("La verificacion debe continuar con el mismo medio de pago.", 409);
        if (previous.expiresAt < Date.now()) fail("La verificacion bancaria vencio. Cancela este intento antes de empezar otro.", 409);
        if (!payment.authentication) { sendJson(res, 200, { ok: true, requires_action: true, order_id: order.orderId }); return; }
      } else {
        if (payment.authentication) fail("Inicia el pago antes de enviar la verificacion bancaria.", 409);
        order = await getOrder(body);
        if (!Number.isFinite(body.expected_total) || Math.round(body.expected_total * 100) !== Math.round(order.total * 100)) fail("El precio del pedido cambio. Actualiza la pagina y revisa el total.", 409);
        await limit(req);
      }
      await store.update(key, null, (current) => {
        if ((!previous && current) || (previous && (current?.status !== "requires_action" || current.sourceHash !== sourceHash))) return current;
        claimed = true;
        return { ...current, fingerprint, sourceHash, orderId: order.orderId, status: "processing", expiresAt: current?.expiresAt || Date.now() + 15 * 60000 };
      });
      if (!claimed) fail("Este pago ya se esta procesando.", 409);
      if (!previous) await store.update("orders", [], (orders) => [{ ...order, status: "processing", createdAt: new Date().toISOString() }, ...orders]);
      chargeStarted = true;
      const charge = await createCharge(order, payment);
      if (charge.action_code === "REVIEW" && !payment.authentication) {
        await updateOrder(order.orderId, { status: "requires_action" });
        await store.update(key, null, (attempt) => ({ ...attempt, status: "requires_action" }));
        sendJson(res, 200, { ok: true, requires_action: true, order_id: order.orderId });
        return;
      }
      const status = chargeStatus(charge, order);
      const saved = await updateOrder(order.orderId, { status, culqi_id: charge.id });
      await store.update(key, null, (attempt) => ({ ...attempt, status: saved.status }));
      sendJson(res, 200, { ok: true, order: summary(saved) });
    } catch (error) {
      const retry = claimed && (!chargeStarted || error.rejected === true);
      if (claimed) {
        const status = retry ? "failed" : "pending_review";
        await updateOrder(order.orderId, { status }).catch(() => {});
        await store.update(key, null, (attempt) => ({ ...attempt, status })).catch(() => {});
      }
      sendJson(res, error.status || (chargeStarted ? 502 : 400), { ok: false, message: claimed && !retry ? `No pudimos confirmar el pago. Consulta su estado o contacta a la tienda con el pedido ${order.orderId} antes de volver a pagar.` : error.message, retry_allowed: Boolean(retry || (!claimed && !chargeStarted && !await store.read(key))) });
    }
  }

  async function webhook(req, res, url) {
    const secret = process.env.CULQI_WEBHOOK_SECRET || "";
    const given = url.pathname.slice("/api/webhooks/culqi/".length);
    if (secret.length < 32 || hash(secret) !== hash(given)) fail("Recurso no encontrado.", 404);
    const event = await readJson(req, 65536);
    if (event.type !== "charge.creation.succeeded") { sendJson(res, 200, { ok: true }); return; }
    let data = event.data;
    if (typeof data === "string") { try { data = JSON.parse(data); } catch { fail("Evento invalido."); } }
    if (!/^chr_(test|live)_[A-Za-z0-9]+$/.test(data?.id || "")) fail("Cargo invalido.");
    // Never trust webhook payment fields; re-read the charge using the secret key.
    const charge = await culqiRequest(`/charges/${encodeURIComponent(data.id)}`);
    const order = await orderById(charge.metadata?.order_id);
    if (order) {
      const status = chargeStatus(charge, order);
      if (status === "completed") await updateOrder(order.orderId, { status, culqi_id: charge.id });
    }
    sendJson(res, 200, { ok: true });
  }

  async function reconcile(orderId, chargeId) {
    if (typeof chargeId !== "string" || !/^chr_(test|live)_[A-Za-z0-9]{16}$/.test(chargeId)) fail("Ingresa el identificador del cargo de Culqi.");
    const order = await orderById(orderId);
    if (!order) fail("Pedido no encontrado.", 404);
    if (order.culqi_id && order.culqi_id !== chargeId) fail("El pedido ya esta vinculado a otro cargo.", 409);
    const charge = await culqiRequest(`/charges/${encodeURIComponent(chargeId)}`);
    if (charge.metadata?.order_id !== orderId) fail("El cargo no pertenece a este pedido.", 409);
    const status = chargeStatus(charge, order);
    return updateOrder(orderId, { status, culqi_id: charge.id });
  }

  async function handle(req, res, url) {
    if (req.method === "POST" && url.pathname.startsWith("/api/webhooks/culqi/")) { await webhook(req, res, url); return true; }
    if (!url.pathname.startsWith("/api/checkout/")) return false;
    if (req.method !== "POST") fail("Metodo no permitido.", 405);
    requireOrigin(req);
    const body = await readJson(req, 65536);
    if (url.pathname === "/api/checkout/quote") {
      const order = await getOrder(body);
      sendJson(res, 200, { ok: true, subtotal: order.subtotal, delivery_fee: order.deliveryFee, total: order.total, amount: Math.round(order.total * 100), currency: "PEN" });
    } else if (url.pathname === "/api/checkout/culqi") await pay(req, res, body);
    else if (["/api/checkout/status", "/api/checkout/cancel"].includes(url.pathname)) {
      const key = `checkout:${requestId(body.request_id)}`;
      let attempt = await store.read(key);
      if (!attempt) { sendJson(res, 200, { ok: true, status: "not_found", retry_allowed: true }); return true; }
      if (url.pathname.endsWith("/cancel")) {
        attempt = await store.update(key, null, (current) => {
          if (current?.status !== "requires_action") fail("El pago no se puede cancelar mientras esta en proceso.", 409);
          return { ...current, status: "cancelled" };
        });
        await updateOrder(attempt.orderId, { status: "cancelled" });
      }
      let order = await orderById(attempt.orderId);
      if (order?.culqi_id && order.status !== "completed") {
        try {
          const charge = await culqiRequest(`/charges/${encodeURIComponent(order.culqi_id)}`);
          order = await updateOrder(order.orderId, { status: chargeStatus(charge, order) });
        } catch { /* Keep uncertain payments blocked until the provider can verify them. */ }
      }
      const status = order?.status === "completed" ? "completed" : attempt.status;
      sendJson(res, 200, { ok: true, status, retry_allowed: ["failed", "cancelled"].includes(status), order: order ? summary(order) : undefined });
    } else fail("Ruta no encontrada.", 404);
    return true;
  }
  return { handle, reconcile };
}

module.exports = { createCheckout };
