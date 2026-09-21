const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;

require("./lib/env").loadLocalEnv(root);

const port = Number(process.env.PORT || 3000);
const { createStore } = require("./lib/store");
const { createAdmin, readJson } = require("./lib/admin");
const store = createStore();
const admin = createAdmin(store, { reconcilePayment: (id, chargeId) => checkout.reconcile(id, chargeId) });
const { createShipping, resolveDistrict } = require("./lib/shipping");
const { culqiConfig } = require("./lib/culqi");
const { createCheckout } = require("./lib/checkout");
const { createSettings } = require("./lib/settings");
const shipping = createShipping(store);
const settings = createSettings(store);
const checkout = createCheckout({ store, sendJson, getOrder: async (body) => {
  const mode = await settings.get();
  if (mode.salesEnabled === false) {
    const error = new Error("La tienda esta en modo cotizacion. Escríbenos por WhatsApp para confirmar disponibilidad.");
    error.status = 503;
    throw error;
  }
  const catalog = await admin.getCatalog();
  const rates = await shipping.get();
  try { return normalizeOrder(body, catalog, rates); }
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

function businessInfo() {
  return {
    commercialName: process.env.BUSINESS_COMMERCIAL_NAME || "La Casa de las Flores Atelier",
    legalName: process.env.BUSINESS_LEGAL_NAME || "MARCAS VILLAVICENCIO OLGA",
    ruc: process.env.BUSINESS_RUC || "10460325817",
    fiscalAddress: process.env.BUSINESS_ADDRESS || "",
    email: process.env.BUSINESS_EMAIL || "",
    claimsEmail: process.env.BUSINESS_CLAIMS_EMAIL || process.env.BUSINESS_EMAIL || "",
    phone: process.env.BUSINESS_PHONE || "51947370668",
  };
}

const readBody = readJson;

function cleanText(value, max = 180) {
  return String(value || "").trim().slice(0, max);
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
    if (line.custom) {
      if (productMap.has(cleanText(line.id, 80))) throw new Error("No se puede cambiar el precio de un producto con datos personalizados.");
      const price = customPrice(line.custom);
      subtotal += price * qty;
      return {
        id: cleanText(line.id || line.custom.id, 80),
        name: cleanText(line.custom.name || "Diseno personalizado", 120),
        qty,
        unit_price: price,
        line_total: price * qty,
        note: cleanText(line.note, 1000),
        custom: {
          builder: {
            base: cleanText(line.custom.builder.base, 30),
            stems: Number(line.custom.builder.stems),
            color: cleanText(line.custom.builder.color, 40),
            message: cleanText(line.custom.builder.message, 250),
            additions: Array.isArray(line.custom.builder.additions) ? line.custom.builder.additions : [],
          },
          description: cleanText(line.custom.description, 240),
        },
      };
    }

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

function normalizeOrder(body, catalog, shipping) {
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
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${delivery.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(delivery.date || "") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== delivery.date || delivery.date < today) throw new Error("Selecciona una fecha de entrega vigente.");
  if (!["09:00 - 12:00", "12:00 - 15:00", "15:00 - 18:00", "18:00 - 20:00"].includes(delivery.slot)) throw new Error("Selecciona un horario disponible.");
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
  };
}

function normalizeClaim(body) {
  const type = cleanText(body.type, 20).toLowerCase();
  const validTypes = new Set(["reclamo", "queja"]);
  if (!validTypes.has(type)) {
    throw new Error("Selecciona si es reclamo o queja.");
  }

  const consumerName = cleanText(body.consumer_name, 120);
  const documentType = cleanText(body.document_type, 20);
  const documentNumber = cleanText(body.document_number, 20);
  const email = cleanText(body.email, 120);
  const phone = cleanText(body.phone, 40);
  const product = cleanText(body.product, 160);
  const detail = cleanText(body.detail, 1000);
  const request = cleanText(body.request, 600);

  if (!consumerName || !documentType || !documentNumber || !email || !phone) {
    throw new Error("Completa los datos de identificacion del consumidor.");
  }
  if (!product || !detail || !request) {
    throw new Error("Completa producto/servicio, detalle y pedido concreto.");
  }
  if (body.accepted_privacy !== true) {
    throw new Error("Acepta el tratamiento de datos para registrar el reclamo.");
  }

  const code = `LR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  return {
    code,
    type,
    created_at: new Date().toISOString(),
    business: businessInfo(),
    consumer: {
      name: consumerName,
      document_type: documentType,
      document_number: documentNumber,
      email,
      phone,
      address: cleanText(body.address, 180),
    },
    claim: {
      order_ref: cleanText(body.order_ref, 80),
      product,
      amount: cleanText(body.amount, 40),
      detail,
      request,
    },
    status: "recibido",
  };
}

async function saveClaim(record) {
  await store.update("claims", [], (records) => [record, ...records]);
}

async function handleClaim(req, res) {
  try {
    const body = await readBody(req);
    const record = normalizeClaim(body);
    await saveClaim(record);
    sendJson(res, 200, {
      ok: true,
      code: record.code,
      created_at: record.created_at,
      response_deadline: "15 dias habiles",
      message: "Hemos registrado tu hoja de reclamacion.",
    });
  } catch (error) {
    sendError(res, error.status || 400, error.message, error.details || null);
  }
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
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
    res.writeHead(200, { "Content-Type": type });
    res.end(req.method === "HEAD" ? undefined : content);
  });
}

async function routeRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (await admin.handle(req, res, url)) return;
  if (await checkout.handle(req, res, url)) return;
  if (req.method === "GET" && url.pathname === "/api/shipping") {
    sendJson(res, 200, { ok: true, ...await shipping.get() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    await store.init();
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/culqi-config") {
    const config = culqiConfig();
    sendJson(res, 200, { ok: true, public_key: config.publicKey, sandbox: config.mode === "test", configured: config.configured, currency: "PEN" });
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (req.url.startsWith("/api/admin") || req.url.startsWith("/admin.html")) res.setHeader("X-Robots-Tag", "noindex, nofollow");
  routeRequest(req, res).catch((error) => {
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
