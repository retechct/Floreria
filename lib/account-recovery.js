const crypto = require('node:crypto');
const { digest, rateLimit } = require('./security');
const { fail } = require('./catalog');
const { mailConfigured, sendAccountEmail } = require('./mailer');
const empty = { users: [], sessions: [], tickets: [] };
const generic = 'Si el correo corresponde a una cuenta, recibirás las instrucciones. Revisa también tu carpeta de spam.';

function createAccountRecovery(store) {
  async function send(user, kind) {
    if (!mailConfigured()) return false;
    const token = crypto.randomBytes(32).toString('base64url');
    await store.update('customer-auth', empty, auth => {
      auth.tickets = (auth.tickets || []).filter(item => item.expiresAt > Date.now() && !(item.userId === user.id && item.kind === kind));
      auth.tickets.push({ hash: digest(token), userId: user.id, credential: digest(user.passwordHash), kind, expiresAt: Date.now() + (kind === 'reset' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000) });
      return auth;
    });
    try { await sendAccountEmail({ email: user.email, kind, token }); return true; }
    catch {
      // Never log the email, provider response, link or token.
      console.error('No se pudo entregar un correo de cuenta. Revisa el proveedor.');
      return false;
    }
  }
  async function request(email, kind) {
    // Account limits are silent so the response does not reveal registered addresses.
    try { await rateLimit(store, 'account-email', email, 3, 60 * 60 * 1000); }
    catch (error) { if (error.status === 429) return { message: generic }; throw error; }
    const auth = await store.read('customer-auth', empty);
    const user = auth.users.find(item => item.email === email);
    if (user && (kind === 'reset' || !user.emailVerifiedAt)) await send(user, kind);
    return { message: generic };
  }
  async function consume(token, kind, passwordHash) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ''))) fail('El enlace no es válido o ya venció. Solicita uno nuevo.');
    await store.update('customer-auth', empty, auth => {
      const ticket = (auth.tickets || []).find(item => item.hash === digest(token) && item.kind === kind && item.expiresAt > Date.now());
      const user = ticket && auth.users.find(item => item.id === ticket.userId);
      if (!user || ticket.credential !== digest(user.passwordHash)) fail('El enlace no es válido, ya fue usado o venció. Solicita uno nuevo.');
      user.emailVerifiedAt = new Date().toISOString();
      if (kind === 'reset') user.passwordHash = passwordHash;
      auth.sessions = auth.sessions.filter(item => item.userId !== user.id && item.expiresAt > Date.now());
      auth.tickets = auth.tickets.filter(item => item.userId !== user.id && item.expiresAt > Date.now());
      return auth;
    });
    return { message: kind === 'reset' ? 'Tu contraseña fue actualizada. Inicia sesión con la nueva contraseña.' : 'Correo confirmado. Ya puedes iniciar sesión.' };
  }
  return { request, send, consume };
}
module.exports = { createAccountRecovery };
