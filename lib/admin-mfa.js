const crypto = require('node:crypto');
const { digest, rateLimit, requestAddress } = require('./security');
const { fail } = require('./catalog');
const empty = { enabled: false, version: null, secret: null, lastStep: -1, recovery: [], challenges: [], pending: null };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buffer) {
  let bits = 0, value = 0, output = '';
  for (const byte of buffer) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
function fromBase32(text) {
  let bits = 0, value = 0;
  const bytes = [];
  for (const char of text.toUpperCase().replace(/=+$/, '')) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid authenticator secret');
    value = (value << 5) | digit; bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}
// RFC 6238 / RFC 4226: SHA-1, 30-second steps, dynamic truncation.
function totp(secret, step = Math.floor(Date.now() / 30000), digits = 6) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const hash = crypto.createHmac('sha1', fromBase32(secret)).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).padStart(digits, '0');
}
function same(a, b) { const first = Buffer.from(String(a)), second = Buffer.from(String(b)); return first.length === second.length && crypto.timingSafeEqual(first, second); }
function encryptionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 32) fail('Configura el secreto administrativo antes de activar el doble factor.', 503);
  return crypto.createHash('sha256').update(`floral-mfa:${secret}`).digest();
}
function encrypt(secret) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const content = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), content].map(item => item.toString('base64url')).join('.');
}
function decrypt(value) {
  try {
    const [iv, tag, content] = value.split('.').map(item => Buffer.from(item, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8');
  } catch { fail('No se pudo abrir la configuración de doble factor. Revisa el secreto del servidor.', 503); }
}
function matchingStep(secret, code, after = -1) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(Date.now() / 30000);
  for (const step of [current, current - 1, current + 1]) if (step > after && same(totp(secret, step), code)) return step;
  return null;
}
function createAdminMfa(store) {
  const get = () => store.read('admin-mfa', empty);
  async function status() { const state = await get(); return { enabled: state.enabled, recoveryRemaining: state.recovery.length }; }
  async function startSetup(sessionKey) {
    const secret = base32(crypto.randomBytes(20));
    await store.update('admin-mfa', empty, state => {
      state.pending = { secret: encrypt(secret), sessionKey, expiresAt: Date.now() + 10 * 60 * 1000 };
      return state;
    });
    const label = `La Casa de las Flores:${process.env.ADMIN_USERNAME || 'admin'}`;
    return { secret, uri: `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=La%20Casa%20de%20las%20Flores&algorithm=SHA1&digits=6&period=30` };
  }
  async function enable(sessionKey, code) {
    const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(10).toString('hex'));
    await store.update('admin-mfa', empty, state => {
      if (!state.pending || state.pending.sessionKey !== sessionKey || state.pending.expiresAt <= Date.now()) fail('La configuración venció. Empieza de nuevo.', 400);
      const step = matchingStep(decrypt(state.pending.secret), String(code));
      if (step === null) fail('Código incorrecto. Revisa la hora de tu aplicación.', 400);
      return { ...empty, enabled: true, version: crypto.randomUUID(), secret: state.pending.secret, lastStep: step, recovery: recoveryCodes.map(digest) };
    });
    await store.update('admin-sessions', [], () => []);
    return { enabled: true, recoveryCodes };
  }
  async function challenge(fingerprint) {
    const token = crypto.randomBytes(32).toString('base64url');
    await store.update('admin-mfa', empty, state => {
      if (!state.enabled) fail('La configuración cambió. Vuelve a ingresar.', 409);
      state.challenges = [...state.challenges.filter(item => item.expiresAt > Date.now()).slice(-99), { hash: digest(token), fingerprint, version: state.version, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 }];
      return state;
    });
    return { requiresMfa: true, challenge: token };
  }
  async function verify(req, token, input, fingerprint) {
    await rateLimit(store, 'admin-mfa', requestAddress(req), 20, 15 * 60 * 1000);
    let version = null;
    await store.update('admin-mfa', empty, state => {
      const item = state.challenges.find(item => same(item.hash, digest(token || '')));
      if (!state.enabled || !item || item.expiresAt <= Date.now() || item.attempts >= 5 || item.fingerprint !== fingerprint || item.version !== state.version) return state;
      item.attempts++;
      const code = String(input || '').trim();
      const step = matchingStep(decrypt(state.secret), code, state.lastStep);
      const recoveryIndex = /^[a-f0-9]{20}$/i.test(code) ? state.recovery.findIndex(hash => same(hash, digest(code.toLowerCase()))) : -1;
      if (step !== null || recoveryIndex >= 0) {
        if (step !== null) state.lastStep = step;
        if (recoveryIndex >= 0) state.recovery.splice(recoveryIndex, 1);
        state.challenges = state.challenges.filter(challenge => challenge !== item && challenge.expiresAt > Date.now());
        version = state.version;
      }
      return state;
    });
    if (!version) fail('Código incorrecto, utilizado o vencido. Reintenta o vuelve a iniciar sesión.', 401);
    return version;
  }
  return { get, status, startSetup, enable, challenge, verify };
}
module.exports = { createAdminMfa, totp, base32 };
