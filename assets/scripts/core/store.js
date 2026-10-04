// Explicit module dependencies; no shared browser globals.
import { readPublicData } from "./http.js";

const BRAND = {
  name: "PLUM",
  phone: "51947370668",
  location: "Lima, Peru",
};

let ALL_PRODUCTS = [];
let CATEGORIES = ["Todos"];
let OCCASIONS = [];
let FLOWER_GROUPS = [];
let catalogCollections = [];
const productMap = new Map();
const featuredRank = new Map();
const cartKey = "la-casa-cart-v1";
const checkoutOrderKey = "la-casa-last-order-v1";

let DISTRICTS = [];
let STORE_SETTINGS = {
  sales_enabled: false,
  hide_prices_when_closed: true,
  quote_phone: BRAND.phone,
  quote_message: "Hola, quiero cotizar este arreglo.",
};

function primeStoreSettingsFromDocument() {
  const source = document.body?.dataset;
  if (!source || !Object.hasOwn(source, "storeSales")) return;
  STORE_SETTINGS = {
    ...STORE_SETTINGS,
    sales_enabled: source.storeSales === "true",
    quote_phone: source.storeQuotePhone || STORE_SETTINGS.quote_phone,
    quote_message: source.storeQuoteMessage || STORE_SETTINGS.quote_message,
  };
}

async function loadStoreSettings() {
  const payload = await readPublicData("/api/store-settings");
  STORE_SETTINGS = { ...STORE_SETTINGS, ...payload.settings };
}

let shippingLoaded = false;
async function loadShipping() {
  const shipping = await readPublicData("/api/shipping");
  if (!Array.isArray(shipping.districts)) throw new Error("No se pudieron cargar los envíos.");
  DISTRICTS = shipping.districts;
  shippingLoaded = true;
}

async function loadCatalog() {
  const catalog = await readPublicData("/api/catalog");
  if (![catalog.products, catalog.categories, catalog.collections].every(Array.isArray)) {
    throw new Error("El catálogo no está disponible. Inténtalo de nuevo.");
  }
  ALL_PRODUCTS = catalog.products.map((p) => ({ ...p, isAdminPromotion: p.isPromotion }));
  CATEGORIES = ["Todos", ...catalog.categories.map((c) => c.name)];
  catalogCollections = catalog.collections;
  productMap.clear();
  ALL_PRODUCTS.forEach((p) => productMap.set(p.id, p));
  OCCASIONS = catalog.collections.filter((c) => c.id?.startsWith("occasion-")).map((c) => ({
    title: c.title, query: c.occasion || c.title, image: c.image || productMap.get(c.productIds?.[0])?.image || "public/assets/premium/products/ramo-love.webp",
    description: c.description || "Una selección floral creada para este momento.",
    count: c.productIds?.length || 0,
    productIds: c.productIds || [],
    href: `catalogo.html?ocasion=${encodeURIComponent(c.occasion || c.title)}`,
  }));
  FLOWER_GROUPS = (catalog.flowers || []).map((flower) => ({
    ...flower,
    href: `flores.html?flor=${encodeURIComponent(flower.id)}`,
  }));
  featuredRank.clear();
  ALL_PRODUCTS.filter((p) => p.featured || p.isPromotion).forEach((p, i) => featuredRank.set(p.id, i));
}

function managedCollections() {
  return catalogCollections
    .filter((collection) => !collection.id?.startsWith("occasion-"))
    .map((c) => ({ ...c, text: c.description, ids: c.productIds, href: `catalogo.html?coleccion=${encodeURIComponent(c.id)}` }));
}

function collectionProductIds(collection) {
  return (collection.productIds || collection.ids || []).filter((id) => productMap.has(id));
}

function salesOpen() {
  return STORE_SETTINGS.sales_enabled !== false;
}

function showPrices() {
  return salesOpen();
}

function quoteUrl(product = null) {
  const parts = [STORE_SETTINGS.quote_message || "Hola, quiero cotizar este arreglo."];
  if (product?.name) parts.push(`Producto: ${product.name}`);
  if (product?.id && !String(product.id).startsWith("personalizado-")) parts.push(`${location.origin}/producto.html?id=${product.id}`);
  return `https://wa.me/${STORE_SETTINGS.quote_phone || BRAND.phone}?text=${encodeURIComponent(parts.join("\n"))}`;
}

export { BRAND, ALL_PRODUCTS, CATEGORIES, OCCASIONS, FLOWER_GROUPS, catalogCollections, productMap, featuredRank, cartKey, checkoutOrderKey, DISTRICTS, STORE_SETTINGS, primeStoreSettingsFromDocument, loadStoreSettings, shippingLoaded, loadShipping, loadCatalog, managedCollections, collectionProductIds, salesOpen, showPrices, quoteUrl };
