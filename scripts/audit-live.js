require('../lib/env').loadLocalEnv();
async function main() {
  const input = process.argv[2] || process.env.SITE_URL;
  if (!input) throw new Error('Indica la URL publica: npm run audit:live -- https://tu-dominio');
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Usa un origen HTTPS sin credenciales ni rutas.');
  let failures = 0;
  const check = (ok, label) => { console.log(`${ok ? 'OK' : 'PENDIENTE'}: ${label}`); if (!ok) failures++; };
  const get = path => fetch(new URL(path, url), { redirect: 'error', signal: AbortSignal.timeout(15000) });
  const home = await get('/');
  check(home.status === 200, 'Portada accesible');
  const policy = home.headers.get('content-security-policy') || '';
  check(/script-src 'self'/.test(policy) && !/script-src[^;]*(?:unsafe-inline|unsafe-eval)/.test(policy), 'Restriccion de scripts activa');
  check(home.headers.has('strict-transport-security'), 'HTTPS persistente');
  const html = await home.text();
  check(/rel="canonical"/.test(html), 'URL canonica presente');
  const stylesheet = html.match(/href="([^" ]*generated\/storefront\.css[^" ]*)"/)?.[1];
  check(Boolean(stylesheet) && (await get('/' + stylesheet.replace(/^\//, ''))).status === 200, 'CSS compilado publicado');
  const health = await get('/api/health'); check(health.ok && (await health.json()).ok === true, 'Servidor y almacenamiento disponibles');
  const catalog = await get('/api/catalog'); check(catalog.ok && Array.isArray((await catalog.json()).products), 'Catalogo compartido accesible');
  const settings = await (await get('/api/store-settings')).json();
  console.log(`MODO PUBLICO: ${settings.settings?.sales_enabled ? 'ventas online' : 'cotizacion'}`);
  check((await get('/api/admin/catalog')).status === 401, 'Catalogo privado requiere autenticacion');
  for (const file of ['/.env.admin', '/.admin-access.txt', '/lib/customer-auth.js']) check((await get(file)).status === 404, `Archivo privado inaccesible: ${file}`);
  check((await get('/sitemap.xml')).status === 200, 'Sitemap disponible');
  console.log('Esta auditoria es de solo lectura. Faltan pruebas autenticadas de correo, MFA y persistencia desde el panel.');
  process.exitCode = failures ? 1 : 0;
}
main().catch(error => { console.error(`No se pudo completar la auditoria: ${error.message}`); process.exitCode = 1; });
