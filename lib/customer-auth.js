const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const sessionDays = 30;

function clean(value, max) { return String(value ?? "").trim().slice(0, max); }
function normalizeEmail(value) { return clean(value, 254).toLowerCase(); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function error(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}
function cookieOptions(req, maxAge) {
  const secure = process.env.NODE_ENV === "production" || process.env.VERCEL || req.socket.encrypted;
  return `Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
function sessionToken(req) {
  const cookie = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith("floral_customer="));
  return cookie?.slice("floral_customer=".length) || "";
}
function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function createCustomerAuth(store, { readJson, adminLogin }) {
  const empty = { users: [], sessions: [] };
  const requestOrigin = (req) => `${(req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http")).split(",")[0].trim()}://${req.headers.host}`;
  const requireOrigin = (req) => {
    if (!req.headers.origin) return;
    const allowed = new Set([requestOrigin(req), process.env.SITE_URL && new URL(process.env.SITE_URL).origin, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`].filter(Boolean));
    if (!allowed.has(req.headers.origin)) error("Origen de solicitud no permitido.", 403);
  };
  const currentUser = async (req) => {
    const token = sessionToken(req);
    if (!token) return null;
    const auth = await store.read("customer-auth", empty);
    const session = auth.sessions.find((item) => same(item.tokenHash, hashToken(token)) && item.expiresAt > Date.now());
    return session ? auth.users.find((user) => user.id === session.userId) || null : null;
  };
  async function createSession(req, res, userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + sessionDays * 24 * 60 * 60 * 1000;
    await store.update("customer-auth", empty, (auth) => {
      auth.sessions = auth.sessions.filter((item) => item.expiresAt > Date.now() && item.userId !== userId);
      auth.sessions.push({ tokenHash: hashToken(token), userId, expiresAt });
      return auth;
    });
    res.setHeader("Set-Cookie", `floral_customer=${token}; ${cookieOptions(req, sessionDays * 24 * 60 * 60)}`);
  }

  async function handle(req, res, url) {
    if (!url.pathname.startsWith("/api/auth/")) return false;
    if (url.pathname === "/api/auth/session" && req.method === "GET") {
      const user = await currentUser(req);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, authenticated: Boolean(user), role: user ? "customer" : null, user: user ? publicUser(user) : null }));
      return true;
    }
    if (!["POST"].includes(req.method)) error("Metodo no permitido.", 405);
    requireOrigin(req);
    if (url.pathname === "/api/auth/logout") {
      const token = sessionToken(req);
      await store.update("customer-auth", empty, (auth) => { auth.sessions = auth.sessions.filter((item) => item.tokenHash !== hashToken(token)); return auth; });
      res.setHeader("Set-Cookie", `floral_customer=; ${cookieOptions(req, 0)}`);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
      return true;
    }
    const body = await readJson(req, 32 * 1024);
    if (url.pathname === "/api/auth/register") {
      const name = clean(body.name, 80);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      if (name.length < 2) error("Escribe tu nombre.");
      if (!validEmail(email)) error("Escribe un correo válido.");
      if (password.length < 10 || password.length > 128) error("La contraseña debe tener entre 10 y 128 caracteres.");
      if (body.acceptedTerms !== true || body.acceptedPrivacy !== true) error("Debes aceptar los términos y la política de privacidad.");
      let createdUser;
      await store.update("customer-auth", empty, async (auth) => {
        if (auth.users.some((item) => item.email === email)) error("Ya existe una cuenta con ese correo.", 409);
        const salt = crypto.randomBytes(16).toString("hex");
        const derived = await scrypt(password, salt, 64);
        const created = { id: `customer-${crypto.randomBytes(12).toString("hex")}`, name, email, passwordHash: `scrypt:${salt}:${derived.toString("hex")}`, acceptedTermsAt: new Date().toISOString(), acceptedPrivacyAt: new Date().toISOString() };
        auth.users.push(created);
        createdUser = created;
        return auth;
      });
      await createSession(req, res, createdUser.id);
      res.writeHead(201, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, role: "customer", user: publicUser(createdUser) }));
      return true;
    }
    if (url.pathname === "/api/auth/login") {
      const identifier = clean(body.identifier || body.email, 254);
      const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase();
      if (adminLogin && (identifier === (process.env.ADMIN_USERNAME || "admin") || identifier.toLowerCase() === adminEmail)) {
        const admin = await adminLogin(req, res, { username: identifier, password: body.password });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ ok: true, role: admin.role, redirect: "admin.html" }));
        return true;
      }
      const email = normalizeEmail(identifier);
      const password = String(body.password || "");
      const auth = await store.read("customer-auth", empty);
      const user = auth.users.find((item) => item.email === email);
      const [scheme, salt, expected] = (user?.passwordHash || "scrypt::").split(":");
      const derived = await scrypt(password.slice(0, 128), salt || crypto.randomBytes(16).toString("hex"), 64);
      if (scheme !== "scrypt" || !user || !same(derived.toString("hex"), expected)) error("Correo o contraseña incorrectos.", 401);
      await createSession(req, res, user.id);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, role: "customer", user: publicUser(user) }));
      return true;
    }
    error("Ruta de autenticación no encontrada.", 404);
  }

  return { handle, currentUser };
}

module.exports = { createCustomerAuth };
