const crypto = require("node:crypto");
const { fail } = require("./catalog");
const { readJson } = require("./admin");
const { culqiConfig, culqiRequest, normalizePayment, createCharge, chargeStatus } = require("./culqi");
const { mailConfigured, sendOrderConfirmation } = require('./mailer');
const { requestAddress } = require('./security');
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const requestId = (id) => { if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id || "")) fail("Actualiza la pagina antes de realizar el pago."); return id; };

function createCheckout({ store, getOrder, sendJson, reserveStock = async () => {}, finishStock = async () => {} }) {
  const orderById = async (id) => (await store.read("orders", [])).find((order) => order.orderId === id);
  const summary = (order) => ({ id: order.orderId, subtotal: order.subtotal, delivery_fee: order.deliveryFee, total: order.total, status: order.status, fulfillment_status: order.fulfillmentStatus || 'received', culqi_id: order.culqi_id, items: order.items, delivery: order.delivery, receipt: order.receipt ? { type: order.receipt.type, status: order.receipt.status, series: order.receipt.series, number: order.receipt.number, issuedAt: order.receipt.issuedAt, downloadUrl: order.receipt.downloadUrl } : null });
  async function updateOrder(id, patch) {
    const orders = await store.update("orders", [], (items) => items.map((order) => {
      if (order.orderId !== id) return order;
      const status = order.status === 'completed' ? 'completed' : patch.status || order.status;
      const financial = status === 'completed' && (!order.financial || order.financial.status === 'payment_pending') ? { status: 'paid', reference: order.culqi_id || patch.culqi_id || '', note: '', updatedAt: new Date().toISOString() } : order.financial;
      return { ...order, ...patch, status, financial, updatedAt: new Date().toISOString() };
    }));
    return orders.find((order) => order.orderId === id);
  }
  async function notifyCompleted(order) {
    if (!order || order.status !== 'completed' || !mailConfigured()) return order;
    let claimed = false;
    const selected = await store.update('orders', [], orders => orders.map(item => {
      const recentlySending = item.notifications?.purchase === 'sending' && Date.now() - Date.parse(item.notifications?.purchaseSendingAt || 0) < 5 * 60 * 1000;
      if (item.orderId !== order.orderId || item.notifications?.purchase === 'sent' || recentlySending) return item;
      claimed = true;
      return { ...item, notifications: { ...item.notifications, purchase: 'sending', purchaseSendingAt: new Date().toISOString() } };
    }));
    const current = selected.find(item => item.orderId === order.orderId) || order;
    if (!claimed) return current;
    try {
      await sendOrderConfirmation(current);
      return updateOrder(order.orderId, { notifications: { ...current.notifications, purchase: 'sent', purchaseSentAt: new Date().toISOString() } });
    } catch {
      console.error('No se pudo entregar una confirmación de pedido. Revisa el proveedor.');
      return updateOrder(order.orderId, { notifications: { ...current.notifications, purchase: 'failed' } });
    }
  }
  function requireOrigin(req) {
    const expected = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : `http://${req.headers.host}`;
    if (req.headers.origin !== expected) fail("Origen de solicitud no permitido.", 403);
  }
  async function limit(req) {
    const ip = requestAddress(req);
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
        if (previous.expiresAt < Date.now()) { await finishStock(body.request_id, true); fail("La verificacion bancaria vencio. Inicia un intento nuevo.", 409); }
        if (!payment.authentication) { sendJson(res, 200, { ok: true, requires_action: true, order_id: order.orderId }); return; }
      } else {
        if (payment.authentication) fail("Inicia el pago antes de enviar la verificacion bancaria.", 409);
        order = await getOrder(body, req);
        if (!Number.isFinite(body.expected_total) || Math.round(body.expected_total * 100) !== Math.round(order.total * 100)) fail("El precio del pedido cambio. Actualiza la pagina y revisa el total.", 409);
        await limit(req);
      }
      await store.update(key, null, (current) => {
        if ((!previous && current) || (previous && (current?.status !== "requires_action" || current.sourceHash !== sourceHash))) return current;
        claimed = true;
        return { ...current, fingerprint, sourceHash, orderId: order.orderId, status: "processing", expiresAt: current?.expiresAt || Date.now() + 15 * 60000 };
      });
      if (!claimed) fail("Este pago ya se esta procesando.", 409);
      if (!previous) {
        await reserveStock(order, body.request_id);
        order.requestId = body.request_id;
        await store.update("orders", [], (orders) => [{ ...order, status: "processing", createdAt: new Date().toISOString() }, ...orders]);
      }
      chargeStarted = true;
      const charge = await createCharge(order, payment);
      if (charge.action_code === "REVIEW" && !payment.authentication) {
        await updateOrder(order.orderId, { status: "requires_action" });
        await store.update(key, null, (attempt) => ({ ...attempt, status: "requires_action" }));
        sendJson(res, 200, { ok: true, requires_action: true, order_id: order.orderId });
        return;
      }
      const status = chargeStatus(charge, order);
      let saved = await updateOrder(order.orderId, { status, culqi_id: charge.id });
      if (status === 'completed') await finishStock(body.request_id, false);
      await store.update(key, null, (attempt) => ({ ...attempt, status: saved.status }));
      if (saved.status === 'completed') saved = await notifyCompleted(saved);
      sendJson(res, 200, { ok: true, order: summary(saved) });
    } catch (error) {
      const retry = claimed && (!chargeStarted || error.rejected === true);
      if (claimed) {
        const status = retry ? "failed" : "pending_review";
        if (retry) await finishStock(body.request_id, true).catch(() => {});
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
      if (status === "completed") {
        if (order.requestId) await finishStock(order.requestId, false);
        await notifyCompleted(await updateOrder(order.orderId, { status, culqi_id: charge.id }));
      }
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
    const saved = await updateOrder(orderId, { status, culqi_id: charge.id });
    if (status === 'completed' && order.requestId) await finishStock(order.requestId, false);
    return status === 'completed' ? notifyCompleted(saved) : saved;
  }

  async function handle(req, res, url) {
    if (req.method === "POST" && url.pathname.startsWith("/api/webhooks/culqi/")) { await webhook(req, res, url); return true; }
    if (!url.pathname.startsWith("/api/checkout/")) return false;
    if (req.method !== "POST") fail("Metodo no permitido.", 405);
    requireOrigin(req);
    const body = await readJson(req, 65536);
    if (url.pathname === '/api/checkout/order') {
      const orderId = String(body.order_id || '');
      const token = String(body.access_token || '');
      if (!/^RSLA-[A-Z0-9-]+$/.test(orderId) || !/^[A-Za-z0-9_-]{32}$/.test(token)) fail('No se pudo consultar el pedido.', 404);
      const order = await orderById(orderId);
      if (!order?.accessToken || hash(order.accessToken) !== hash(token)) fail('No se pudo consultar el pedido.', 404);
      sendJson(res, 200, { ok: true, order: summary(order) });
    } else if (url.pathname === "/api/checkout/quote") {
      const order = await getOrder(body, req);
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
        await finishStock(body.request_id, true);
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
  async function resend(orderId) {
    const order = await orderById(orderId);
    if (!order) fail('Pedido no encontrado.', 404);
    if (order.status !== 'completed') fail('El pago aun no esta confirmado.', 409);
    await updateOrder(orderId, { notifications: { ...order.notifications, purchase: 'pending' } });
    return notifyCompleted(await orderById(orderId));
  }
  return { handle, reconcile, resend };
}

module.exports = { createCheckout };
