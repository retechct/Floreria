const path = require("node:path");
const { loadLocalEnv } = require("../lib/env");
const { culqiConfig } = require("../lib/culqi");
const { createStore } = require("../lib/store");
const { createShipping } = require("../lib/shipping");
const { seedCatalog } = require("../lib/catalog");
loadLocalEnv();

async function main() {
  let failures = 0;
  function check(ok, message) { console.log(`${ok ? "OK" : "PENDIENTE"}: ${message}`); if (!ok) failures++; }
  const value = (key) => process.env[key] || "";
  let site;
  try { site = new URL(value("SITE_URL")); } catch {}
  check(site?.protocol === "https:" && !/localhost|127\.0\.0\.1|tudominio|example\./.test(site?.hostname) && !site?.username && !site?.password && site?.pathname === "/", "SITE_URL con el dominio publico HTTPS, sin rutas ni credenciales");
  check(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value("ADMIN_PASSWORD_HASH")), "Contrasena del administrador configurada como hash scrypt");
  check(value("ADMIN_SESSION_SECRET").length >= 32, "Secreto de sesion del administrador configurado");
  const config = culqiConfig();
  check(config.configured, "Llaves publica y secreta de Culqi del mismo entorno");
  check(config.mode === "live", "Llaves Culqi de produccion (activar solo despues de las pruebas en modo test)");
  check(/^[A-Za-z0-9_-]{32,128}$/.test(value("CULQI_WEBHOOK_SECRET")), "Secreto privado para el webhook de Culqi");
  check(Boolean(value("DATABASE_URL")) || (!process.env.VERCEL && path.isAbsolute(value("DATA_DIR"))), "PostgreSQL o DATA_DIR absoluto en un volumen persistente de un unico proceso Node");
  for (const key of ["BUSINESS_COMMERCIAL_NAME", "BUSINESS_LEGAL_NAME", "BUSINESS_RUC", "BUSINESS_ADDRESS", "BUSINESS_EMAIL", "BUSINESS_CLAIMS_EMAIL", "BUSINESS_PHONE"]) {
    const current = value(key);
    check(Boolean(current) && !/tu_|tudominio|example\./i.test(current), `${key} con los datos reales del comercio`);
  }
  const store = createStore();
  try {
    await store.init();
    console.log("OK: conexion con el almacenamiento");
    const shipping = await createShipping(store).get();
    check(shipping.districts.some((d) => d.enabled && d.fee !== null), "Al menos un distrito habilitado con tarifa");
    console.log(`REVISAR: ${shipping.districts.filter((d) => d.fee === null).length} distritos aun sin tarifa; no aceptan pedidos.`);
    const catalog = await store.read("catalog", seedCatalog());
    console.log(`REVISAR: ${catalog.products.filter((p) => p.status === "published" && p.images.length < 2).length} productos publicados conservan menos de dos fotos.`);
  } catch { check(false, "No se pudo conectar al almacenamiento; revisa su configuracion privada"); }
  finally { await store.close(); }
  console.log("MANUAL: registrar y comprobar el webhook, probar Culqi test con 3DS y rechazo, revisar datos comerciales, DNS, HTTPS y respaldos.");
  console.log(failures ? `${failures} configuraciones pendientes. No activar ventas reales todavia.` : "Configuracion presente. Falta completar las verificaciones manuales anteriores.");
  process.exitCode = failures ? 1 : 0;
}
main().catch(() => { console.error("No se pudo completar la verificacion de publicacion."); process.exitCode = 1; });
