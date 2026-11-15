const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { requireOrigin, rateLimit, requestAddress, securityHeaders } = require("./lib/security");
const { businessInfo } = require('./lib/business-info');
const { sendClaimReceipt, mailConfigured } = require('./lib/mailer');

const root = __dirname;

require("./lib/env").loadLocalEnv(root);

const port = Number(process.env.PORT || 3000);
const { createStore } = require("./lib/store");
const { createAdmin, readJson } = require("./lib/admin");
const { createCustomerAuth } = require("./lib/customer-auth");
const store = createStore();
const admin = createAdmin(store, { reconcilePayment: (id, chargeId) => checkout.reconcile(id, chargeId), resendOrder: id => checkout.resend(id) });
const customerAuth = createCustomerAuth(store, { readJson, admin });
const { createShipping, resolveDistrict } = require("./lib/shipping");
const { culqiConfig } = require("./lib/culqi");
const { createCheckout } = require("./lib/checkout");
const { createSettings } = require("./lib/settings");
const { seedCatalog } = require('./lib/catalog');
const shipping = createShipping(store);
const settings = createSettings(store);
const seo = require("./lib/seo").createSeo({ getCatalog: admin.getCatalog, getSettings: settings.get, viewsDirectory: path.join(root, "views") });
async function reserveStock(order, requestId) {
  await store.update('catalog', seedCatalog(), catalog => {
    catalog.stockReservations ||= {};
    if (catalog.stockReservations[requestId]) return catalog;
    const trackedItems = [];
    for (const item of order.items) {
      const product = catalog.products.find(product => product.id === item.id);
      if (!product || product.status !== 'published' || product.available === false || product.stock === 0) throw Object.assign(new Error(`${item.name} ya no tiene disponibilidad.`), { status: 409 });
      if (product.stock !== null && product.stock !== undefined && product.stock < item.qty) throw Object.assign(new Error(`Solo quedan ${product.stock} unidades de ${item.name}.`), { status: 409 });
      if (product.stock !== null && product.stock !== undefined) trackedItems.push({ product, id: item.id, qty: item.qty });
    }
    if (!trackedItems.length) return catalog;
    for (const item of trackedItems) {
      item.product.stock -= item.qty;
      if (item.product.stock === 0) item.product.available = false;
    }
    catalog.stockReservations[requestId] = trackedItems.map(({ id, qty }) => ({ id, qty }));
    catalog.revision = Number(catalog.revision || 0) + 1;
    return catalog;
  });
}
async function finishStock(requestId, release = false) {
  await store.update('catalog', seedCatalog(), catalog => {
    const reservation = catalog.stockReservations?.[requestId];
    if (!reservation) return catalog;
    if (release) for (const item of reservation) {
      const product = catalog.products.find(product => product.id === item.id);
      if (product?.stock !== null && product?.stock !== undefined) { product.stock += item.qty; product.available = true; }
    }
    delete catalog.stockReservations[requestId];
    catalog.revision = Number(catalog.revision || 0) + 1;
    return catalog;
  });
}
const checkout = createCheckout({ store, sendJson, reserveStock, finishStock, getOrder: async (body, req) => {
  const mode = await settings.get();
  if (mode.salesEnabled === false) {
    const error = new Error("La tienda esta en modo cotizacion. Escríbenos por WhatsApp para confirmar disponibilidad.");
    error.status = 503;
    throw error;
  }
  const catalog = await admin.getCatalog();
  const rates = await shipping.get();
  try { return normalizeOrder(body, catalog, rates, await customerAuth.currentUser(req)); }
  catch (error) { error.status ||= 400; throw error; }
} });

const customBasePrices = {
  ramo: 45,
  box: 60,
  preservado: 55,
  premium: 95,
};

const customAdditionPrices = {
  topper: 12,
  ferrero: 18,
  peluche: 25,
  globo: 20,
  vino: 35,
};

const staticTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
]);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, details = null) {
  sendJson(res, status, { ok: false, message, details });
}

const readBody = readJson;

