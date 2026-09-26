const fs = require('node:fs/promises');
const path = require('node:path');
const { publicCatalog } = require('./catalog');
const site = require('../config/site.json');

const brand = 'La Casa de las Flores Atelier';
const pages = {
  'index.html': ['Florería en Lima | ' + brand, 'Ramos, boxes, tulipanes y regalos florales en Lima. Encuentra un detalle para cada ocasión y consulta disponibilidad y entrega por distrito.'],
  'catalogo.html': ['Catálogo de flores y arreglos en Lima | ' + brand, 'Explora ramos, boxes, girasoles, tulipanes y flores preservadas. Revisa los arreglos disponibles y elige tu próximo regalo floral.'],
  'colecciones.html': ['Colecciones y regalos florales | ' + brand, 'Descubre colecciones de flores para cumpleaños, aniversarios y otras ocasiones. Elige un arreglo y consulta su disponibilidad en Lima.'],
  'contacto.html': ['Contacto y entregas en Lima | ' + brand, 'Contacta con La Casa de las Flores Atelier por WhatsApp. Consulta arreglos, disponibilidad y cobertura de entrega en Lima y Callao.'],
  'politicas.html': ['Políticas de compra, privacidad y envíos | ' + brand, 'Consulta los términos de compra, la cobertura de envíos, cambios, privacidad y uso de cookies de La Casa de las Flores Atelier.'],
  'reclamaciones.html': ['Libro de Reclamaciones | ' + brand, 'Registra una queja o reclamación sobre tu compra o atención en La Casa de las Flores Atelier.'],
  'catalogo-original.html': ['Catálogo visual de arreglos | ' + brand, 'Explora nuestro catálogo visual de arreglos florales. Confirma disponibilidad y precios actuales en el catálogo de la tienda.'],
  'cuenta.html': ['Acceso a tu cuenta | ' + brand, 'Inicia sesión o crea tu cuenta de cliente para facilitar tus próximas compras.'],
  'carrito.html': ['Tu cesta | ' + brand, 'Revisa los arreglos y cantidades de tu cesta antes de continuar.'],
  'checkout.html': ['Finalizar compra | ' + brand, 'Revisa tu entrega y completa tu pedido de forma segura.'],
  'confirmacion.html': ['Estado de tu pedido | ' + brand, 'Consulta la confirmación y el estado de tu pedido.'],
  'admin.html': ['Administración | ' + brand, 'Acceso privado a la administración de la tienda.'],
  'producto.html': ['Arreglo floral | ' + brand, 'Descubre los detalles y la disponibilidad de este arreglo floral.'],
};
const privatePages = new Set(['admin.html', 'cuenta.html', 'carrito.html', 'checkout.html', 'confirmacion.html', 'catalogo-original.html']);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

function siteOrigin(req) {
  const configured = process.env.SITE_URL || ((process.env.NODE_ENV === 'production' || process.env.VERCEL) ? site.url : '');
  const value = configured || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('SITE_URL debe ser una URL HTTP o HTTPS.');
  return url.origin;
}

