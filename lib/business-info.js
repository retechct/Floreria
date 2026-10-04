function businessInfo() {
  return {
    commercialName: process.env.BUSINESS_COMMERCIAL_NAME || 'PLUM',
    legalName: process.env.BUSINESS_LEGAL_NAME || 'MARCAS VILLAVICENCIO OLGA',
    ruc: process.env.BUSINESS_RUC || '10460325817',
    fiscalAddress: process.env.BUSINESS_ADDRESS || '',
    email: process.env.BUSINESS_EMAIL || '',
    claimsEmail: process.env.BUSINESS_CLAIMS_EMAIL || process.env.BUSINESS_EMAIL || '',
    phone: process.env.BUSINESS_PHONE || '51947370668',
    invoiceEnabled: process.env.BUSINESS_INVOICE_ENABLED === 'true',
  };
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

function providerCard(info = businessInfo()) {
  const missing = !info.legalName || !info.ruc || !info.fiscalAddress;
  return `<div class="provider-card"><div><p class="eyebrow">Identificación del proveedor</p><h3>${escape(info.commercialName)}</h3></div><dl class="provider-list"><div><dt>Titular / Razón social</dt><dd>${escape(info.legalName || 'Por confirmar')}</dd></div><div><dt>RUC</dt><dd>${escape(info.ruc || 'Por confirmar')}</dd></div><div><dt>Domicilio fiscal</dt><dd>${escape(info.fiscalAddress || 'Por confirmar')}</dd></div><div><dt>Atención</dt><dd>${escape(info.claimsEmail || info.email || `WhatsApp ${info.phone}`)}</dd></div></dl>${missing ? '<p class="config-warning">Consulta los datos del proveedor a través de nuestros canales de atención.</p>' : ''}</div>`;
}

module.exports = { businessInfo, providerCard };
