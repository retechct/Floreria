const crypto = require('node:crypto');
const { fail } = require('./catalog');

const digest = value => crypto.createHash('sha256').update(String(value)).digest('hex');
function requestAddress(req) {
  // Only Vercel's own header is trusted. Generic forwarded headers are user-controlled.
  return String(process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress : req.socket.remoteAddress).slice(0, 200);
}
async function rateLimit(store, scope, identity, maximum, windowMs) {
  const attempt = await store.update(`rate:${scope}:${digest(identity)}`, { count: 0, reset: 0 }, current => current.reset <= Date.now()
    ? { count: 1, reset: Date.now() + windowMs }
    : { ...current, count: Math.min(maximum + 1, current.count + 1) });
  if (attempt.count > maximum) throw Object.assign(new Error('Demasiadas solicitudes. Espera unos minutos antes de intentarlo de nuevo.'), { status: 429, retryAfter: Math.ceil((attempt.reset - Date.now()) / 1000) });
}
function requireOrigin(req) {
  const origin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
  if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') fail('Origen de solicitud no permitido.', 403);
}
function securityHeaders(req, res) {
  const nonce = crypto.randomBytes(18).toString('base64');
  req.cspNonce = nonce;
  const checkout = req.url.split('?')[0] === '/checkout.html';
  const paymentSources = checkout ? ' https://js.culqi.com https://3ds.culqi.com https://*.culqi.com' : '';
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}'${paymentSources}`, "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:", `connect-src 'self'${paymentSources}`, `frame-src 'self'${paymentSources}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', req.url.startsWith('/cuenta') ? 'no-referrer' : 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}
module.exports = { digest, requestAddress, rateLimit, requireOrigin, securityHeaders };
