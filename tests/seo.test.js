const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createSeo } = require('../lib/seo');
const product = { id: 'rosa', name: 'Ramo <rosa>', description: 'Flores & detalles', status: 'published', price: 100, available: true, image: '/public/rosa.jpg' };
function fixture({ broken = false, sales = true, hidePrices = true } = {}) {
  const seo = createSeo({
    getCatalog: async () => { if (broken) throw new Error('offline'); return { products: [product, { ...product, id: 'draft', status: 'draft' }], categories: [], collections: [] }; },
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
test('missing products are 404, outages are 503 and quote mode does not advertise offers', async () => {
  assert.equal((await fixture()('/producto.html?id=missing')).status, 404);
  assert.equal((await fixture({ broken: true })('/producto.html?id=rosa')).status, 503);
  assert.equal((await fixture({ broken: true })('/sitemap.xml')).status, 503);
  const quote = await fixture({ sales: false })('/producto.html?id=rosa');
  const data = JSON.parse(quote.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(data.offers, undefined);
  const redirect = await fixture()('/personalizar.html');
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.Location, '/catalogo.html');
});

test('quote mode renders the configured price visibility before JavaScript runs', async () => {
  const visible = await fixture({ sales: false, hidePrices: false })('/catalogo.html');
  const hidden = await fixture({ sales: false, hidePrices: true })('/catalogo.html');
  assert.match(visible.body, /<p>S\/ 100\.00<\/p>/);
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
