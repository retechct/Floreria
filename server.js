const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;

function loadLocalEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const port = Number(process.env.PORT || 3000);
const catalog = JSON.parse(fs.readFileSync(path.join(root, "data", "products.json"), "utf8"));
const productMap = new Map(catalog.map((product) => [product.id, product]));

const districts = new Map([
  ["San Isidro", 15],
  ["Miraflores", 15],
  ["Surco", 25],
  ["San Borja", 20],
  ["La Molina", 25],
  ["Barranco", 18],
  ["Jesus Maria", 18],
  ["Lince", 18],
]);

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

function openpayConfig() {
  const sandbox = String(process.env.OPENPAY_SANDBOX || "true") !== "false";
  const country = process.env.OPENPAY_COUNTRY || "PE";
  const apiBase = process.env.OPENPAY_API_BASE || (sandbox
    ? "https://sandbox-api.openpay.pe/v1"
    : "https://api.openpay.pe/v1");
  return {
    merchantId: process.env.OPENPAY_MERCHANT_ID || "",
    publicKey: process.env.OPENPAY_PUBLIC_KEY || "",
    privateKey: process.env.OPENPAY_PRIVATE_KEY || "",
    sandbox,
    country,
    currency: process.env.OPENPAY_CURRENCY || "PEN",
    apiBase: apiBase.replace(/\/$/, ""),
  };
}

function businessInfo() {
  return {
    commercialName: process.env.BUSINESS_COMMERCIAL_NAME || "La Casa de las Flores",
    legalName: process.env.BUSINESS_LEGAL_NAME || "",
    ruc: process.env.BUSINESS_RUC || "",
    fiscalAddress: process.env.BUSINESS_ADDRESS || "",
    email: process.env.BUSINESS_EMAIL || "",
    claimsEmail: process.env.BUSINESS_CLAIMS_EMAIL || process.env.BUSINESS_EMAIL || "",
    phone: process.env.BUSINESS_PHONE || "51947370668",
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("El pedido es demasiado grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

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
  const builder = custom?.builder || {};
  const base = cleanText(builder.base, 30);
  const stems = Number(builder.stems);
  const additions = Array.isArray(builder.additions) ? builder.additions : [];

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

function normalizeCart(cart) {
  if (!Array.isArray(cart) || !cart.length) {
    throw new Error("El carrito esta vacio.");
  }

  let subtotal = 0;
  const items = cart.map((line) => {
    const qty = positiveQty(line.qty);
    if (line.custom) {
      const price = customPrice(line.custom);
      subtotal += price * qty;
      return {
        id: cleanText(line.id || line.custom.id, 80),
        name: cleanText(line.custom.name || "Diseno personalizado", 120),
        qty,
        unit_price: price,
        line_total: price * qty,
        note: cleanText(line.note, 180),
        custom: {
          builder: line.custom.builder,
          description: cleanText(line.custom.description, 240),
        },
      };
    }

    const product = productMap.get(cleanText(line.id, 80));
    if (!product) {
      throw new Error("Un producto del carrito ya no existe.");
    }
    subtotal += product.price * qty;
    return {
      id: product.id,
      name: product.name,
      qty,
      unit_price: product.price,
      line_total: product.price * qty,
      note: cleanText(line.note, 180),
    };
  });

  return { items, subtotal };
}

function normalizeOrder(body) {
  const customer = body.customer || {};
  const delivery = body.delivery || {};
  const payment = body.payment || {};
  const legal = body.legal || {};
  const { items, subtotal } = normalizeCart(body.cart);

  const firstName = cleanText(customer.first_name, 80);
  const lastName = cleanText(customer.last_name, 80);
  const email = cleanText(customer.email, 120);
  const phone = cleanText(customer.phone, 40);
  const district = cleanText(delivery.district, 80);

  if (!firstName || !lastName || !email || !phone) {
    throw new Error("Completa los datos del cliente.");
  }
  if (!districts.has(district)) {
    throw new Error("Selecciona un distrito disponible.");
  }
  if (!cleanText(delivery.address, 180) || !cleanText(delivery.date, 30) || !cleanText(delivery.slot, 40)) {
    throw new Error("Completa fecha, horario y direccion de entrega.");
  }
  if (!cleanText(payment.token_id, 120) || !cleanText(payment.device_session_id, 180)) {
    throw new Error("Openpay no devolvio token o device session.");
  }
  if (legal.accepted_terms !== true) {
    throw new Error("Acepta las politicas de compra, privacidad y reclamos antes de pagar.");
  }

  const deliveryFee = districts.get(district);
  const total = Number((subtotal + deliveryFee).toFixed(2));
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
      district,
      address: cleanText(delivery.address, 180),
      reference: cleanText(delivery.reference, 180),
      dedication: cleanText(delivery.dedication, 240),
    },
    payment: {
      token_id: cleanText(payment.token_id, 120),
      device_session_id: cleanText(payment.device_session_id, 180),
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

function saveClaim(record) {
  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.appendFileSync(path.join(dataDir, "reclamaciones.jsonl"), `${JSON.stringify(record)}\n`, "utf8");
}

async function handleClaim(req, res) {
  try {
    const body = await readBody(req);
    const record = normalizeClaim(body);
    saveClaim(record);
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

async function createOpenpayCharge(order) {
  const config = openpayConfig();
  if (!config.merchantId || !config.privateKey) {
    const error = new Error("Faltan OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY en el servidor.");
    error.status = 503;
    throw error;
  }

  const payload = {
    method: "card",
    source_id: order.payment.token_id,
    amount: order.total,
    currency: config.currency,
    description: `La Casa de las Flores ${order.orderId}`,
    order_id: order.orderId,
    device_session_id: order.payment.device_session_id,
    customer: {
      name: order.customer.first_name,
      last_name: order.customer.last_name,
      email: order.customer.email,
      phone_number: order.customer.phone,
    },
  };

  const auth = Buffer.from(`${config.privateKey}:`).toString("base64");
  const response = await fetch(`${config.apiBase}/${config.merchantId}/charges`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.description || data.message || "Openpay rechazo la operacion.");
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function handleCheckout(req, res) {
  try {
    const body = await readBody(req);
    const order = normalizeOrder(body);
    const charge = await createOpenpayCharge(order);
    sendJson(res, 200, {
      ok: true,
      order: {
        id: order.orderId,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        total: order.total,
        status: charge.status || "completed",
        openpay_id: charge.id,
        items: order.items,
        delivery: order.delivery,
      },
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
  if (segments.some((segment) => segment.startsWith(".")) || segments[0] === "data" || segments[0] === "server.js") {
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
    res.end(content);
  });
}

function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/openpay-config") {
    const config = openpayConfig();
    sendJson(res, 200, {
      ok: true,
      merchant_id: config.merchantId,
      public_key: config.publicKey,
      sandbox: config.sandbox,
      country: config.country,
      currency: config.currency,
      configured: Boolean(config.merchantId && config.publicKey && config.privateKey),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/business-info") {
    sendJson(res, 200, { ok: true, business: businessInfo() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/checkout/openpay") {
    handleCheckout(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reclamaciones") {
    handleClaim(req, res);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendError(res, 405, "Metodo no permitido.");
    return;
  }

  serveStatic(req, res, url);
}

if (require.main === module) {
  const server = http.createServer(handler);
  server.listen(port, () => {
    console.log(`La Casa de las Flores listo en http://localhost:${port}`);
  });
}

module.exports = handler;
