const crypto = require("node:crypto");
const { promisify } = require("node:util");
const sharp = require("sharp");
const { seedCatalog, migrateCatalog, publicCatalog, normalizeProduct, normalizeCollection, normalizeCategory, fail } = require("./catalog");
const scrypt = promisify(crypto.scrypt);
const { createShipping } = require("./shipping");
const { createSettings } = require("./settings");

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail("El archivo o los datos superan el limite permitido.", 413);
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) fail("Envia un objeto de datos valido.");
    return data;
  }
  catch { fail("Los datos enviados no son validos."); }
}

function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const first = Buffer.from(a), second = Buffer.from(b);
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

function authConfig() {
  const hash = process.env.ADMIN_PASSWORD_HASH || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  return { hash, secret, configured: /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash) && secret.length >= 32 };
}

function sign(payload) {
  const { secret, hash } = authConfig();
  return crypto.createHmac("sha256", secret).update(`${hash}:${payload}`).digest("base64url");
}

function session(req) {
  if (!authConfig().configured) return null;
  const cookie = (req.headers.cookie || "").split(";").map((p) => p.trim()).find((p) => p.startsWith("floral_admin="))?.slice(13);
  if (!cookie) return null;
  const [payload, signature] = cookie.split(".");
  if (!signature || !same(sign(payload), signature)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    return value.exp > Date.now() && typeof value.csrf === "string" ? value : null;
  } catch { return null; }
}

function setCookie(req, res, token, maxAge) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL || req.socket.encrypted;
  res.setHeader("Set-Cookie", `floral_admin=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`);
}