function cleanText(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}
function limaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
function addBusinessDays(date, days) {
  const result = new Date(date);
  for (let added = 0; added < days;) { result.setUTCDate(result.getUTCDate() + 1); if (![0, 6].includes(result.getUTCDay())) added++; }
  return result.toISOString();
}

function positiveQty(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
    throw new Error("Cantidad invalida en el carrito.");
  }
  return qty;
}

function customPrice(custom) {
  if (custom?.admin_promotion === true) {
    throw new Error("Actualiza el carrito para usar el precio publicado de esta promocion.");
  }

  const builder = custom?.builder || {};
  const base = cleanText(builder.base, 30);
  const stems = Number(builder.stems);
  const additions = Array.isArray(builder.additions) ? builder.additions : [];
  if (additions.length > 5 || new Set(additions).size !== additions.length) throw new Error("Seleccion de extras invalida.");

  if (!Object.prototype.hasOwnProperty.call(customBasePrices, base)) {
    throw new Error("El diseno personalizado no tiene una base valida.");
  }
  if (!Number.isInteger(stems) || stems < 1 || stems > 40) {
    throw new Error("El diseno personalizado tiene una cantidad invalida de flores.");
  }
  for (const addition of additions) {
    if (!Object.prototype.hasOwnProperty.call(customAdditionPrices, addition)) {
      throw new Error("El diseno personalizado tiene un extra invalido.");
    }
  }
  return customBasePrices[base] + stems * 7 + additions.reduce((sum, item) => sum + customAdditionPrices[item], 0);
}

function normalizeCart(cart, catalog) {
  if (!Array.isArray(cart) || !cart.length || cart.length > 100) {
    throw new Error("El carrito esta vacio.");
  }

  let subtotal = 0;
  const productMap = new Map(catalog.products.filter((p) => p.status === "published").map((p) => [p.id, p]));
  const items = cart.map((line) => {
    const qty = positiveQty(line.qty);
    if (line.custom) throw new Error("Los arreglos personalizados requieren una cotizacion aprobada por la tienda.");

    const product = productMap.get(cleanText(line.id, 80));
    if (!product || !product.available) {
      throw new Error("Un producto del carrito ya no esta disponible. Actualiza tu carrito.");
    }
    subtotal += product.price * qty;
    return {
      id: product.id,
      name: product.name,
      qty,
      unit_price: product.price,
      line_total: Number((product.price * qty).toFixed(2)),
      note: cleanText(line.note, 1000),
    };
  });

  return { items, subtotal: Number(subtotal.toFixed(2)) };
}

