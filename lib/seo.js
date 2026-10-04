const fs = require('node:fs/promises');
const path = require('node:path');
const { publicCatalog } = require('./catalog');
const { providerCard } = require('./business-info');
const site = require('../config/site.json');

const brand = 'PLUM';
const pages = {
  'index.html': ['Florería en Lima | ' + brand, 'Ramos, boxes, tulipanes y regalos florales en Lima. Encuentra un detalle para cada ocasión y consulta disponibilidad y entrega por distrito.'],
  'catalogo.html': ['Catálogo de flores y arreglos en Lima | ' + brand, 'Explora ramos, boxes, girasoles, tulipanes y flores preservadas. Revisa los arreglos disponibles y elige tu próximo regalo floral.'],
  'colecciones.html': ['Colecciones y regalos florales | ' + brand, 'Descubre colecciones de flores para cumpleaños, aniversarios y otras ocasiones. Elige un arreglo y consulta su disponibilidad en Lima.'],
  'contacto.html': ['Contacto y entregas en Lima | ' + brand, 'Contacta con PLUM, La Casa de las Flores, por WhatsApp. Consulta arreglos, disponibilidad y cobertura de entrega en Lima y Callao.'],
  'politicas.html': ['Políticas de compra, privacidad y envíos | ' + brand, 'Consulta los términos de compra, la cobertura de envíos, cambios, privacidad y uso de cookies de PLUM.'],
  'reclamaciones.html': ['Libro de Reclamaciones | ' + brand, 'Registra una queja o reclamación sobre tu compra o atención en PLUM.'],
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

function storefrontNavigation() {
  return `<nav class="nav-left" aria-label="Categorías">
    <a class="nav-link" data-nav href="catalogo.html">Catálogo</a>
    <details class="menu">
      <summary class="menu-button">Ocasiones <i data-lucide="chevron-down"></i></summary>
      <div class="mega">
        <a href="catalogo.html?ocasion=Amor"><strong>Amor y aniversario</strong><small>Rosas y detalles con intención</small></a>
        <a href="catalogo.html?ocasion=Cumplea%C3%B1os"><strong>Cumpleaños</strong><small>Flores para celebrar</small></a>
        <a href="catalogo.html?promociones=1"><strong>Promociones</strong><small>Selección con precio especial</small></a>
      </div>
    </details>
    <details class="menu">
      <summary class="menu-button">Flores <i data-lucide="chevron-down"></i></summary>
      <div class="mega">
        <a href="catalogo.html?categoria=Ramos"><strong>Ramos</strong></a>
        <a href="catalogo.html?categoria=Tulipanes"><strong>Tulipanes</strong></a>
        <a href="catalogo.html?categoria=Girasoles"><strong>Girasoles</strong></a>
        <a href="catalogo.html?categoria=Preservadas"><strong>Preservadas</strong></a>
      </div>
    </details>
  </nav>`;
}

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
        urls.push(...catalog.collections.map(collection => `${origin}/colecciones.html?coleccion=${encodeURIComponent(collection.id)}`));
        urls.push(...catalog.products.map(product => `${origin}/producto.html?id=${encodeURIComponent(product.id)}`));
        return reply(200, 'application/xml; charset=utf-8', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(loc => `<url><loc>${escape(loc)}</loc></url>`).join('')}</urlset>`);
      } catch { return reply(503, 'text/plain; charset=utf-8', 'Sitemap temporalmente no disponible.', { 'Retry-After': '60' }); }
    }
    if (url.pathname === '/personalizar.html') return reply(301, 'text/plain', '', { Location: '/catalogo.html' });
    if (url.pathname === '/index.html') return reply(301, 'text/plain', '', { Location: '/' + url.search });
    const file = url.pathname === '/' ? 'index.html' : url.pathname === '/admin' ? 'admin.html' : url.pathname.slice(1);
    if (!pages[file]) return false;
    let html = await fs.readFile(path.join(viewsDirectory, file), 'utf8');
    if (file !== 'admin.html') {
      html = html.replace(/<nav class="nav-left"[\s\S]*?<\/nav>/, storefrontNavigation());
      html = html.replace(/<main\b([^>]*)>/, '<main id="main-content" tabindex="-1"$1>');
      html = html.replace(/(<body\b[^>]*>)/, '$1\n<a class="skip-link" href="#main-content">Saltar al contenido</a>');
    }
    if (file === 'politicas.html' || file === 'reclamaciones.html') {
      html = html.replace(/(<aside\b[^>]*\bdata-business-info\b[^>]*>)(<\/aside>)/, (_, open, close) => `${open}${providerCard()}${close}`);
    }
    html = html.replace('</head>', '<link rel="preload" href="/assets/fonts/inter-normal-3.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="/assets/fonts/cormorant-garamond-normal-2.woff2" as="font" type="font/woff2" crossorigin>\n</head>');
    let [title, description] = pages[file];
    let status = 200;
    let noindex = privatePages.has(file) || preview;
    let canonical = `${origin}/${file === 'index.html' ? '' : file}`;
    let image = `${origin}/public/assets/premium/products/ramo-love.webp`;
    let structured;
    let breadcrumbs;
    if (file === 'catalogo.html' || file === 'index.html' || file === 'colecciones.html') {
      try {
        const catalog = publicCatalog(await getCatalog());
        const settings = await getSettings();
        const showPrices = settings.salesEnabled !== false;
        if (file === 'colecciones.html') {
          const selectedId = url.searchParams.get('coleccion');
          const selectedCollection = selectedId ? catalog.collections.find(collection => collection.id === selectedId) : null;
          if (selectedId && !selectedCollection) {
            status = 404;
            noindex = true;
            title = 'Colección no disponible | ' + brand;
          }
          if (selectedCollection) {
            title = `${selectedCollection.title} | Flores en Lima | ${brand}`;
            description = `${selectedCollection.description} Explora sus arreglos y consulta entrega en Lima.`.slice(0, 170);
            canonical += `?coleccion=${encodeURIComponent(selectedCollection.id)}`;
            image = new URL(selectedCollection.image || 'assets/logo.svg', origin).href;
            html = html.replace('<h1>Colecciones del atelier</h1>', `<h1>${escape(selectedCollection.title)}</h1>`);
            html = html.replace(/<p class="lead">[\s\S]*?<\/p>/, `<p class="lead">${escape(selectedCollection.description)}</p>`);
          }
          if (url.searchParams.size > (selectedId ? 1 : 0)) noindex = true;
          const byId = new Map(catalog.products.map(product => [product.id, product]));
          const filters = `<button class="collection-filter${selectedId ? '' : ' is-active'}" type="button" data-collection-filter="" aria-pressed="${!selectedId}" aria-controls="collections-page"><span class="collection-filter-image"><i data-lucide="flower-2"></i></span><span>Todas</span></button>` + catalog.collections.map(collection => {
            const image = collection.image || byId.get(collection.productIds[0])?.image || 'assets/logo.svg';
            const active = collection.id === selectedId;
            return `<button class="collection-filter${active ? ' is-active' : ''}" type="button" data-collection-filter="${escape(collection.id)}" aria-pressed="${active}" aria-controls="collections-page"><span class="collection-filter-image"><img src="${escape(image)}" alt="" width="88" height="88" loading="lazy"></span><span>${escape(collection.title)}</span></button>`;
          }).join('');
          const blocks = (selectedId ? (selectedCollection ? [selectedCollection] : []) : catalog.collections).map(collection => {
            const productCards = collection.productIds.slice(0, 4).map(id => byId.get(id)).filter(Boolean).map(product => `<article class="product-card"><a class="product-media" href="/producto.html?id=${encodeURIComponent(product.id)}"><img src="${escape(product.image)}" alt="${escape(product.name)}" width="480" height="480" loading="lazy"></a><div class="product-body"><h3 class="product-name">${escape(product.name)}</h3>${showPrices ? `<span class="price">S/ ${Number(product.price).toFixed(2)}</span>` : ''}<p>${escape(product.description)}</p></div></article>`).join('');
            return `<section class="collection-block"><div class="collection-copy"><p class="eyebrow">Colección</p><h2><a href="/colecciones.html?coleccion=${encodeURIComponent(collection.id)}">${escape(collection.title)}</a></h2><p>${escape(collection.description)}</p><a class="btn secondary" href="/catalogo.html?coleccion=${encodeURIComponent(collection.id)}">Ver catálogo</a></div><div class="collection-products">${productCards || '<p class="catalog-empty">Pronto tendremos nuevos arreglos en esta colección.</p>'}</div></section>`;
          }).join('');
          const directory = `<section class="collection-block collection-directory-shell"><div class="collection-directory">${catalog.collections.map(collection => {
            const collectionImage = collection.image || byId.get(collection.productIds[0])?.image || 'assets/logo.svg';
            const count = collection.productIds?.length || 0;
            return `<a class="collection-directory-card" href="/colecciones.html?coleccion=${encodeURIComponent(collection.id)}"><img src="${escape(collectionImage)}" alt="Colección ${escape(collection.title)}" width="640" height="520" loading="lazy"><span class="collection-directory-overlay"></span><span class="collection-directory-copy"><span class="eyebrow">Colección</span><strong>${escape(collection.title)}</strong><small>${count} ${count === 1 ? 'arreglo' : 'arreglos'} <span aria-hidden="true">&rarr;</span></small></span></a>`;
          }).join('')}</div><nav class="collection-product-index" aria-label="Arreglos destacados de las colecciones"><span>Arreglos destacados</span>${[...new Map(catalog.collections.map(collection => byId.get(collection.productIds[0])).filter(Boolean).map(product => [product.id, product])).values()].map(product => `<a href="/producto.html?id=${encodeURIComponent(product.id)}">${escape(product.name)}</a>`).join('')}</nav></section>`;
          if (catalog.collections.length) html = html.replace('id="collection-carousel" hidden', 'id="collection-carousel"');
          html = html.replace(/(<div\b[^>]*id="collection-filters"[^>]*>)/, match => match + filters);
          html = html.replace(/(<section\b[^>]*id="collections-page"[^>]*>)/, match => match + ((selectedId ? blocks : directory) || '<p class="catalog-empty">Estamos preparando nuevas colecciones. <a href="catalogo.html">Explorar el catálogo</a></p>'));
          html = html.replace('<p class="result-line" id="collection-result" role="status" aria-live="polite"></p>', `<p class="result-line" id="collection-result" role="status" aria-live="polite">${escape(selectedCollection?.title || `${catalog.collections.length} colecciones para explorar`)}</p>`);
        }
        if (file === 'index.html') {
          if (!showPrices) html = html.replace(/\s*<section class="section delivery-section">[\s\S]*?<\/section>/, '');
          const heroProducts = [...catalog.products].sort((a, b) => Number(b.featured) - Number(a.featured)).filter(p => p.available !== false).slice(0, 2);
          const heroCards = heroProducts.map((p, index) => `<a class="hero-card ${index ? 'side' : 'main'}" href="/producto.html?id=${encodeURIComponent(p.id)}"><img src="${escape(p.image)}" alt="${escape(p.name)}" width="600" height="600" ${index ? '' : 'fetchpriority="high"'}><div class="hero-caption"><strong>${escape(p.name)}</strong>${showPrices ? `<span class="price">S/ ${Number(p.price).toFixed(2)}</span>` : ''}</div></a>`).join('');
          html = html.replace(/(<div\b[^>]*id="hero-picks"[^>]*>)/, match => match + heroCards);
          const occasions = catalog.collections.filter(c => c.id.startsWith('occasion-')).map(c => `<a class="occasion-card" data-slider-item href="catalogo.html?coleccion=${encodeURIComponent(c.id)}"><img src="${escape(c.image || catalog.products.find(p => c.productIds.includes(p.id))?.image || 'public/assets/premium/products/ramo-love.webp')}" alt="Arreglo floral para ${escape(c.title)}" width="240" height="240" loading="lazy"><span class="occasion-card-title">${escape(c.title)}</span><small>${c.productIds?.length || 0} diseños</small></a>`).join('');
          const flowers = catalog.categories.map(c => `<a class="flower-card" href="catalogo.html?categoria=${encodeURIComponent(c.name)}"><img src="${escape(c.image || 'public/assets/premium/products/ramo-love.webp')}" alt="" width="112" height="112" loading="lazy"><span>${escape(c.name)}</span></a>`).join('');
          html = html.replace(/(<div\b[^>]*id="occasion-grid"[^>]*>)/, match => match + occasions);
          html = html.replace(/(<div\b[^>]*id="flower-grid"[^>]*>)/, match => match + flowers);
        }
        let products = catalog.products;
        if (file === 'catalogo.html') {
          const category = url.searchParams.get('categoria');
          const occasion = url.searchParams.get('ocasion');
          const collectionId = url.searchParams.get('coleccion');
          const collection = catalog.collections.find(item => item.id === collectionId);
          const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const term = normalize((url.searchParams.get('q') || '').slice(0, 150));
          const budget = showPrices ? url.searchParams.get('presupuesto') : '';
          products = products.filter(p => (!category || p.category === category) && (!occasion || p.occasion === occasion)
            && (!collectionId || collection?.productIds.includes(p.id)) && (url.searchParams.get('promociones') !== '1' || p.isPromotion)
            && (!term || normalize(`${p.name} ${p.category} ${p.occasion} ${p.description}`).includes(term))
            && (url.searchParams.get('disponibles') !== '1' || p.available !== false)
            && (!['100', '200', '300', 'mas300'].includes(budget) || (budget === 'mas300' ? p.price > 300 : p.price <= Number(budget))));
          const order = url.searchParams.get('orden');
          if (showPrices && order === 'price-asc') products.sort((a,b) => a.price - b.price);
          if (showPrices && order === 'price-desc') products.sort((a,b) => b.price - a.price);
          if (order === 'name') products.sort((a,b) => a.name.localeCompare(b.name, 'es'));
          if (url.search) noindex = true;
        } else if (file === 'index.html') products = products.filter(p => p.featured || p.isPromotion).slice(0, 12);
        if (file !== 'colecciones.html') {
          const cards = products.map(p => `<article class="product-card"><a class="product-media" href="/producto.html?id=${encodeURIComponent(p.id)}"><img src="${escape(p.image)}" alt="${escape(p.name)}" width="480" height="480" loading="lazy" decoding="async"></a><div class="product-body"><h3 class="product-name"><a href="/producto.html?id=${encodeURIComponent(p.id)}">${escape(p.name)}</a></h3>${showPrices ? `<p>S/ ${Number(p.price).toFixed(2)}</p>` : ''}<p>${escape(p.description)}</p><a class="btn small secondary" href="/producto.html?id=${encodeURIComponent(p.id)}">Ver detalle</a></div></article>`).join('');
          const container = file === 'catalogo.html' ? 'product-grid' : 'featured-grid';
          html = html.replace(new RegExp(`(<div\\b[^>]*id="${container}"[^>]*>)`), match => match + cards);
        }
      } catch { status = 503; noindex = true; }
    }
    if (file === 'index.html') {
      const phone = String(process.env.BUSINESS_PHONE || '51947370668').replace(/\D/g, '');
      structured = { '@context': 'https://schema.org', '@type': 'Florist', name: brand, url: origin + '/', image, ...(/^\d{9,15}$/.test(phone) ? { telephone: `+${phone}` } : {}), areaServed: ['Lima', 'Callao'] };
    }
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
          breadcrumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: origin + '/' },
            { '@type': 'ListItem', position: 2, name: 'Catálogo', item: origin + '/catalogo.html' },
            { '@type': 'ListItem', position: 3, name: product.name, item: canonical },
          ] };
          const settings = await getSettings();
          if (settings.salesEnabled !== false) structured.offers = { '@type': 'Offer', url: canonical, priceCurrency: 'PEN', price: product.price, availability: `https://schema.org/${product.available === false ? 'OutOfStock' : 'InStock'}` };
          const showPrice = settings.salesEnabled !== false;
          const availability = product.available === false ? 'Agotado por el momento.' : showPrice ? 'Consulta disponibilidad y entrega por distrito.' : 'Consulta disponibilidad y coordinamos los detalles por WhatsApp.';
          const fallback = `<article class="product-seo-fallback"><nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/catalogo.html">Catálogo</a><span aria-hidden="true">/</span><span aria-current="page">${escape(product.name)}</span></nav><div class="product-detail"><div class="main-photo"><img src="${escape(image)}" alt="${escape(product.name)}" width="600" height="600" fetchpriority="high"></div><div class="buy-panel"><h1>${escape(product.name)}</h1>${showPrice ? `<strong class="buy-price">S/ ${Number(product.price).toFixed(2)}</strong>` : ''}<p class="product-description">${escape(product.description)}</p><p>${availability}</p>${product.specifications?.length ? `<dl class="product-specs">${product.specifications.map(s => `<div><dt>${escape(s.label)}</dt><dd>${escape(s.value)}</dd></div>`).join('')}</dl>` : ''}<a class="btn secondary" href="catalogo.html">Ver todos los arreglos</a></div></div></article>`;
          html = html.replace(/(<(?:section|div)\b[^>]*id="product-detail"[^>]*>)/, match => match + fallback);
        }
      } catch {
        status = 503; noindex = true; title = 'Producto temporalmente no disponible | ' + brand;
      }
    }
    html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escape(title)}</title>`)
      .replace(/\s*<meta\s+name="(?:description|robots)"[^>]*>/gi, '');
    const tags = `\n<meta name="description" content="${escape(description)}">\n<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}">\n<link rel="canonical" href="${escape(canonical)}">\n<meta property="og:type" content="website">\n<meta property="og:locale" content="es_PE">\n<meta property="og:site_name" content="${brand}">\n<meta property="og:title" content="${escape(title)}">\n<meta property="og:description" content="${escape(description)}">\n<meta property="og:url" content="${escape(canonical)}">\n<meta property="og:image" content="${escape(image)}">\n<meta name="twitter:card" content="summary_large_image">\n${structured ? `<script type="application/ld+json">${json(structured)}</script>` : ''}\n`;
    const allTags = tags + (breadcrumbs ? `<script type="application/ld+json">${json(breadcrumbs)}</script>\n` : '');
    const securedTags = req.cspNonce ? allTags.replaceAll('<script type="application/ld+json">', `<script type="application/ld+json" nonce="${req.cspNonce}">`) : allTags;
    html = html.replace('</head>', () => securedTags + '</head>');
    if (file === 'index.html' || file === 'catalogo.html' || file === 'producto.html') {
      try {
        if ((await getSettings()).salesEnabled === false) {
          html = html.replace(/(<([a-z][a-z0-9]*)\b[^>]*\bdata-quote-copy="([^"]*)"[^>]*>)[\s\S]*?<\/\2>/gi, (_, open, tag, text) => `${open}${text}</${tag}>`);
        }
      } catch { /* Data failures are handled above; never enable checkout here. */ }
    }
    return reply(status, 'text/html; charset=utf-8', html, { ...(noindex ? { 'X-Robots-Tag': 'noindex, follow' } : {}), ...(status === 503 ? { 'Retry-After': '60' } : {}) });
  }
  return { handle };
}

module.exports = { createSeo, siteOrigin, pages };
