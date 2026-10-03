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

async function sendMail({ to, subject, text, idempotencyKey, attachments = [] }) {
  if (!mailConfigured()) throw new Error('Email is not configured');
  const recipients = [...new Set((Array.isArray(to) ? to : [to]).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '')))];
  if (!recipients.length) throw new Error('Email recipient is not configured');
  const response = await fetch(`${apiBase()}/emails`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: recipients, subject, text, ...(attachments.length ? { attachments } : {}) }),
  });
  if (!response.ok) throw new Error('Email provider rejected delivery');
}

function orderText(order, heading) {
  const items = order.items.map(item => `${item.qty} x ${item.name}: S/ ${Number(item.line_total).toFixed(2)}`).join('\n');
  const receipt = order.receipt?.type === 'invoice' ? 'Factura' : 'Boleta';
  const tracking = order.accessToken && process.env.SITE_URL ? new URL(`/confirmacion.html#pedido=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.accessToken)}`, process.env.SITE_URL).href : '';
  return `${heading}\n\nPedido: ${order.orderId}\n${items}\nSubtotal: S/ ${Number(order.subtotal).toFixed(2)}\nEnvío: S/ ${Number(order.deliveryFee).toFixed(2)}\nTotal: S/ ${Number(order.total).toFixed(2)}\n\nEntrega: ${order.delivery.date}, ${order.delivery.slot}\nDistrito: ${order.delivery.district}\nDirección: ${order.delivery.address}\nRecibe: ${order.delivery.recipient}\n\nComprobante solicitado: ${receipt}\nEstado del comprobante: ${order.receipt?.status === 'issued' ? `${order.receipt.series}-${order.receipt.number}` : 'pendiente de emisión'}${tracking ? `\nConsulta privada del pedido: ${tracking}` : ''}\n\nConserva el número de pedido. Si tuvieras alguna duda, responde a este correo o contacta a la tienda.`;
}

async function sendOrderConfirmation(order) {
  await sendMail({ to: order.customer.email, subject: `Pedido ${order.orderId} confirmado`, text: orderText(order, 'Tu pago fue confirmado.'), idempotencyKey: `order-customer-${order.orderId}` });
  const admin = process.env.BUSINESS_EMAIL || process.env.BUSINESS_CLAIMS_EMAIL;
  if (admin) await sendMail({ to: admin, subject: `Nueva venta ${order.orderId}`, text: orderText(order, 'Hay una nueva venta confirmada para preparar.'), idempotencyKey: `order-admin-${order.orderId}` });
}

async function sendClaimReceipt(claim) {
  const representative = claim.consumer.representative ? `\nRepresentante: ${claim.consumer.representative.name}\nDocumento del representante: ${claim.consumer.representative.document_number}` : '';
  const text = `Hoja de Reclamación ${claim.code}\nFecha: ${claim.created_at}\nTipo: ${claim.type}\nConsumidor: ${claim.consumer.name}\nDocumento: ${claim.consumer.document_type} ${claim.consumer.document_number}${representative}\nCorreo: ${claim.consumer.email}\nTeléfono: ${claim.consumer.phone}\nProducto o servicio: ${claim.claim.product}\nMonto reclamado: ${claim.claim.amount || 'No indicado'}\nDetalle: ${claim.claim.detail}\nPedido concreto: ${claim.claim.request}\n\nEstado: recibido. La respuesta se atenderá dentro del plazo informado.`;
  await sendMail({ to: claim.consumer.email, subject: `Hoja de Reclamación ${claim.code}`, text, idempotencyKey: `claim-customer-${claim.code}` });
  const admin = process.env.BUSINESS_CLAIMS_EMAIL || process.env.BUSINESS_EMAIL;
  if (admin) await sendMail({ to: admin, subject: `Nueva reclamación ${claim.code}`, text, idempotencyKey: `claim-admin-${claim.code}` });
}

async function sendClaimResponse(claim) {
  const text = `Respuesta a la Hoja de Reclamacion ${claim.code}\n\nEstado: respondido\nFecha de registro: ${claim.created_at}\nProducto o servicio: ${claim.claim.product}\n\nRespuesta del proveedor:\n${claim.response}\n\nConserva este correo junto con la constancia original.`;
  await sendMail({
    to: claim.consumer.email,
    subject: `Respuesta a la Hoja de Reclamacion ${claim.code}`,
    text,
    idempotencyKey: `claim-response-${claim.code}-${require('./security').digest(claim.response)}`,
  });
}

async function sendReceiptIssued(order, file) {
  const label = order.receipt?.type === 'invoice' ? 'Factura' : 'Boleta';
  const number = `${order.receipt?.series}-${order.receipt?.number}`;
  const attachments = file ? [{ filename: order.receipt.file.name, content: file.toString('base64') }] : [];
  await sendMail({ to: order.customer.email, subject: `${label} ${number} · pedido ${order.orderId}`, text: `${label} emitida para tu pedido ${order.orderId}.\n\nComprobante: ${number}\nTotal: S/ ${Number(order.total).toFixed(2)}${order.receipt?.downloadUrl ? `\nAbrir comprobante: ${order.receipt.downloadUrl}` : ''}\n\n${file ? 'El comprobante emitido en SUNAT se encuentra adjunto en formato PDF.\n\n' : ''}Conserva este mensaje. Si necesitas ayuda, responde a este correo o usa el canal de atención de la tienda.`, idempotencyKey: `receipt-${order.orderId}-${number}`, attachments });
}

module.exports = { mailConfigured, sendAccountEmail, sendOrderConfirmation, sendClaimReceipt, sendClaimResponse, sendReceiptIssued };
