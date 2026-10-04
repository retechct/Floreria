const crypto = require("node:crypto");
const fs = require('node:fs');
const path = require('node:path');
const products = require("../data/products.json");

const optimizedAssets = new Set(['products', 'thumbs'].flatMap(folder => {
  const directory = path.join(__dirname, '..', 'public', 'assets', 'edited', folder);
  try { return fs.readdirSync(directory).filter(name => name.endsWith('.webp')).map(name => `${folder}/${name}`); }
  catch { return []; }
}));
function publicImage(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/^(\/?public\/assets\/edited\/(products|thumbs)\/)([a-zA-Z0-9_-]+)\.(?:jpe?g|png)$/i);
  return match && optimizedAssets.has(`${match[2]}/${match[3]}.webp`) ? `${match[1]}${match[3]}.webp` : value;
}

const text = (value, max = 180) => String(value ?? "").trim().slice(0, max);
const slug = (value) => text(value, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const baseCategories = ["Ramos", "Boxes", "Girasoles", "Tulipanes", "Preservadas", "Regalos", "De autor"];
const categoryHeroes = { Ramos: "ramo-love", Boxes: "box-amber", Girasoles: "radiante-sol", Tulipanes: "tulips-love", Preservadas: "rosas-eternas", Regalos: "box-corazon", "De autor": "brunebox" };
const flowerTypes = [
  ["rosas", "Rosas", "rosa", "ramo-love", "Rosas clásicas y de jardín para expresar amor, gratitud y celebración.", "public/assets/flowers/rosas-single.webp"],
  ["girasoles", "Girasoles", "girasol", "radiante-sol", "Girasoles luminosos para cumpleaños, agradecimientos y nuevos comienzos.", "public/assets/flowers/girasoles-single.webp"],
  ["tulipanes", "Tulipanes", "tulipan", "tulips-love", "Tulipanes de líneas delicadas para regalos modernos y elegantes.", "public/assets/flowers/tulipanes-single.webp"],
  ["orquideas", "Orquídeas", "orquidea", "orquidia-phalaenopsis", "Orquídeas distinguidas para hogares, oficinas y ocasiones especiales.", "public/assets/flowers/orquideas-single.webp"],
  ["hortensias", "Hortensias", "hortensia", "ramos-dulcinea", "Hortensias de volumen suave para composiciones románticas y sofisticadas.", "public/assets/flowers/hortensias-single.webp"],
  ["gerberas", "Gerberas", "gerbera", "box-dulce", "Gerberas llenas de color para celebrar y transmitir alegría.", "public/assets/flowers/gerberas-single.webp"],
  ["claveles", "Claveles", "clavel", "ramo-pureza", "Claveles versátiles y duraderos en arreglos delicados y expresivos.", "public/assets/flowers/claveles-single.webp"],
  ["astromelias", "Astromelias", "astromelia", "ramo-aurora", "Astromelias frescas y coloridas que simbolizan amistad y buenos deseos.", "public/assets/flowers/astromelias-single.webp"],
];
const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function matchesFlower(product, flower) {
  if (!flower) return true;
  const query = normalizeSearch(typeof flower === 'string' ? flower : flower.query);
  return normalizeSearch(`${product.name} ${product.category} ${product.description}`).includes(query);
}
const occasions = [
  ["Cumplea\u00f1os", "Cumplea\u00f1os", "box-butterfly", "Flores, boxes, globos y regalos alegres para celebrar su d\u00eda.", (p) => p.occasion === "Cumplea\u00f1os"],
  ["Amor y aniversario", "Amor", "ramo-love", "Rosas y detalles rom\u00e1nticos para aniversarios, pedidas y fechas en pareja.", (p) => p.occasion === "Amor"],
  ["Para mam\u00e1", "Mam\u00e1", "box-mama", "Arreglos delicados para agradecer, acompa\u00f1ar y celebrar a mam\u00e1.", (p) => p.occasion === "Mam\u00e1" || ["box-princesa", "ramo-aurora", "ramo-pureza", "tulips-love", "kataleya", "linda-flor"].includes(p.id)],
  ["Graduaci\u00f3n y logros", "Graduaci\u00f3n", "ramo-pink", "Ramos luminosos para graduaciones, ascensos y nuevas etapas.", (p) => p.occasion === "Graduaci\u00f3n" || ["box-amber", "radiante-sol", "ramo-genesis", "box-beatriz", "ramo-antuanet", "ramo-alegria"].includes(p.id)],
  ["Bienvenida beb\u00e9", "Nacimiento", "baby-ramo", "Flores suaves y regalos tiernos para nacimientos y baby showers.", (p) => ["baby-love", "baby-ramo", "rabbit", "java-corazon", "java-encanto", "box-bella", "amanecer", "alegria-preservada"].includes(p.id)],
  ["Agradecimiento", "Agradecimiento", "tacita-de-amor", "Detalles para decir gracias, reconocer un gesto o acompa\u00f1ar a alguien especial.", (p) => p.occasion === "Detalle" || ["ramo-pureza", "orquidia-phalaenopsis", "linda-flor"].includes(p.id)],
  ["Para sorprender", "Sorpresa", "box-corazon", "Boxes, flores y complementos para convertir un d\u00eda cotidiano en un recuerdo.", (p) => ["Regalos", "Boxes"].includes(p.category) || p.occasion === "Detalle"],
  ["Flores que perduran", "Eterno", "rosas-eternas", "Rosas y flores preservadas que conservan el recuerdo durante mucho m\u00e1s tiempo.", (p) => p.occasion === "Eterno" || p.category === "Preservadas"],
  ["Celebraciones elegantes", "Elegante", "orquidia-phalaenopsis", "Orqu\u00eddeas y composiciones de autor para eventos y gestos distinguidos.", (p) => ["Elegante", "De autor"].includes(p.occasion)],
];
const seasonalCollections = [
  ["season-san-valentin", "San Valent\u00edn · 14 de febrero", "Rosas y detalles para celebrar el amor y la amistad.", "ramo-love", (p) => p.occasion === "Amor"],
  ["season-mujer", "D\u00eda de la Mujer · 8 de marzo", "Flores elegantes para reconocer, agradecer y celebrar a mujeres importantes.", "ramo-aurora", (p) => ["Detalle", "Elegante", "De autor"].includes(p.occasion)],
  ["season-secretaria", "D\u00eda de la Secretaria · 26 de abril", "Detalles florales profesionales para agradecer dedicaci\u00f3n y compromiso.", "orquidia-phalaenopsis", (p) => ["Detalle", "Elegante"].includes(p.occasion) || p.category === "Boxes"],
  ["season-madre", "D\u00eda de la Madre · segundo domingo de mayo", "Ramos, boxes y flores especiales para mam\u00e1.", "box-mama", (p) => p.occasion === "Mam\u00e1" || ["Boxes", "Tulipanes"].includes(p.category)],
  ["season-padre", "D\u00eda del Padre · tercer domingo de junio", "Regalos, boxes y arreglos sobrios para reconocer a pap\u00e1.", "java-corazon", (p) => ["box-yeilu", "java-corazon", "box-corazon", "ramo-for-you", "radiante-sol", "superbox", "box-amber"].includes(p.id)],
  ["season-maestro", "D\u00eda del Maestro · 6 de julio", "Girasoles y detalles luminosos para agradecer a quienes dejan huella.", "radiante-sol", (p) => p.category === "Girasoles" || p.occasion === "Detalle"],
  ["season-primavera", "Primavera y Juventud · 23 de septiembre", "Girasoles, tulipanes y colores vivos para celebrar la renovaci\u00f3n.", "box-amber", (p) => ["Girasoles", "Tulipanes"].includes(p.category)],
  ["season-navidad", "Navidad y fin de a\u00f1o · diciembre", "Regalos florales para agradecer, celebrar y cerrar el a\u00f1o.", "box-corazon", (p) => ["Regalos", "Preservadas", "Boxes"].includes(p.category)],
];
const legacySeasonTargets = {
  "rosas-gesto-grande": "season-san-valentin",
  "sol-celebracion": "season-primavera",
  "tulipanes-atelier": "season-primavera",
  "flores-que-quedan": "season-navidad",
};
const catalogMigrationVersion = 5;
const featuredIds = ["ramo-love", "brunebox", "ramos-dulcinea", "box-amber", "tulips-love", "box-bella", "kataleya", "box-corazon"];

function seedCatalog() {
  return {
    revision: 0,
    products: products.map((p) => ({ ...p, images: [p.image], specifications: [], status: "published", available: true, featured: featuredIds.includes(p.id), isPromotion: false, compareAtPrice: null, sku: p.id.toUpperCase() })),
    categories: baseCategories.map((name) => ({ id: slug(name), name, image: products.find((product) => product.id === categoryHeroes[name])?.image || "public/assets/premium/products/ramo-love.webp" })),
    collections: [
      ...seasonalCollections.map(([id, title, description, heroId, filter]) => { const matches = products.filter(filter); return { id, title, description, image: products.find((product) => product.id === heroId)?.image || matches[0]?.image || "public/assets/premium/products/ramo-love.webp", status: "published", productIds: matches.map((p) => p.id) }; }),
      ...occasions.map(([title, occasion, heroId, description, filter]) => { const matches = products.filter(filter); return { id: `occasion-${slug(title)}`, title, occasion, description, image: products.find((product) => product.id === heroId)?.image || matches[0]?.image || "public/assets/premium/products/ramo-love.webp", status: "published", productIds: matches.map((p) => p.id) }; }),
    ],
  };
}

function migrateCatalog(catalog) {
  if (catalog.catalogMigrationVersion >= catalogMigrationVersion || !Array.isArray(catalog.collections)) return false;
  const seeded = seedCatalog();
  const seededProducts = new Map(seeded.products.map((product) => [product.id, product]));
  const seededCategories = new Map(seeded.categories.map((category) => [category.id, category]));
  const seededCollections = new Map(seeded.collections.map((collection) => [collection.id, collection]));
  catalog.products = catalog.products.map((product) => {
    if (!/^\/?public\/assets\/edited\/products\//.test(product.image || "")) return product;
    const replacement = seededProducts.get(product.id)?.image;
    return replacement ? { ...product, image: replacement, images: (product.images || []).map((image, index) => index === 0 ? replacement : image) } : product;
  });
  catalog.categories = (catalog.categories || []).map((category) => /^\/?public\/assets\/edited\/thumbs\//.test(category.image || "") ? { ...category, image: seededCategories.get(category.id)?.image || category.image } : category);
  const legacy = catalog.collections.filter((collection) => legacySeasonTargets[collection.id]);
  const seededSeasons = new Map(seeded.collections.filter((collection) => collection.id.startsWith("season-")).map((collection) => [collection.id, collection]));
  let collections = catalog.collections.filter((collection) => !legacySeasonTargets[collection.id]);
  for (const oldCollection of legacy) {
    const targetId = legacySeasonTargets[oldCollection.id];
    let target = collections.find((collection) => collection.id === targetId);
    if (!target) {
      target = structuredClone(seededSeasons.get(targetId));
      if (!target) continue;
      target.productIds = [];
      collections.push(target);
    }
    target.productIds = [...new Set([...target.productIds, ...(oldCollection.productIds || [])])];
  }
  const currentOccasions = seeded.collections.filter((collection) => collection.id.startsWith("occasion-"));
  collections = [...collections.filter((collection) => !collection.id.startsWith("occasion-") && collection.id !== "season-graduaciones"), ...currentOccasions];
  collections = collections.map((collection) => {
    const replacement = seededCollections.get(collection.id);
    if (collection.id.startsWith("season-") && replacement) return structuredClone(replacement);
    return /^\/?public\/assets\/edited\/thumbs\//.test(collection.image || "") ? { ...collection, image: replacement?.image || collection.image } : collection;
  });
  for (const season of seededSeasons.values()) {
    if (!collections.some((collection) => collection.id === season.id)) collections.push(structuredClone(season));
  }
  catalog.collections = collections;
  catalog.catalogMigrationVersion = catalogMigrationVersion;
  return true;
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
  const stock = input.stock === '' || input.stock == null ? null : Number(input.stock);
  if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > 99999)) fail('El stock debe ser un entero entre 0 y 99999, o quedar vacio para productos hechos a pedido.');
  return {
    id: existing?.id || `${slug(name) || "producto"}-${crypto.randomBytes(3).toString("hex")}`,
    name, description, price, compareAtPrice, category, images, image: images[0] || "",
    specifications, sku, status, occasion: text(input.occasion, 64), badge: text(input.badge, 40),
    available: input.available !== false, stock, featured: input.featured === true,
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
  const published = catalog.products.filter((p) => p.status === "published").map(p => ({ ...p, available: p.available !== false && p.stock !== 0, image: publicImage(p.image), images: p.images?.map(publicImage) || [] }));
  const ids = new Set(published.map((p) => p.id));
  const flowers = flowerTypes.map(([id, title, query, heroId, description, filterImage]) => {
    const matches = published.filter((product) => matchesFlower(product, query));
    return { id, title, query, description, filterImage, image: publicImage(published.find((product) => product.id === heroId)?.image || matches[0]?.image || "public/assets/premium/products/ramo-love.webp"), count: matches.length, productIds: matches.map((product) => product.id) };
  }).filter((flower) => flower.count);
  return { revision: catalog.revision, products: published, categories: catalog.categories.map(c => ({ ...c, image: publicImage(c.image) })), collections: catalog.collections.filter((c) => c.status === "published").map((c) => ({ ...c, image: publicImage(c.image), productIds: c.productIds.filter((id) => ids.has(id)) })), flowers };
}

module.exports = { catalogMigrationVersion, seedCatalog, migrateCatalog, publicCatalog, normalizeProduct, normalizeCollection, normalizeCategory, imageUrl, matchesFlower, fail };