function normalizeOrder(body, catalog, shipping, currentUser = null) {
  const customer = body.customer || {};
  const delivery = body.delivery || {};
  const legal = body.legal || {};
  const { items, subtotal } = normalizeCart(body.cart, catalog);

  const firstName = cleanText(customer.first_name, 80);
  const lastName = cleanText(customer.last_name, 80);
  const email = cleanText(customer.email, 120);
  if (email.length > 50) throw new Error("El correo admite hasta 50 caracteres para el pago.");
  const phone = cleanText(customer.phone, 40).replace(/[\s()+-]/g, "");
  const district = resolveDistrict(shipping, delivery);

  if (!firstName || !lastName || !email || !phone) {
    throw new Error("Completa los datos del cliente.");
  }
  if (firstName.length < 2 || firstName.length > 50 || lastName.length < 2 || lastName.length > 50) throw new Error("Nombres y apellidos deben tener entre 2 y 50 caracteres.");
  if (!/^\d{7,15}$/.test(phone)) throw new Error("Escribe un telefono de contacto valido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Escribe un correo electronico valido.");
  const now = limaDateParts();
  const today = `${now.year}-${now.month}-${now.day}`;
  const tomorrow = new Date(`${today}T12:00:00-05:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minimumDate = Number(now.hour) >= 22 ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow) : today;
  const date = new Date(`${delivery.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(delivery.date || "") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== delivery.date || delivery.date < minimumDate) throw new Error(Number(now.hour) >= 22 ? "Despues de las 10 p. m. selecciona una entrega desde el dia siguiente." : "Selecciona una fecha de entrega vigente.");
  if (!["09:00 - 12:00", "12:00 - 15:00", "15:00 - 18:00", "18:00 - 20:00", "20:00 - 22:00"].includes(delivery.slot)) throw new Error("Selecciona un horario disponible.");
  const startTime = delivery.slot.slice(0, 5);
  const slotStart = new Date(`${delivery.date}T${startTime}:00-05:00`).getTime();
  const leadMinutes = Math.max(0, Math.min(1440, Number(process.env.DELIVERY_MIN_LEAD_MINUTES || 120)));
  if (!Number.isFinite(slotStart) || slotStart < Date.now() + leadMinutes * 60000) throw new Error(`Selecciona un horario con al menos ${leadMinutes} minutos de anticipacion.`);
  if (!cleanText(delivery.recipient, 100) || !cleanText(delivery.recipient_phone, 40)) throw new Error("Completa los datos de quien recibe el pedido.");
  if (!/^\d{7,15}$/.test(cleanText(delivery.recipient_phone, 40).replace(/[\s()+-]/g, ""))) throw new Error("Escribe un telefono valido de quien recibe el pedido.");
  if (!cleanText(delivery.address, 180) || !cleanText(delivery.date, 30) || !cleanText(delivery.slot, 40)) {
    throw new Error("Completa fecha, horario y direccion de entrega.");
  }
  if (legal.accepted_terms !== true) {
    throw new Error("Acepta las politicas de compra, privacidad y reclamos antes de pagar.");
  }
  const deliveryFee = district.fee;
  const total = Number((subtotal + deliveryFee).toFixed(2));
  if (total < 3 || total > 9999) throw new Error("El importe por pedido debe estar entre S/ 3.00 y S/ 9,999.00.");
  const receiptInput = body.receipt || {};
  const receiptType = receiptInput.type === 'invoice' ? 'invoice' : 'receipt';
  if (receiptType === 'invoice' && process.env.BUSINESS_INVOICE_ENABLED !== 'true') throw new Error('La factura no esta habilitada para este negocio. Selecciona boleta.');
  const documentType = cleanText(receiptInput.document_type, 20).toUpperCase();
  const documentNumber = cleanText(receiptInput.document_number, 20).replace(/\s/g, '');
  const legalName = cleanText(receiptInput.legal_name, 160);
  const fiscalAddress = cleanText(receiptInput.fiscal_address, 180);
  if (receiptType === 'invoice' && (!/^\d{11}$/.test(documentNumber) || !legalName || !fiscalAddress)) throw new Error('Completa RUC, razon social y domicilio fiscal para la factura.');
  if (receiptType === 'receipt' && documentNumber && !['DNI', 'CE', 'PASAPORTE', 'RUC'].includes(documentType)) throw new Error('Selecciona un tipo de documento valido para la boleta.');
  if (receiptType === 'receipt' && documentType === 'DNI' && !/^\d{8}$/.test(documentNumber)) throw new Error('El DNI debe tener 8 digitos.');
  if (receiptType === 'receipt' && total > 700 && !documentNumber) throw new Error('Indica el documento del comprador para una boleta mayor a S/ 700.');

  const orderId = `RSLA-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  return {
    orderId,
    items,
    subtotal,
    deliveryFee,
    total,
    customer: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
    },
    delivery: {
      recipient: cleanText(delivery.recipient, 100),
      recipient_phone: cleanText(delivery.recipient_phone, 40),
      date: cleanText(delivery.date, 30),
      slot: cleanText(delivery.slot, 40),
      district: district.name,
      district_id: district.id,
      province: district.province,
      address: cleanText(delivery.address, 180),
      reference: cleanText(delivery.reference, 180),
      dedication: cleanText(delivery.dedication, 240),
    },
    legal: {
      accepted_terms: true,
      accepted_at: new Date().toISOString(),
    },
    customerId: currentUser?.id || null,
    accessToken: crypto.randomBytes(24).toString('base64url'),
    fulfillmentStatus: 'received',
    receipt: {
      type: receiptType,
      status: 'pending',
      documentType: receiptType === 'invoice' ? 'RUC' : documentType,
      documentNumber,
      legalName: receiptType === 'invoice' ? legalName : `${firstName} ${lastName}`,
      fiscalAddress: receiptType === 'invoice' ? fiscalAddress : '',
      email,
    },
    notifications: { purchase: mailConfigured() ? 'pending' : 'not_configured' },
    financial: { status: 'payment_pending', reference: '', note: '' },
  };
}

function normalizeClaim(body) {
  const type = cleanText(body.type, 20).toLowerCase();
  const validTypes = new Set(["reclamo", "queja"]);
  if (!validTypes.has(type)) {
    throw Object.assign(new Error("Selecciona si es reclamo o queja."), { status: 400 });
  }

  const consumerName = cleanText(body.consumer_name, 120);
  const documentType = cleanText(body.document_type, 20).toUpperCase();
  const documentNumber = cleanText(body.document_number, 20);
  const email = cleanText(body.email, 120);
  const phone = cleanText(body.phone, 40);
  const product = cleanText(body.product, 160);
  const detail = cleanText(body.detail, 1000);
  const request = cleanText(body.request, 600);
  const isMinor = body.is_minor === true || body.is_minor === 'on';
  const representativeName = cleanText(body.representative_name, 120);
  const representativeDocument = cleanText(body.representative_document, 20);
  const requestId = cleanText(body.request_id, 80);
  if (requestId && !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) throw Object.assign(new Error('La referencia de envio no es valida.'), { status: 400 });

  if (!consumerName || !documentType || !documentNumber || !email || !phone) {
    throw Object.assign(new Error("Completa los datos de identificacion del consumidor."), { status: 400 });
  }
  if (!['DNI', 'CE', 'PASAPORTE', 'RUC'].includes(documentType)) throw Object.assign(new Error('Selecciona un tipo de documento valido.'), { status: 400 });
  if (documentType === 'DNI' && !/^\d{8}$/.test(documentNumber)) throw Object.assign(new Error('El DNI debe tener 8 digitos.'), { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Escribe un correo electronico valido.'), { status: 400 });
  if (!/^\+?[\d\s()-]{7,25}$/.test(phone)) throw Object.assign(new Error('Escribe un telefono valido.'), { status: 400 });
  if (!product || !detail || !request) {
    throw Object.assign(new Error("Completa producto/servicio, detalle y pedido concreto."), { status: 400 });
  }
  if (isMinor && (!representativeName || !representativeDocument)) {
    throw Object.assign(new Error("Completa los datos del padre, madre o representante del menor."), { status: 400 });
  }
  if (body.accepted_privacy !== true) {
    throw Object.assign(new Error("Acepta el tratamiento de datos para registrar el reclamo."), { status: 400 });
  }

  return {
    type,
    request_id: requestId || crypto.randomUUID(),
    created_at: new Date().toISOString(),
    business: businessInfo(),
    consumer: {
      name: consumerName,
      document_type: documentType,
      document_number: documentNumber,
      email,
      phone,
      address: cleanText(body.address, 180),
      is_minor: isMinor,
      representative: isMinor ? { name: representativeName, document_number: representativeDocument } : null,
    },
    claim: {
      order_ref: cleanText(body.order_ref, 80),
      product,
      amount: cleanText(body.amount, 40),
      detail,
      request,
    },
    status: "recibido",
    response_due_at: addBusinessDays(new Date(), 15),
    response: '',
  };
}

async function saveClaim(record) {
  let saved;
  await store.update("claims", [], (records) => {
    const existing = records.find(item => item.request_id === record.request_id);
    if (existing) { saved = existing; return records; }
    const year = Number(limaDateParts().year);
    const maximum = records.reduce((max, item) => {
      const match = String(item.code || '').match(new RegExp(`^REC-${year}-(\\d{6})$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    saved = { ...record, code: `REC-${year}-${String(maximum + 1).padStart(6, '0')}` };
    return [saved, ...records];
  });
  return saved;
}