function requireOrigin(req) {
  const requestOrigin = `${(req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http")).split(",")[0].trim()}://${req.headers.host}`;
  const allowed = new Set([requestOrigin, process.env.SITE_URL && new URL(process.env.SITE_URL).origin, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(Boolean));
  if (!allowed.has(req.headers.origin)) fail("Origen de solicitud no permitido.", 403);
}

async function authenticateAdmin(store, req, res, body) {
  const config = authConfig();
  if (!config.configured) fail("Configura el acceso del administrador en el servidor.", 503);
  const address = process.env.VERCEL ? req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress : req.socket.remoteAddress;
  const key = `login:${crypto.createHash("sha256").update(String(address)).digest("hex")}`;
  const attempts = await store.update(key, { count: 0, reset: 0 }, (value) => {
    if (value.reset < Date.now()) return { count: 1, reset: Date.now() + 15 * 60 * 1000 };
    return { ...value, count: Math.min(11, value.count + 1) };
  });
  if (attempts.count > 10) fail("Demasiados intentos. Intenta de nuevo en 15 minutos.", 429);
  const [, salt, hash] = config.hash.split(":");
  const derived = await scrypt(String(body.password || "").slice(0, 256), salt, 64);
  const identifier = String(body.username || body.identifier || "");
  const validIdentifier = identifier === (process.env.ADMIN_USERNAME || "admin") || (process.env.ADMIN_EMAIL && identifier.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
  if (!same(derived.toString("hex"), hash) || !validIdentifier) fail("Usuario o contrasena incorrectos.", 401);
  const value = { exp: Date.now() + 8 * 60 * 60 * 1000, csrf: crypto.randomBytes(24).toString("hex") };
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  setCookie(req, res, `${payload}.${sign(payload)}`, 8 * 60 * 60);
  return { csrf: value.csrf, role: "admin" };
}

function createAdmin(store, { reconcilePayment } = {}) {
  const shipping = createShipping(store);
  const settings = createSettings(store);
  const seed = seedCatalog();
  const getCatalog = async () => {
    const catalog = await store.read("catalog", seed);
    if (catalog.catalogMigrationVersion >= 1 || !Array.isArray(catalog.collections)) return catalog;
    return store.update("catalog", seed, (current) => {
      if (current.catalogMigrationVersion >= 1) return current;
      if (migrateCatalog(current)) {
        current.revision = Number(current.revision || 0) + 1;
        current.updatedAt = new Date().toISOString();
      }
      return current;
    });
  };
  async function mutate(body, change) {
    return store.update("catalog", seed, (catalog) => {
      if (body.revision !== catalog.revision) fail("El catalogo cambio en otra ventana. Actualiza antes de guardar.", 409);
      change(catalog);
      catalog.revision += 1;
      catalog.updatedAt = new Date().toISOString();
      return catalog;
    });
  }

  async function handle(req, res, url) {
    const route = url.pathname;
    if (route === "/api/catalog" && req.method === "GET") {
      json(res, 200, { ok: true, ...publicCatalog(await getCatalog()) });
      return true;
    }
    if (route === "/api/store-settings" && req.method === "GET") {
      const { publicSettings } = require("./settings");
      json(res, 200, { ok: true, settings: publicSettings(await settings.get()) });
      return true;
    }
    if (route.startsWith("/api/media/") && ["GET", "HEAD"].includes(req.method)) {
      const data = await store.readImage(route.slice(11));
      if (!data) fail("Imagen no encontrada.", 404);
      res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": data.length, "Cache-Control": "public, max-age=31536000, immutable" });
      res.end(req.method === "HEAD" ? undefined : data);
      return true;
    }
    if (!route.startsWith("/api/admin/")) return false;
    const current = session(req);
    if (route === "/api/admin/session" && req.method === "GET") {
      json(res, 200, { ok: true, configured: authConfig().configured, authenticated: Boolean(current), csrf: current?.csrf });
      return true;
    }
    if (!["GET", "HEAD"].includes(req.method)) requireOrigin(req);
    if (route === "/api/admin/login" && req.method === "POST") {
      const body = await readJson(req, 4096);
      json(res, 200, { ok: true, ...(await authenticateAdmin(store, req, res, body)) });
      return true;
    }
    if (!current) fail("Inicia sesion para administrar la tienda.", 401);
    if (!["GET", "HEAD"].includes(req.method) && !same(req.headers["x-csrf-token"], current.csrf)) fail("La sesion de seguridad no es valida. Vuelve a ingresar.", 403);
    if (route === "/api/admin/logout" && req.method === "POST") {
      setCookie(req, res, "", 0);
      json(res, 200, { ok: true });
      return true;
    }
    if (route === "/api/admin/catalog" && req.method === "GET") {
      json(res, 200, { ok: true, catalog: await getCatalog(), storage: store.mode });
      return true;
    }
    if (route === "/api/admin/settings" && ["GET", "PUT"].includes(req.method)) {
      const result = req.method === "GET" ? await settings.get() : await settings.update(await readJson(req, 8192));
      json(res, 200, { ok: true, settings: result });
      return true;
    }
    if (route === "/api/admin/orders" && req.method === "GET") {
      json(res, 200, { ok: true, orders: await store.read("orders", []), claims: await store.read("claims", []) });
      return true;
    }
    const reconciliation = route.match(/^\/api\/admin\/orders\/(RSLA-[A-Z0-9-]+)\/reconcile$/);
    if (reconciliation && req.method === "POST" && reconcilePayment) {
      const body = await readJson(req, 4096);
      const order = await reconcilePayment(reconciliation[1], body.charge_id);
      json(res, 200, { ok: true, order });
      return true;
    }
    if (route === "/api/admin/shipping" && ["GET", "PUT"].includes(req.method)) {
      const result = req.method === "GET" ? await shipping.get() : await shipping.update(await readJson(req));
      json(res, 200, { ok: true, shipping: result });
      return true;
    }
    if (route === "/api/admin/images" && req.method === "POST") {
      const body = await readJson(req, 4 * 1024 * 1024);
      if (typeof body.data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data)) fail("Archivo de imagen invalido.");
      const buffer = Buffer.from(body.data, "base64");
      if (buffer.length > 3 * 1024 * 1024) fail("Cada imagen admite hasta 3 MB.", 413);
      let normalized;
      try {
        const source = sharp(buffer, { limitInputPixels: 25000000, failOn: "warning" });
        const info = await source.metadata();
        if (!["jpeg", "png", "webp"].includes(info.format) || info.pages > 1) fail("Usa una imagen JPG, PNG o WebP sin animacion.");
        normalized = await source.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      } catch { fail("No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP valido."); }
      json(res, 201, { ok: true, url: await store.saveImage(normalized) });
      return true;
    }
    if (route === "/api/admin/import-legacy" && req.method === "POST") {
      const body = await readJson(req);
      if (![body.categories, body.collections, body.products].every((items) => Array.isArray(items) && items.length <= 500)) fail("Los datos anteriores no son validos.");
      const fingerprint = crypto.createHash("sha256").update(JSON.stringify([body.categories, body.collections, body.products, body.assignments])).digest("hex");
      const result = await mutate(body, (catalog) => {
        if (catalog.imports?.includes(fingerprint)) fail("Estos datos ya se importaron.", 409);
        for (const item of body.categories) {
          if (!catalog.categories.some((c) => c.name.toLowerCase() === String(item.name).toLowerCase())) catalog.categories.push(normalizeCategory(item, catalog));
        }
        for (const item of body.products) {
          if (catalog.products.some((p) => p.id === item.id)) continue;
          if (!catalog.categories.some((c) => c.name === item.category)) catalog.categories.push(normalizeCategory({ name: item.category }, catalog));
          const product = normalizeProduct({ ...item, status: "draft", images: item.image ? [item.image] : [], specifications: [], isPromotion: true }, catalog);
          if (/^promo-[a-z0-9-]{1,70}$/.test(item.id)) product.id = item.id;
          catalog.products.push(product);
        }
        const collectionIds = new Map();
        for (const item of body.collections) {
          let collection = catalog.collections.find((c) => c.title.toLowerCase() === String(item.title).toLowerCase());
          if (!collection) {
            collection = normalizeCollection({ ...item, occasion: item.query, status: "published", productIds: [] }, catalog);
            catalog.collections.push(collection);
          }
          collectionIds.set(item.id, collection.id);
        }
        for (const [oldId, ids] of Object.entries(body.assignments || {})) {
          const collection = catalog.collections.find((c) => c.id === (collectionIds.get(oldId) || oldId));
          if (collection && Array.isArray(ids)) collection.productIds = [...new Set(ids)].filter((id) => catalog.products.some((p) => p.id === id));
        }
        catalog.imports = [...(catalog.imports || []), fingerprint];
      });
      json(res, 200, { ok: true, catalog: result });
      return true;
    }
    const match = route.match(/^\/api\/admin\/(products|collections|categories)(?:\/([a-z0-9-]+))?$/);
    if (match && ["POST", "PUT", "DELETE"].includes(req.method)) {
      const [, kind, id] = match;
      if ((req.method === "POST") === Boolean(id)) fail("Ruta de administracion invalida.", 404);
      const body = await readJson(req);
      const result = await mutate(body, (catalog) => {
        const index = catalog[kind].findIndex((item) => item.id === id);
        const existing = catalog[kind][index];
        if (id && !existing) fail("Este registro ya no existe.", 404);
        if (req.method === "DELETE") {
          if (kind === "categories" && catalog.products.some((p) => p.category === existing.name)) fail("Cambia primero la categoria de sus productos.", 409);
          catalog[kind].splice(index, 1);
          if (kind === "products") catalog.collections.forEach((c) => { c.productIds = c.productIds.filter((p) => p !== id); });
          return;
        }
        const normalizers = { products: normalizeProduct, collections: normalizeCollection, categories: normalizeCategory };
        const record = normalizers[kind](body.item || {}, catalog, existing);
        if (kind === "products" && body.collectionIds !== undefined) {
          if (!Array.isArray(body.collectionIds) || body.collectionIds.some((collectionId) => !catalog.collections.some((c) => c.id === collectionId))) fail("Selecciona colecciones existentes.");
          catalog.collections.forEach((c) => {
            c.productIds = c.productIds.filter((p) => p !== record.id);
            if (body.collectionIds.includes(c.id)) c.productIds.push(record.id);
          });
        }
        if (kind === "categories" && existing && existing.name !== record.name) catalog.products.forEach((p) => { if (p.category === existing.name) p.category = record.name; });
        if (existing) catalog[kind][index] = record;
        else catalog[kind].push(record);
      });
      json(res, 200, { ok: true, catalog: result });
      return true;
    }
    fail("Ruta de administracion no encontrada.", 404);
  }

  return { handle, getCatalog, authenticate: (req, res, body) => authenticateAdmin(store, req, res, body) };
}

module.exports = { createAdmin, readJson };
