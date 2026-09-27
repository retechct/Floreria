const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { requireOrigin, setCookie: setAdminCookie } = require("./admin");
const { createAccountRecovery } = require('./account-recovery');
const { mailConfigured } = require('./mailer');
const { rateLimit } = require('./security');

const scrypt = promisify(crypto.scrypt);
const sessionDays = 30;

function clean(value, max) { return String(value ?? "").trim().slice(0, max); }
function normalizeEmail(value) { return clean(value, 254).toLowerCase(); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, emailVerified: Boolean(user.emailVerifiedAt) }; }
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

function createCustomerAuth(store, { readJson, admin }) {
  const recovery = createAccountRecovery(store);
  const reply = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ ok: true, ...body })); return true; };
  const empty = { users: [], sessions: [] };
  const isAdminIdentifier = value => value === (process.env.ADMIN_USERNAME || "admin") || Boolean(process.env.ADMIN_EMAIL && value.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
  async function throttle(req) {
    const address = process.env.VERCEL ? req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress : req.socket.remoteAddress;
    const key = `auth-attempt:${hashToken(String(address))}`;
    const attempts = await store.update(key, { count: 0, reset: 0 }, value => value.reset < Date.now()
      ? { count: 1, reset: Date.now() + 15 * 60 * 1000 }
      : { ...value, count: Math.min(31, value.count + 1) });
    if (attempts.count > 30) error("Demasiados intentos. Intenta de nuevo en 15 minutos.", 429);
  }
  const currentUser = async (req) => {
    const token = sessionToken(req);
    if (!token) return null;
    const auth = await store.read("customer-auth", empty);
    const session = auth.sessions.find((item) => same(item.tokenHash, hashToken(token)) && item.expiresAt > Date.now());
    return session ? auth.users.find((user) => user.id === session.userId && user.emailVerifiedAt) || null : null;
  };
  async function createSession(req, res, authenticatedUser) {
    const userId = authenticatedUser.id;
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + sessionDays * 24 * 60 * 60 * 1000;
    await store.update("customer-auth", empty, (auth) => {
      // Password verification is asynchronous. Check the credential again while
      // holding the same storage lock used by password reset/session revocation.
      const current = auth.users.find(user => user.id === userId);
      if (!current?.emailVerifiedAt || !same(current.passwordHash, authenticatedUser.passwordHash)) error("La cuenta cambió durante el acceso. Vuelve a iniciar sesión.", 401);
      auth.sessions = auth.sessions.filter((item) => item.expiresAt > Date.now() && item.userId !== userId);
      auth.sessions.push({ tokenHash: hashToken(token), userId, expiresAt });
      return auth;
    });
    await admin.revoke(req);
    setAdminCookie(req, res, "", 0);
    res.setHeader("Set-Cookie", [`floral_customer=${token}; ${cookieOptions(req, sessionDays * 24 * 60 * 60)}`, ...res.getHeader("Set-Cookie")]);
  }

  async function handle(req, res, url) {
    if (!url.pathname.startsWith("/api/auth/")) return false;
    if (url.pathname === '/api/auth/config' && req.method === 'GET') return reply(res, 200, { emailEnabled: mailConfigured() });
    if (url.pathname === "/api/auth/session" && req.method === "GET") {
      if (await admin.session(req)) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ ok: true, authenticated: true, role: "admin", user: null }));
        return true;
      }
      const user = await currentUser(req);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, authenticated: Boolean(user), role: user ? "customer" : null, user: user ? publicUser(user) : null }));
      return true;
    }
    if (!["POST"].includes(req.method)) error("Metodo no permitido.", 405);
    requireOrigin(req);
    if (url.pathname === "/api/auth/logout") {
      await admin.revoke(req);
      const token = sessionToken(req);
      await store.update("customer-auth", empty, (auth) => { auth.sessions = auth.sessions.filter((item) => item.tokenHash !== hashToken(token)); return auth; });
      res.setHeader("Set-Cookie", `floral_customer=; ${cookieOptions(req, 0)}`);
      const customerCookie = res.getHeader("Set-Cookie");
      setAdminCookie(req, res, "", 0);
      res.setHeader("Set-Cookie", [...res.getHeader("Set-Cookie"), customerCookie]);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true }));
      return true;
    }
    const body = await readJson(req, 32 * 1024);
    await throttle(req);
    if (url.pathname === '/api/auth/mfa') {
      const result = await admin.completeLogin(req, res, body);
      const previousToken = sessionToken(req);
      if (previousToken) await store.update('customer-auth', empty, auth => {
        auth.sessions = auth.sessions.filter(item => item.tokenHash !== hashToken(previousToken));
        return auth;
      });
      res.setHeader('Set-Cookie', [...res.getHeader('Set-Cookie'), `floral_customer=; ${cookieOptions(req, 0)}`]);
      return reply(res, 200, result);
    }
    if (['/api/auth/forgot-password', '/api/auth/resend-verification'].includes(url.pathname)) {
      const email = normalizeEmail(body.email);
      if (!validEmail(email)) error('Escribe un correo válido.');
      return reply(res, 200, await recovery.request(email, url.pathname.endsWith('forgot-password') ? 'reset' : 'verify'));
    }
    if (url.pathname === '/api/auth/verify-email') return reply(res, 200, await recovery.consume(body.token, 'verify'));
    if (url.pathname === '/api/auth/reset-password') {
      const password = String(body.password || '');
      if (password.length < 10 || password.length > 128) error('La contraseña debe tener entre 10 y 128 caracteres.');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await scrypt(password, salt, 64);
      return reply(res, 200, await recovery.consume(body.token, 'reset', `scrypt:${salt}:${hash.toString('hex')}`));
    }
    if (url.pathname === "/api/auth/register") {
      if (!mailConfigured()) error('El registro está temporalmente pausado. Puedes explorar la tienda y consultarnos por WhatsApp.', 503);
      const name = clean(body.name, 80);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      if (name.length < 2) error("Escribe tu nombre.");
      if (!validEmail(email)) error("Escribe un correo válido.");
      if (isAdminIdentifier(email)) error("No se puede registrar este correo.", 409);
      if (password.length < 10 || password.length > 128) error("La contraseña debe tener entre 10 y 128 caracteres.");
      if (body.acceptedTerms !== true || body.acceptedPrivacy !== true) error("Debes aceptar los términos y la política de privacidad.");
      await rateLimit(store, 'register-email', email, 3, 60 * 60 * 1000);
      let createdUser;
      await store.update("customer-auth", empty, async (auth) => {
        const existing = auth.users.find(item => item.email === email);
        if (existing?.emailVerifiedAt) return auth;
        const salt = crypto.randomBytes(16).toString("hex");
        const derived = await scrypt(password, salt, 64);
        const created = { id: `customer-${crypto.randomBytes(12).toString("hex")}`, name, email, passwordHash: `scrypt:${salt}:${derived.toString("hex")}`, acceptedTermsAt: new Date().toISOString(), acceptedPrivacyAt: new Date().toISOString() };
        if (existing) {
          created.id = existing.id;
          auth.users = auth.users.filter(item => item.id !== existing.id);
          auth.sessions = auth.sessions.filter(item => item.userId !== existing.id);
          auth.tickets = (auth.tickets || []).filter(item => item.userId !== existing.id);
        }
        auth.users.push(created);
        createdUser = created;
        return auth;
      });
      if (createdUser) await recovery.send(createdUser, 'verify');
      return reply(res, 201, { requiresVerification: true, message: 'Revisa tu correo para confirmar tu cuenta. Si ya tienes una cuenta, inicia sesión o recupera tu contraseña.' });
    }
    if (url.pathname === "/api/auth/login") {
      const identifier = clean(body.identifier || body.email, 254);
      const email = normalizeEmail(identifier);
      const password = String(body.password || "");
      if (isAdminIdentifier(identifier)) {
        const result = await admin.authenticate(req, res, { identifier, password });
        if (result.requiresMfa) return reply(res, 200, result);
        const previousToken = sessionToken(req);
        if (previousToken) await store.update("customer-auth", empty, auth => {
          auth.sessions = auth.sessions.filter(item => item.tokenHash !== hashToken(previousToken));
          return auth;
        });
        res.setHeader("Set-Cookie", [...res.getHeader("Set-Cookie"), `floral_customer=; ${cookieOptions(req, 0)}`]);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify({ ok: true, role: result.role }));
        return true;
      }
      const auth = await store.read("customer-auth", empty);
      const user = auth.users.find((item) => item.email === email);
      const [scheme, salt, expected] = (user?.passwordHash || "scrypt::").split(":");
      const derived = await scrypt(password.slice(0, 128), salt || crypto.randomBytes(16).toString("hex"), 64);
      if (scheme !== "scrypt" || !user || !same(derived.toString("hex"), expected)) error("Correo o contraseña incorrectos.", 401);
      if (!user.emailVerifiedAt) error('Confirma primero tu correo. Puedes solicitar otro enlace desde esta página.', 403);
      await createSession(req, res, user);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, role: "customer", user: publicUser(user) }));
      return true;
    }
    error("Ruta de autenticación no encontrada.", 404);
  }

  return { handle, currentUser };
}

module.exports = { createCustomerAuth };