async function handleClaim(req, res) {
  try {
    requireOrigin(req);
    await rateLimit(store, 'claims', requestAddress(req), 5, 60 * 60 * 1000);
    const body = await readBody(req, 16 * 1024);
    if (body.website) return sendError(res, 400, "No se pudo registrar la solicitud.");
    let record = await saveClaim(normalizeClaim(body));
    let emailStatus = mailConfigured() ? 'failed' : 'not_configured';
    if (mailConfigured()) {
      try { await sendClaimReceipt(record); emailStatus = 'sent'; }
      catch { console.error('No se pudo entregar una copia de la reclamacion.'); }
    }
    await store.update('claims', [], records => records.map(item => item.code === record.code ? { ...item, emailStatus } : item));
    record = { ...record, emailStatus };
    sendJson(res, 200, {
      ok: true,
      code: record.code,
      created_at: record.created_at,
      response_deadline: "15 dias habiles",
      message: "Hemos registrado tu hoja de reclamacion.",
      claim: record,
      email_status: emailStatus,
    });
  } catch (error) {
    if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
    sendError(res, error.status || 500, error.status ? error.message : "No pudimos registrar la reclamacion. Intenta nuevamente en unos minutos.", error.status ? error.details || null : null);
  }
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname === "/personalizar.html") {
    res.writeHead(302, { Location: "/catalogo.html" });
    res.end();
    return;
  }
  if (pathname.includes("\0") || pathname.includes("..")) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  const segments = pathname.split("/").filter(Boolean);
  const publicFile = segments.length === 1 && /^[a-z0-9-]+\.html$/.test(segments[0]);
  const publicAsset = ["assets", "public"].includes(segments[0]) && staticTypes.has(path.extname(pathname).toLowerCase());
  if (segments.some((segment) => segment.startsWith(".")) || !(publicFile || publicAsset)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const filePath = path.join(root, pathname);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const type = staticTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
    const immutableFont = pathname.startsWith('/assets/fonts/') && pathname.endsWith('.woff2');
    const cache = immutableFont ? 'public, max-age=31536000, immutable' : 'public, max-age=300, must-revalidate';
    const etag = `"${crypto.createHash('sha256').update(content).digest('hex').slice(0, 24)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { 'Cache-Control': cache, ETag: etag });
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": type, "Cache-Control": cache, ETag: etag });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}

async function routeRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (await seo.handle(req, res, url)) return;
  if (await customerAuth.handle(req, res, url)) return;
  if (await admin.handle(req, res, url)) return;
  if (await checkout.handle(req, res, url)) return;
  if (req.method === "GET" && url.pathname === "/api/shipping") {
    sendJson(res, 200, { ok: true, ...await shipping.get() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    try {
      await store.check();
      const catalog = await admin.getCatalog();
      if (!Array.isArray(catalog.products)) throw new Error('Catalogo no disponible.');
      sendJson(res, 200, { ok: true, storage: store.mode, catalog: true });
    } catch { sendError(res, 503, 'La tienda no esta disponible temporalmente.'); }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/culqi-config") {
    const config = culqiConfig();
    sendJson(res, 200, { ok: true, public_key: config.publicKey, sandbox: config.mode === "test", configured: config.configured, currency: "PEN", invoice_enabled: process.env.BUSINESS_INVOICE_ENABLED === 'true', delivery_cutoff_hour: 22, delivery_min_lead_minutes: Math.max(0, Math.min(1440, Number(process.env.DELIVERY_MIN_LEAD_MINUTES || 120))) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/business-info") {
    sendJson(res, 200, { ok: true, business: businessInfo() });
    return;
  }


  if (req.method === "POST" && url.pathname === "/api/reclamaciones") {
    await handleClaim(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendError(res, 405, "Metodo no permitido.");
    return;
  }

  serveStatic(req, res, url);
}

function handler(req, res) {
  securityHeaders(req, res);
  if (req.url.startsWith("/api/admin") || req.url.startsWith("/admin")) res.setHeader("X-Robots-Tag", "noindex, nofollow");
  routeRequest(req, res).catch((error) => {
    if (error.retryAfter && !res.headersSent) res.setHeader('Retry-After', String(error.retryAfter));
    if (!res.headersSent) sendError(res, error.status || 500, error.status ? error.message : "No pudimos completar la solicitud. Revisa la configuracion del servidor.");
    else res.end();
  });
}

if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(port, () => {
    console.log(`La Casa de las Flores Atelier listo en http://localhost:${port}`);
  });
}

module.exports = handler;