function createSeo({ getCatalog, getSettings, viewsDirectory }) {
  async function handle(req, res, url) {
    if (!['GET', 'HEAD'].includes(req.method)) return false;
    const origin = siteOrigin(req);
    const preview = process.env.VERCEL_ENV === 'preview';
    const reply = (status, type, body, headers = {}) => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache', ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
      return true;
    };
    if (url.pathname === '/robots.txt') {
      const robots = preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`;
      return reply(200, 'text/plain; charset=utf-8', robots);
    }
    if (url.pathname === '/sitemap.xml') {
      try {
        const catalog = publicCatalog(await getCatalog());
        const urls = Object.keys(pages).filter(file => !privatePages.has(file) && file !== 'producto.html')
          .map(file => `${origin}/${file === 'index.html' ? '' : file}`);
        urls.push(...catalog.products.map(product => `${origin}/producto.html?id=${encodeURIComponent(product.id)}`));
        return reply(200, 'application/xml; charset=utf-8', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(loc => `<url><loc>${escape(loc)}</loc></url>`).join('')}</urlset>`);
      } catch { return reply(503, 'text/plain; charset=utf-8', 'Sitemap temporalmente no disponible.', { 'Retry-After': '60' }); }
    }
    if (url.pathname === '/personalizar.html') return reply(301, 'text/plain', '', { Location: '/catalogo.html' });
    const file = url.pathname === '/' ? 'index.html' : url.pathname === '/admin' ? 'admin.html' : url.pathname.slice(1);
    if (!pages[file]) return false;
    let html = await fs.readFile(path.join(viewsDirectory, file), 'utf8');
    let [title, description] = pages[file];
    let status = 200;
    let noindex = privatePages.has(file) || preview;
    let canonical = `${origin}/${file === 'index.html' ? '' : file}`;
    let image = `${origin}/public/assets/edited/products/ramo-love.jpg`;
    let structured;
    if (file === 'index.html') structured = { '@context': 'https://schema.org', '@type': 'Florist', name: brand, url: origin + '/', image, telephone: '+51947370668', areaServed: ['Lima', 'Callao'] };
    if (file === 'producto.html') {
      try {
        const catalog = publicCatalog(await getCatalog());
        const product = catalog.products.find(item => item.id === url.searchParams.get('id'));
        if (!product) {
          status = 404; noindex = true; title = 'Producto no disponible | ' + brand;
        } else {
          title = `${product.name} | ${brand}`;
          description = String(product.description || `${product.name}. Consulta disponibilidad y entrega en Lima.`).slice(0, 170);
          canonical += `?id=${encodeURIComponent(product.id)}`;
          image = new URL(product.image, origin).href;
          structured = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, image, sku: product.sku || product.id, url: canonical, brand: { '@type': 'Brand', name: brand } };
          const settings = await getSettings();
          if (settings.salesEnabled !== false) structured.offers = { '@type': 'Offer', url: canonical, priceCurrency: 'PEN', price: product.price, availability: `https://schema.org/${product.available === false ? 'OutOfStock' : 'InStock'}` };
          const fallback = `<article class="product-seo-fallback"><h1>${escape(product.name)}</h1><p>${escape(product.description)}</p><img src="${escape(image)}" alt="${escape(product.name)}" width="480" height="480"><a href="catalogo.html">Ver todos los arreglos</a></article>`;
          html = html.replace(/(<(?:section|div)\b[^>]*id="product-detail"[^>]*>)/, '$1' + fallback);
        }
      } catch {
        status = 503; noindex = true; title = 'Producto temporalmente no disponible | ' + brand;
      }
    }
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
      .replace(/\s*<meta\s+name="(?:description|robots)"[^>]*>/gi, '');
    const tags = `\n<meta name="description" content="${escape(description)}">\n<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}">\n<link rel="canonical" href="${escape(canonical)}">\n<meta property="og:type" content="website">\n<meta property="og:locale" content="es_PE">\n<meta property="og:site_name" content="${brand}">\n<meta property="og:title" content="${escape(title)}">\n<meta property="og:description" content="${escape(description)}">\n<meta property="og:url" content="${escape(canonical)}">\n<meta property="og:image" content="${escape(image)}">\n<meta name="twitter:card" content="summary_large_image">\n${structured ? `<script type="application/ld+json">${json(structured)}</script>` : ''}\n`;
    html = html.replace('</head>', tags + '</head>');
    return reply(status, 'text/html; charset=utf-8', html, { ...(noindex ? { 'X-Robots-Tag': 'noindex, follow' } : {}), ...(status === 503 ? { 'Retry-After': '60' } : {}) });
  }
  return { handle };
}

module.exports = { createSeo, siteOrigin, pages };
