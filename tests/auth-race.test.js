const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createCustomerAuth } = require('../lib/customer-auth');

test('a password reset during login cannot issue a session for the old credential', async () => {
  const previousOrigin = process.env.SITE_URL;
  process.env.SITE_URL = 'http://localhost';
  try {
    const password = 'old-password-for-race-test';
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
    let state = { users: [{ id: 'customer-race', name: 'Cliente', email: 'race@example.test', emailVerifiedAt: '2026-01-01', passwordHash }], sessions: [] };
    let resetWhileVerifying = false;
    const store = {
      async read(key, fallback) {
        if (key !== 'customer-auth') return structuredClone(fallback);
        const snapshot = structuredClone(state);
        // Login already has this snapshot when the reset changes the stored
        // credential and revokes every previous session.
        state.users[0].passwordHash = 'credential-replaced-by-password-reset';
        state.sessions = [];
        resetWhileVerifying = true;
        return snapshot;
      },
      async update(key, fallback, change) {
        if (key !== 'customer-auth') return change(structuredClone(fallback));
        state = await change(structuredClone(state));
        return structuredClone(state);
      },
    };
    const headers = {};
    const res = { setHeader: (name, value) => { headers[name] = value; }, getHeader: name => headers[name], writeHead() {}, end() {} };
    const auth = createCustomerAuth(store, {
      readJson: async () => ({ identifier: 'race@example.test', password }),
      admin: { session: async () => null, revoke: async () => {} },
    });
    const req = { method: 'POST', headers: { host: 'localhost', origin: 'http://localhost' }, socket: { remoteAddress: '127.0.0.1' } };
    await assert.rejects(auth.handle(req, res, new URL('/api/auth/login', 'http://localhost')), error => error.status === 401);
    assert.equal(resetWhileVerifying, true);
    assert.equal(state.sessions.length, 0);
    assert.equal(headers['Set-Cookie'], undefined);
  } finally {
    if (previousOrigin === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previousOrigin;
  }
});
