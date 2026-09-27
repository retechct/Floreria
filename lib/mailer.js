function mailConfigured() {
  try {
    const site = new URL(process.env.SITE_URL);
    const validOrigin = !site.username && !site.password && site.pathname === '/' && (site.protocol === 'https:' || process.env.NODE_ENV === 'test' || (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && ['localhost', '127.0.0.1'].includes(site.hostname)));
    return Boolean(validOrigin && process.env.RESEND_API_KEY && /^[^\r\n]+@[^\r\n]+\.[^\r\n]+$/.test(process.env.MAIL_FROM || ''));
  } catch { return false; }
}
function apiBase() {
  if (process.env.NODE_ENV === 'test' && process.env.MAIL_API_BASE) {
    const url = new URL(process.env.MAIL_API_BASE);
    if (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) return url.origin;
  }
  return 'https://api.resend.com';
}
async function sendAccountEmail({ email, kind, token }) {
  if (!mailConfigured()) throw new Error('Email is not configured');
  const reset = kind === 'reset';
  const url = new URL('/cuenta.html', process.env.SITE_URL);
  url.hash = `${reset ? 'reset' : 'verify'}=${token}`;
  const subject = reset ? 'Restablece tu contraseña · La Casa de las Flores' : 'Confirma tu correo · La Casa de las Flores';
  const text = `${reset ? 'Recibimos una solicitud para cambiar tu contraseña.' : 'Confirma tu correo para activar tu cuenta.'}\n\n${url.href}\n\nEste enlace es de un solo uso y vence en ${reset ? '15 minutos' : '24 horas'}. Si no hiciste esta solicitud, ignora este mensaje. Nunca te pediremos tu contraseña por correo.`;
  const response = await fetch(`${apiBase()}/emails`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `account-${kind}-${require('./security').digest(token)}` },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [email], subject, text }),
  });
  if (!response.ok) throw new Error('Email provider rejected delivery');
}
module.exports = { mailConfigured, sendAccountEmail };
