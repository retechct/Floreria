const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore } = require('../lib/store');
const { totp, base32 } = require('../lib/admin-mfa');
let server, mail, directory, base, store;
const outbox = [];
const password = 'Security-test-password-123';
const email = 'cliente@example.com';
let customerCookie, adminCookie, csrf, setup, codes;

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'floral-security-'));
  const salt = crypto.randomBytes(16).toString('hex');
  Object.assign(process.env, {
    NODE_ENV: 'test', VERCEL: '', DATABASE_URL: '', DATA_DIR: directory,
    ADMIN_USERNAME: 'admin', ADMIN_EMAIL: 'owner@example.com', ADMIN_SESSION_SECRET: crypto.randomBytes(40).toString('hex'),
    ADMIN_PASSWORD_HASH: `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`,
    CULQI_PUBLIC_KEY: '', CULQI_SECRET_KEY: '', RESEND_API_KEY: 'test-only', MAIL_FROM: 'Flores <test@example.com>',
  });
  mail = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    outbox.push(JSON.parse(Buffer.concat(chunks)));
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ id: 'test-email' }));
  });
  await new Promise(resolve => mail.listen(0, '127.0.0.1', resolve));
  process.env.MAIL_API_BASE = `http://127.0.0.1:${mail.address().port}`;
  server = http.createServer(require('../server'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`; process.env.SITE_URL = base;
  store = createStore({ directory });
});
after(async () => {
  await Promise.all([server, mail].map(item => new Promise(resolve => item.close(resolve))));
  if (path.dirname(directory) === os.tmpdir() && path.basename(directory).startsWith('floral-security-')) await fs.rm(directory, { recursive: true, force: true });
});
async function request(route, body, cookie = '', origin = base, token = '') {
  const response = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': token, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json().catch(() => ({})), headers: response.headers };
}
const cookie = (response, name) => response.headers.getSetCookie().find(value => value.startsWith(name + '=') && !value.includes('Max-Age=0'))?.split(';')[0];
const emailToken = kind => new URL(outbox.at(-1).text.match(/http[^\s]+/)[0]).hash.slice(kind.length + 2);

test('TOTP follows RFC 6238 SHA-1 reference vectors', () => {
  const secret = base32(Buffer.from('12345678901234567890'));
  for (const [time, value] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) assert.equal(totp(secret, Math.floor(time / 30), 8), value);
});

test('security audit: public boundaries, verified accounts and administrator MFA', async t => {
  await t.test('new installations quote without payment SDKs and enforce script policy', async () => {
    assert.equal((await request('/api/store-settings')).data.settings.sales_enabled, false);
    const page = await fetch(base + '/');
    assert.match(page.headers.get('content-security-policy'), /script-src 'self' 'nonce-/);
    assert.doesNotMatch(page.headers.get('content-security-policy').split('script-src ')[1].split(';')[0], /unsafe-inline|unsafe-eval|https:/);
    const markup = await page.text();
    assert.match(markup, /application\/ld\+json" nonce=/);
    assert.equal((await request('/api/checkout/quote', { cart: [] })).status, 503);
    assert.doesNotMatch(await (await fetch(base + '/checkout.html')).text(), /<script src="https:\/\/(js|3ds)\.culqi/);
  });
  await t.test('claims reject foreign origins and limit persisted submissions', async () => {
    const body = { type: 'reclamo', consumer_name: 'Cliente', document_type: 'DNI', document_number: '12345678', email, phone: '999999999', product: 'Flores', detail: 'Detalle', request: 'Respuesta', accepted_privacy: true };
    assert.equal((await request('/api/reclamaciones', body, '', 'https://other.example')).status, 403);
    for (let i = 0; i < 5; i++) assert.equal((await request('/api/reclamaciones', body)).status, 200);
    const limited = await request('/api/reclamaciones', body);
    assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await store.read('claims')).length, 5);
  });
  await t.test('registration needs email ownership and rejects role escalation', async () => {
    const registered = await request('/api/auth/register', { name: 'Cliente', email, password, role: 'admin', acceptedTerms: true, acceptedPrivacy: true });
    assert.equal(registered.status, 201); assert.equal(registered.data.requiresVerification, true);
    assert.equal(registered.headers.get('set-cookie'), null);
    assert.equal((await request('/api/auth/login', { identifier: email, password })).status, 403);
    const token = emailToken('verify');
    assert.doesNotMatch(JSON.stringify(await store.read('customer-auth')), new RegExp(token));
    assert.equal((await request('/api/auth/verify-email', { token })).status, 200);
    assert.equal((await request('/api/auth/verify-email', { token })).status, 400);
    const login = await request('/api/auth/login', { identifier: email, password });
    assert.equal(login.data.role, 'customer'); assert.equal(login.data.user.emailVerified, true);
    customerCookie = cookie(login, 'floral_customer');
    assert.equal((await request('/api/admin/catalog', undefined, customerCookie)).status, 401);
  });
  await t.test('password reset is generic, one-use, scoped and revokes sessions', async () => {
    const unknown = await request('/api/auth/forgot-password', { email: 'unknown@example.com' });
    const known = await request('/api/auth/forgot-password', { email });
    assert.deepEqual(unknown.data, known.data);
    const token = emailToken('reset');
    assert.equal((await request('/api/auth/verify-email', { token })).status, 400);
    const newPassword = password + '-new';
    assert.equal((await request('/api/auth/reset-password', { token, password: newPassword })).status, 200);
    assert.equal((await request('/api/auth/session', undefined, customerCookie)).data.authenticated, false);
    assert.equal((await request('/api/auth/reset-password', { token, password })).status, 400);
    assert.equal((await request('/api/auth/login', { identifier: email, password })).status, 401);
    assert.equal((await request('/api/auth/login', { identifier: email, password: newPassword })).data.role, 'customer');
    await request('/api/auth/forgot-password', { email });
    const expired = emailToken('reset');
    await store.update('customer-auth', {}, auth => { auth.tickets.forEach(item => { item.expiresAt = 0; }); return auth; });
    assert.equal((await request('/api/auth/reset-password', { token: expired, password })).status, 400);
  });
  await t.test('MFA setup requires password, CSRF and proof of authenticator enrollment', async () => {
    const login = await request('/api/admin/login', { username: 'admin', password });
    adminCookie = cookie(login, 'floral_admin'); csrf = login.data.csrf;
    assert.equal((await request('/api/admin/mfa/setup', { password }, adminCookie)).status, 403);
    assert.equal((await request('/api/admin/mfa/setup', { password: 'wrong' }, adminCookie, base, csrf)).status, 401);
    setup = await request('/api/admin/mfa/setup', { password }, adminCookie, base, csrf);
    assert.equal(setup.status, 200); assert.match(setup.data.secret, /^[A-Z2-7]{32}$/);
    assert.doesNotMatch(JSON.stringify(await store.read('admin-mfa')), new RegExp(setup.data.secret));
    const enabled = await request('/api/admin/mfa/enable', { code: totp(setup.data.secret) }, adminCookie, base, csrf);
    assert.equal(enabled.status, 200); codes = enabled.data.recoveryCodes;
    assert.equal(codes.length, 10);
    assert.equal((await request('/api/admin/catalog', undefined, adminCookie)).status, 401);
  });
  await t.test('both login paths require the second factor and recovery codes are consumed', async () => {
    const shared = await request('/api/auth/login', { identifier: 'admin', password });
    assert.equal(shared.data.requiresMfa, true); assert.equal(shared.headers.get('set-cookie'), null);
    const complete = await request('/api/auth/mfa', { challenge: shared.data.challenge, code: codes[0] });
    assert.equal(complete.data.role, 'admin'); adminCookie = cookie(complete, 'floral_admin');
    assert.equal((await request('/api/admin/catalog', undefined, adminCookie)).status, 200);
    assert.equal((await request('/api/auth/mfa', { challenge: shared.data.challenge, code: codes[1] })).status, 401);
    const direct = await request('/api/admin/login', { username: 'admin', password });
    assert.equal(direct.data.requiresMfa, true);
    assert.equal((await request('/api/admin/login-mfa', { challenge: direct.data.challenge, code: codes[0] })).status, 401);
    const code = totp(setup.data.secret, Math.floor(Date.now() / 30000) + 1);
    assert.equal((await request('/api/admin/login-mfa', { challenge: direct.data.challenge, code })).status, 200);
    const second = await request('/api/admin/login', { username: 'admin', password });
    assert.equal((await request('/api/admin/login-mfa', { challenge: second.data.challenge, code })).status, 401);
    for (let i = 0; i < 4; i++) assert.equal((await request('/api/admin/login-mfa', { challenge: second.data.challenge, code: 'invalid' })).status, 401);
    assert.equal((await request('/api/admin/login-mfa', { challenge: second.data.challenge, code: codes[1] })).status, 401);
  });
});
