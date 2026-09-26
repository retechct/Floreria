const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const port = Number(process.env.UI_TEST_PORT || 3011);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "floreria-ui-"));
const salt = "0123456789abcdef0123456789abcdef";
Object.assign(process.env, {
  NODE_ENV: "test", VERCEL: "", DATABASE_URL: "", DATA_DIR: directory,
  ADMIN_USERNAME: "admin", ADMIN_PASSWORD_HASH: `scrypt:${salt}:${crypto.scryptSync("Only-for-ui-tests-123", salt, 64).toString("hex")}`,
  ADMIN_SESSION_SECRET: "session-secret-for-ui-tests-not-production",
  SITE_URL: `http://127.0.0.1:${port}`,
  CULQI_PUBLIC_KEY: "pk_test_1234567890abcdef", CULQI_SECRET_KEY: "sk_test_1234567890abcdef",
});
const gateway = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks));
  res.setHeader("Content-Type", "application/json");
  if (!body.authentication_3DS) { res.end(JSON.stringify({ action_code: "REVIEW" })); return; }
  res.statusCode = 201;
  res.end(JSON.stringify({ object: "charge", id: "chr_test_" + crypto.randomBytes(8).toString("hex"), amount: body.amount, currency_code: "PEN", metadata: body.metadata, capture: true, paid: false, outcome: { type: "venta_exitosa" } }));
});
let server;
gateway.listen(0, "127.0.0.1", () => {
  process.env.CULQI_API_BASE = `http://127.0.0.1:${gateway.address().port}/v2`;
  server = http.createServer(require("../server"));
  server.listen(port, "127.0.0.1");
});
const close = () => server.close(() => {
  gateway.close();
  if (path.dirname(directory) === os.tmpdir() && path.basename(directory).startsWith("floreria-ui-")) fs.rmSync(directory, { recursive: true, force: true });
  process.exit(0);
});
process.on("SIGTERM", close);
process.on("SIGINT", close);
