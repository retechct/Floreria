const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createSeo } = require('../lib/seo');
const product = { id: 'rosa', name: 'Ramo <rosa>', description: 'Flores & detalles', status: 'published', price: 100, available: true, image: '/public/rosa.jpg' };
function fixture({ broken = false, sales = true, hidePrices = true, collections = [] } = {}) {
  const seo = createSeo({
    getCatalog: async () => { if (broken) throw new Error('offline'); return { products: [product, { ...product, id: 'draft', status: 'draft' }], categories: [], collections }; },
    getSettings: async () => ({ salesEnabled: sales, hidePricesWhenClosed: hidePrices }),
    viewsDirectory: path.join(__dirname, '..', 'views'),
  });
  return async route => {
    const result = {};
    const req = { method: 'GET', headers: { host: 'localhost:3000' }, socket: {} };
    const res = { writeHead(status, headers) { Object.assign(result, { status, headers }); }, end(body) { result.body = body; } };
    result.handled = await seo.handle(req, res, new URL(route, 'http://localhost:3000'));
    return result;
  };
}

test('server rendered catalog respects search and budget while retaining crawlable links', async () => {
  const read = fixture();
  const found = await read('/catalogo.html?q=ROSÁ&presupuesto=100&disponibles=1');
  assert.match(found.body, /href="\/producto.html\?id=rosa"/);
  assert.match(found.body, /noindex, follow/);
  const absent = await read('/catalogo.html?presupuesto=mas300');
  assert.doesNotMatch(absent.body, /href="\/producto.html\?id=rosa"/);
  const privatePrices = await fixture({ sales: false, hidePrices: true })('/catalogo.html?presupuesto=mas300');
  assert.match(privatePrices.body, /href="\/producto.html\?id=rosa"/);
});
test('SEO metadata exists in the HTML and product content is server rendered', async () => {
  const read = fixture();
  const home = await read('/');
  assert.equal(home.status, 200);
  assert.equal((home.body.match(/name="description"/g) || []).length, 1);
  assert.match(home.body, /rel="canonical"/);
  const detail = await read('/producto.html?id=rosa');
  assert.match(detail.body, /<title>Ramo &lt;rosa&gt;/);
  assert.match(detail.body, /<h1>Ramo &lt;rosa&gt;<\/h1>/);
  const data = JSON.parse(detail.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data.offers.price, 100);
  assert.equal(data.name, product.name);
  assert.match(data.url, /producto\.html\?id=rosa$/);
});
test('sitemap excludes private pages and unpublished products', async () => {
  const read = fixture();
  const sitemap = await read('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.body, /producto.html\?id=rosa/);
  assert.doesNotMatch(sitemap.body, /draft|admin.html|cuenta.html|checkout.html/);
  const account = await read('/cuenta.html');
  assert.match(account.headers['X-Robots-Tag'], /noindex/);
  assert.match((await read('/robots.txt')).body, /Sitemap:/);
});
test('catalog has crawlable product links without JavaScript and home has one canonical route', async () => {
  const read = fixture();
  const catalog = await read('/catalogo.html');
  assert.match(catalog.body, /href="\/producto.html\?id=rosa"/);
  assert.doesNotMatch(catalog.body, /id=draft/);
  assert.match((await read('/catalogo.html?categoria=Ramos')).headers['X-Robots-Tag'], /noindex/);
  assert.equal((await read('/index.html')).headers.Location, '/');
  assert.equal((await fixture({ broken: true })('/catalogo.html')).status, 503);
});
test('collection landing pages have crawlable content, distinct metadata and sitemap URLs', async () => {
  const read = fixture({ collections: [{ id: 'cumpleanos', title: 'Flores de cumpleaños', description: 'Ramos para celebrar.', image: '/public/rosa.jpg', productIds: ['rosa'], status: 'published' }] });
  const listing = await read('/colecciones.html');
  assert.match(listing.body, /href="\/colecciones.html\?coleccion=cumpleanos"/);
  assert.match(listing.body, /href="\/producto.html\?id=rosa"/);
  const landing = await read('/colecciones.html?coleccion=cumpleanos');
  assert.equal(landing.status, 200);
  assert.match(landing.body, /<h1>Flores de cumpleaños<\/h1>/);
  assert.match(landing.body, /<title>Flores de cumpleaños/);
  assert.match(landing.body, /rel="canonical" href="http:\/\/localhost:3000\/colecciones.html\?coleccion=cumpleanos"/);
  assert.doesNotMatch(landing.body, /name="robots" content="noindex/);
  assert.match((await read('/sitemap.xml')).body, /colecciones.html\?coleccion=cumpleanos/);
  assert.equal((await read('/colecciones.html?coleccion=inexistente')).status, 404);
  assert.match((await read('/colecciones.html?coleccion=cumpleanos&orden=otro')).headers['X-Robots-Tag'], /noindex/);
});
test('occasion and flower landing pages are crawlable and remain separate from collections', async () => {
  const collections = [
    { id: 'season-verano', title: 'Verano', description: 'Selección de temporada.', image: '/public/rosa.jpg', productIds: ['rosa'], status: 'published' },
    { id: 'occasion-amor', title: 'Amor y aniversario', occasion: 'Amor', description: 'Flores para celebrar el amor.', image: '/public/rosa.jpg', productIds: ['rosa'], status: 'published' },
  ];
  const read = fixture({ collections });
  const collectionListing = await read('/colecciones.html');
  assert.match(collectionListing.body, /coleccion=season-verano/);
  assert.doesNotMatch(collectionListing.body, /coleccion=occasion-amor/);

  const occasionDirectory = await read('/ocasiones.html');
  assert.equal(occasionDirectory.status, 200);
  assert.match(occasionDirectory.body, /rel="canonical" href="http:\/\/localhost:3000\/ocasiones.html"/);
  assert.match(occasionDirectory.body, /href="\/catalogo.html\?ocasion=Amor"/);
  assert.match(occasionDirectory.body, /Flores para celebrar el amor\./);
  assert.doesNotMatch(occasionDirectory.headers['X-Robots-Tag'] || '', /noindex/);
  assert.match((await read('/sitemap.xml')).body, /ocasiones.html/);
  assert.match((await read('/ocasiones.html?vista=otra')).headers['X-Robots-Tag'], /noindex/);

  const occasion = await read('/catalogo.html?ocasion=Amor');
  assert.equal(occasion.status, 200);
  assert.match(occasion.body, /Flores para amor y aniversario en Lima/);
  assert.match(occasion.body, /href="\/producto.html\?id=rosa"/);
  assert.doesNotMatch(occasion.headers['X-Robots-Tag'] || '', /noindex/);

  const flowers = await read('/flores.html?flor=rosas');
  assert.equal(flowers.status, 200);
  assert.match(flowers.body, /Arreglos con rosas/);
  assert.match(flowers.body, /public\/assets\/flowers\/rosas-single\.webp/);
  assert.match(flowers.body, /href="\/producto.html\?id=rosa"/);
  assert.match(flowers.body, /rel="canonical" href="http:\/\/localhost:3000\/flores.html\?flor=rosas"/);
  assert.match((await read('/sitemap.xml')).body, /flores.html\?flor=rosas/);
  assert.equal((await read('/flores.html?flor=inexistente')).status, 404);
});
test('missing products are 404, outages are 503 and quote mode does not advertise offers', async () => {
  assert.equal((await fixture()('/producto.html?id=missing')).status, 404);
  assert.equal((await fixture({ broken: true })('/producto.html?id=rosa')).status, 503);
  assert.equal((await fixture({ broken: true })('/sitemap.xml')).status, 503);
  const quote = await fixture({ sales: false })('/producto.html?id=rosa');
  const data = JSON.parse(quote.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data.offers, undefined);
  assert.doesNotMatch(quote.body, /buy-price|product-district/);
  const quoteHome = await fixture({ sales: false })('/');
  assert.doesNotMatch(quoteHome.body, /id="home-district"/);
  const redirect = await fixture()('/personalizar.html');
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.Location, '/catalogo.html');
});

test('quote mode always hides prices before JavaScript runs', async () => {
  const legacySetting = await fixture({ sales: false, hidePrices: false })('/catalogo.html');
  const hidden = await fixture({ sales: false, hidePrices: true })('/catalogo.html');
  assert.doesNotMatch(legacySetting.body, /<p>S\/ 100\.00<\/p>/);
  assert.doesNotMatch(hidden.body, /<p>S\/ 100\.00<\/p>/);
});

test('business structured data uses the configured contact phone', async () => {
  const previous = process.env.BUSINESS_PHONE;
  try {
    process.env.BUSINESS_PHONE = '+51 999 111 222';
    const home = await fixture()('/');
    const data = JSON.parse(home.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(data.telephone, '+51999111222');
    process.env.BUSINESS_PHONE = 'pending';
    const invalid = await fixture()('/');
    const invalidData = JSON.parse(invalid.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(invalidData.telephone, undefined);
  } finally {
    if (previous === undefined) delete process.env.BUSINESS_PHONE;
    else process.env.BUSINESS_PHONE = previous;
  }
});

test('legal and claims pages render provider details before JavaScript and escape configured text', async () => {
  const previous = process.env.BUSINESS_COMMERCIAL_NAME;
  try {
    process.env.BUSINESS_COMMERCIAL_NAME = '<script>alert(1)</script>';
    const read = fixture();
    for (const route of ['/politicas.html', '/reclamaciones.html']) {
      const page = await read(route);
      assert.match(page.body, /class="provider-card"/);
      assert.match(page.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
      assert.doesNotMatch(page.body, /<h3><script>/);
    }
  } finally {
    if (previous === undefined) delete process.env.BUSINESS_COMMERCIAL_NAME;
    else process.env.BUSINESS_COMMERCIAL_NAME = previous;
  }
});
