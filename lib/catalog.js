const crypto = require("node:crypto");
const products = require("../data/products.json");

const text = (value, max = 180) => String(value ?? "").trim().slice(0, max);
const slug = (value) => text(value, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const baseCategories = ["Ramos", "Boxes", "Girasoles", "Tulipanes", "Preservadas", "Regalos", "De autor"];
const thumbs = { Ramos: "rosas", Boxes: "boxes", Girasoles: "girasoles", Tulipanes: "tulipanes", Preservadas: "preservadas", Regalos: "regalos", "De autor": "orquideas" };
const occasions = [
  ["Cumplea\u00f1os", "Cumplea\u00f1os", "cumpleanos"], ["Amor", "Amor", "amor"],
  ["Graduaci\u00f3n", "Graduaci\u00f3n", "graduacion"], ["Detalles", "Detalle", "detalles"],
  ["De autor", "De autor", "de-autor"], ["Eternas", "Eterno", "eternas"],
  ["Elegante", "Elegante", "elegante"], ["Regalos", "Detalle", "regalos"],
];
const featuredIds = ["ramo-love", "brunebox", "ramos-dulcinea", "box-amber", "tulips-love", "box-bella", "kataleya", "box-corazon"];

function seedCatalog() {
  return {
    revision: 0,
    products: products.map((p) => ({ ...p, images: [p.image], specifications: [], status: "published", available: true, featured: featuredIds.includes(p.id), isPromotion: false, compareAtPrice: null, sku: p.id.toUpperCase() })),
    categories: baseCategories.map((name) => ({ id: slug(name), name, image: `public/assets/edited/thumbs/flor-${thumbs[name]}.jpg` })),
    collections: [
      ...[
        ["rosas-gesto-grande", "Rosas con gesto grande", "Ramos", "rosas"],
        ["sol-celebracion", "Sol y celebracion", "Girasoles", "girasoles"],
        ["tulipanes-atelier", "Tulipanes de atelier", "Tulipanes", "tulipanes"],
        ["flores-que-quedan", "Flores que quedan", "Preservadas", "preservadas"],
      ].map(([id, title, category, thumb]) => ({ id, title, description: `Arreglos de ${category.toLowerCase()} para regalar.`, image: `public/assets/edited/thumbs/flor-${thumb}.jpg`, status: "published", productIds: products.filter((p) => p.category === category).map((p) => p.id) })),
      ...occasions.map(([title, occasion, thumb]) => ({ id: `occasion-${slug(title)}`, title, occasion, description: `Flores y detalles para ${title.toLowerCase()}.`, image: `public/assets/edited/thumbs/ocasion-${thumb}.jpg`, status: "published", productIds: products.filter((p) => p.occasion === occasion).map((p) => p.id) })),
    ],
  };
}

function imageUrl(value, required = true) {
  const url = text(value, 1000);
  if (!url && !required) return "";
  if (/^(?:\/?public\/assets\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)|\/api\/media\/[a-f0-9]{64})$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password && !/["<>\s]/.test(url)) return parsed.href;
  } catch {}
  return fail("La imagen debe ser una foto cargada o una URL HTTPS valida.");
}

function normalizeProduct(input, catalog, existing) {
  const name = text(input.name, 120);
  const description = text(input.description, 5000);
  const price = Number(input.price);
  if (!name || !description) fail("Completa el nombre y la descripcion del producto.");
  if (!Number.isFinite(price) || price <= 0 || price > 99999 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001) fail("El precio debe ser mayor que cero y tener hasta dos decimales.");
  const category = text(input.category, 64);
  if (!catalog.categories.some((c) => c.name === category)) fail("Selecciona una categoria existente.");
  const status = input.status || "draft";
  if (!["draft", "published", "archived"].includes(status)) fail("Estado de producto invalido.");
  if (!Array.isArray(input.images) || input.images.length > 3) fail("Cada producto admite hasta tres imagenes.");
  const images = [...new Set(input.images.filter(Boolean).map((url) => imageUrl(url)))];
  // Existing one-photo catalog entries remain editable; newly published entries require a real gallery.
  const legacyGallery = existing?.status === "published" && existing.images.length === 1 && images.length === 1 && images[0] === existing.images[0];
  if (status === "published" && images.length < 2 && !legacyGallery) fail("Agrega dos o tres imagenes diferentes antes de publicar.");
  const compareAtPrice = input.compareAtPrice === "" || input.compareAtPrice == null ? null : Number(input.compareAtPrice);
  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= price || compareAtPrice > 99999 || Math.abs(compareAtPrice * 100 - Math.round(compareAtPrice * 100)) > 0.00001)) fail("El precio anterior debe superar al precio de venta y tener hasta dos decimales.");
  if (!Array.isArray(input.specifications) || input.specifications.length > 20) fail("Puedes agregar hasta 20 especificaciones.");
  const specifications = input.specifications.map((spec) => ({ label: text(spec.label, 80), value: text(spec.value, 400) }));
  if (specifications.some((spec) => !spec.label || !spec.value)) fail("Completa el nombre y valor de cada especificacion.");
  const sku = text(input.sku, 64);
  if (sku && catalog.products.some((p) => p.id !== existing?.id && p.sku?.toLowerCase() === sku.toLowerCase())) fail("Ya existe un producto con ese SKU.", 409);
  return {
    id: existing?.id || `${slug(name) || "producto"}-${crypto.randomBytes(3).toString("hex")}`,
    name, description, price, compareAtPrice, category, images, image: images[0] || "",
    specifications, sku, status, occasion: text(input.occasion, 64), badge: text(input.badge, 40),
    available: input.available !== false, featured: input.featured === true,
    isPromotion: input.isPromotion === true || compareAtPrice !== null,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCollection(input, catalog, existing) {
  const title = text(input.title, 100);
  if (!title) fail("Escribe el nombre de la coleccion.");
  if (catalog.collections.some((c) => c.id !== existing?.id && c.title.toLowerCase() === title.toLowerCase())) fail("Ya existe esa coleccion.", 409);
  if (!Array.isArray(input.productIds)) fail("Seleccion de productos invalida.");
  const productIds = [...new Set(input.productIds)];
  if (productIds.some((id) => !catalog.products.some((p) => p.id === id))) fail("La coleccion incluye un producto que ya no existe.");
  const status = input.status || "draft";
  if (!["draft", "published"].includes(status)) fail("Estado de coleccion invalido.");
  return { id: existing?.id || `${slug(title)}-${crypto.randomBytes(3).toString("hex")}`, title, description: text(input.description, 2000), image: imageUrl(input.image, false), productIds, status, occasion: text(input.occasion, 64) };
}

function normalizeCategory(input, catalog, existing) {
  const name = text(input.name, 64);
  if (!name || name.toLowerCase() === "todos") fail("Escribe un nombre de categoria valido.");
  if (catalog.categories.some((c) => c.id !== existing?.id && c.name.toLowerCase() === name.toLowerCase())) fail("Ya existe esa categoria.", 409);
  return { id: existing?.id || `${slug(name)}-${crypto.randomBytes(3).toString("hex")}`, name, image: imageUrl(input.image, false) };
}

function publicCatalog(catalog) {
  const published = catalog.products.filter((p) => p.status === "published");
  const ids = new Set(published.map((p) => p.id));
  return { revision: catalog.revision, products: published, categories: catalog.categories, collections: catalog.collections.filter((c) => c.status === "published").map((c) => ({ ...c, productIds: c.productIds.filter((id) => ids.has(id)) })) };
}

module.exports = { seedCatalog, publicCatalog, normalizeProduct, normalizeCollection, normalizeCategory, imageUrl, fail };
