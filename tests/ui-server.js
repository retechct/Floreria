const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const mailbox = [];
const port = Number(process.env.UI_TEST_PORT || 3011);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "floreria-ui-"));
const salt = "0123456789abcdef0123456789abcdef";
Object.assign(process.env, {
  NODE_ENV: "test", VERCEL: "", DATABASE_URL: "", DATA_DIR: directory,
  ADMIN_USERNAME: "admin", ADMIN_PASSWORD_HASH: `scrypt:${salt}:${crypto.scryptSync("Only-for-ui-tests-123", salt, 64).toString("hex")}`,
  ADMIN_SESSION_SECRET: "session-secret-for-ui-tests-not-production",
  SITE_URL: `http://127.0.0.1:${port}`,
  CULQI_PUBLIC_KEY: "pk_test_1234567890abcdef", CULQI_SECRET_KEY: "sk_test_1234567890abcdef",
  RESEND_API_KEY: 'test-local-only', MAIL_FROM: 'Flores <test@example.com>',
});
const gateway = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks));
  res.setHeader("Content-Type", "application/json");
  if (req.url === '/emails') { mailbox.push(body); res.end(JSON.stringify({ id: crypto.randomUUID() })); return; }
  if (!body.authentication_3DS) { res.end(JSON.stringify({ action_code: "REVIEW" })); return; }
  res.statusCode = 201;
  res.end(JSON.stringify({ object: "charge", id: "chr_test_" + crypto.randomBytes(8).toString("hex"), amount: body.amount, currency_code: "PEN", metadata: body.metadata, capture: true, paid: false, outcome: { type: "venta_exitosa" } }));
});
let server;
gateway.listen(0, "127.0.0.1", () => { start().catch(fail); });
async function start() {
  process.env.CULQI_API_BASE = `http://127.0.0.1:${gateway.address().port}/v2`;
  process.env.MAIL_API_BASE = `http://127.0.0.1:${gateway.address().port}`;
  await require('../lib/store').createStore({ directory }).update('settings', {}, () => ({ ...require('../lib/settings').seedSettings, salesEnabled: true }));
  const handler = require('../server');
  server = http.createServer((req, res) => {
    // Test fixture only. Never included in server.js or deployment bundles.
    if (req.url.startsWith('/__test/mail')) {
      const email = new URL(req.url, process.env.SITE_URL).searchParams.get('email');
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(mailbox.filter(message => message.to.includes(email)))); return;
    }
    handler(req, res);
  });
  server.on("error", fail);
  server.listen(port, "127.0.0.1", () => process.send?.({ type: "ready" }));
}
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  const forceClose = setTimeout(() => process.exit(code || 1), 8000);
  forceClose.unref();
  const closeServer = target => new Promise(resolve => {
    if (!target?.listening) { resolve(); return; }
    target.close(resolve);
    target.closeAllConnections();
  });
  Promise.all([closeServer(server), closeServer(gateway)]).then(() => {
    // Delete only the isolated directory created by this fixture invocation.
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith("floreria-ui-")) {
      throw new Error("Ruta temporal de pruebas inesperada.");
    }
    fs.rmSync(directory, { recursive: true, force: true });
    process.exit(code);
  }).catch(error => {
    console.error("No se pudo cerrar el servidor de pruebas:", error.message);
    process.exit(1);
  });
}
function fail(error) {
  console.error("Error del servidor de pruebas:", error.message);
  close(1);
}
gateway.on("error", fail);
process.on("message", message => { if (message?.type === "stop") close(); });
if (process.send) process.on("disconnect", () => close());
process.on("SIGTERM", () => close());
process.on("SIGINT", () => close());
