const BRAND = {
  name: "La Casa de las Flores Atelier",
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
  sales_enabled: true,
  hide_prices_when_closed: true,
  quote_phone: BRAND.phone,
  quote_message: "Hola, quiero cotizar este arreglo.",
};

async function loadStoreSettings() {
  try {
    const response = await fetch("/api/store-settings", { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const payload = await response.json();
    if (response.ok && payload.ok) STORE_SETTINGS = { ...STORE_SETTINGS, ...payload.settings };
  } catch {}
}

async function loadCatalog() {
  const response = await fetch("/api/catalog", { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const catalog = await response.json();
  if (!response.ok || !catalog.ok) throw new Error(catalog.message || "No se pudo cargar el catalogo.");
  try {
    const response = await fetch("/api/shipping", { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const shipping = await response.json();
    if (response.ok && shipping.ok) DISTRICTS = shipping.districts;
  } catch { DISTRICTS = []; }
  ALL_PRODUCTS = catalog.products.map((p) => ({ ...p, isAdminPromotion: p.isPromotion }));
  CATEGORIES = ["Todos", ...catalog.categories.map((c) => c.name)];
  catalogCollections = catalog.collections;
  productMap.clear();
  ALL_PRODUCTS.forEach((p) => productMap.set(p.id, p));
  OCCASIONS = catalog.collections.filter((c) => c.id?.startsWith("occasion-")).map((c) => ({
    title: c.title, query: c.occasion || c.title, image: c.image || productMap.get(c.productIds[0])?.image || "public/assets/edited/thumbs/ocasion-regalos.jpg",
    href: `catalogo.html?coleccion=${encodeURIComponent(c.id)}`,
  }));
  FLOWER_GROUPS = catalog.categories.map((c) => ({
    title: c.name, href: `catalogo.html?categoria=${encodeURIComponent(c.name)}`,
    image: c.image || "public/assets/edited/thumbs/flor-regalos.jpg",
  }));
  featuredRank.clear();
  ALL_PRODUCTS.filter((p) => p.featured || p.isPromotion).forEach((p, i) => featuredRank.set(p.id, i));
}

function managedCollections() {
  return catalogCollections.filter((c) => !c.id?.startsWith("occasion-")).map((c) => ({ ...c, text: c.description, ids: c.productIds, href: `catalogo.html?coleccion=${encodeURIComponent(c.id)}` }));
}

function collectionProductIds(collection) {
  return (collection.productIds || collection.ids || []).filter((id) => productMap.has(id));
}

function money(value) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(value));
}

function salesOpen() {
  return STORE_SETTINGS.sales_enabled !== false;
}

function showPrices() {
  return salesOpen() || STORE_SETTINGS.hide_prices_when_closed === false;
}

function quoteUrl(product = null) {
  const parts = [STORE_SETTINGS.quote_message || "Hola, quiero cotizar este arreglo."];
  if (product?.name) parts.push(`Producto: ${product.name}`);
  if (product?.id && !String(product.id).startsWith("personalizado-")) parts.push(`${location.origin}/producto.html?id=${product.id}`);
  return `https://wa.me/${STORE_SETTINGS.quote_phone || BRAND.phone}?text=${encodeURIComponent(parts.join("\n"))}`;
}

function quoteButton(product, classes = "btn small") {
  return `<a class="${classes}" href="${quoteUrl(product)}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}Cotizar</a>`;
}

function todayInLima() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function reconcileCart() {
  const saved = getCart();
  const remaining = saved.filter((item) => item && Number.isInteger(item.qty) && item.qty > 0 && itemProduct(item));
  if (remaining.length !== saved.length) {
    localStorage.setItem(cartKey, JSON.stringify(remaining));
    toast("Se retiraron de tu cesta los productos que ya no estan publicados.");
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function getCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCartCount();
  renderCartDrawer();
}

function addToCart(id, qty = 1, note = "", custom = null) {
  if (!salesOpen()) {
    const product = custom || productMap.get(id);
    window.open(quoteUrl(product), "_blank", "noopener,noreferrer");
    return;
  }
  const cart = getCart();
  const addedProduct = custom || productMap.get(id);
  if (!addedProduct || addedProduct.available === false) return toast("Este producto no esta disponible.");
  if (custom) {
    cart.push({ id: custom.id, qty, note, custom });
  } else {
    const found = cart.find((item) => item.id === id && !item.custom && item.note === note);
    if (found) {
      found.qty = Math.min(20, found.qty + qty);
    } else {
      cart.push({ id, qty, note });
    }
  }
  saveCart(cart);
  toast(`${addedProduct?.name || "Arreglo"} agregado a tu seleccion`);
  openCartDrawer();
}

function itemProduct(item) {
  return item.custom?.admin_promotion ? productMap.get(item.id) : item.custom || productMap.get(item.id);
}

function cartTotals(cart = getCart()) {
  return cart.reduce((sum, item) => {
    const product = itemProduct(item);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function renderCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = count;
    node.setAttribute("aria-label", `${count} productos en el carrito`);
  });
}

function cartEntries(cart = getCart()) {
  return cart
    .map((item, index) => ({ item, index, product: itemProduct(item) }))
    .filter((entry) => entry.product);
}

function changeCartItem(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty = Math.min(20, cart[index].qty + delta);
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart(cart);
}

function removeCartItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function cartItemMarkup(entry, variant = "drawer") {
  const { item, index, product } = entry;
  const isDrawer = variant === "drawer";
  const linePrice = showPrices() ? `<strong class="price">${money(product.price * item.qty)}</strong>` : "";
  return `
    <article class="${isDrawer ? "drawer-cart-item" : "cart-item"}">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      <div class="${isDrawer ? "drawer-cart-copy" : ""}">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.category)} · ${escapeHtml(product.badge)}</p>
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        ${isDrawer ? `
          <div class="drawer-cart-meta">
            ${linePrice}
            <div class="qty-controls" aria-label="Cantidad">
              <button type="button" data-cart-qty="${index}" data-delta="-1">−</button>
              <span>${item.qty}</span>
              <button type="button" data-cart-qty="${index}" data-delta="1">+</button>
            </div>
            <button class="icon-button remove-line" type="button" data-cart-remove="${index}" aria-label="Quitar ${escapeHtml(product.name)}">${icon("trash-2")}</button>
          </div>
        ` : ""}
      </div>
      ${!isDrawer ? `
        <div class="product-actions">
          ${linePrice}
          <div class="qty-controls" aria-label="Cantidad">
            <button type="button" data-qty="${index}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button type="button" data-qty="${index}" data-delta="1">+</button>
          </div>
          <button class="btn small secondary" type="button" data-remove="${index}">Quitar</button>
        </div>
      ` : ""}
    </article>
  `;
}

function ensureCartDrawer() {
  if (!salesOpen()) return null;
  let shell = document.querySelector("#cart-drawer-shell");
  if (shell) return shell;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="cart-drawer-shell" id="cart-drawer-shell" aria-hidden="true">
      <button class="cart-drawer-backdrop" type="button" data-cart-close aria-label="Cerrar cesta"></button>
      <aside class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header class="cart-drawer-head">
          <div>
            <p class="eyebrow">Cesta La Casa</p>
            <h2 id="cart-drawer-title">Tu selección</h2>
          </div>
          <button class="icon-button" type="button" data-cart-close aria-label="Cerrar cesta">${icon("x")}</button>
        </header>
        <div class="cart-drawer-scroll" data-cart-drawer-list></div>
        <footer class="cart-drawer-foot">
          <div data-cart-drawer-summary></div>
          <a class="btn" href="checkout.html">${icon("credit-card")}Finalizar compra</a>
          <a class="btn secondary" href="carrito.html">${icon("shopping-bag")}Ver cesta</a>
          <p class="tiny-note">${icon("shield-check", "note-icon")}Pago seguro con Culqi.</p>
        </footer>
      </aside>
    </div>
  `);
  shell = document.querySelector("#cart-drawer-shell");
  shell.addEventListener("click", (event) => {
    const qty = event.target.closest("[data-cart-qty]");
    const remove = event.target.closest("[data-cart-remove]");
    if (event.target.closest("[data-cart-close]")) closeCartDrawer();
    if (qty) changeCartItem(Number(qty.dataset.cartQty), Number(qty.dataset.delta));
    if (remove) removeCartItem(Number(remove.dataset.cartRemove));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCartDrawer();
  });
  return shell;
}

function renderCartDrawer() {
  if (!salesOpen()) return;
  const shell = document.querySelector("#cart-drawer-shell");
  if (!shell) return;
  const list = shell.querySelector("[data-cart-drawer-list]");
  const summary = shell.querySelector("[data-cart-drawer-summary]");
  const entries = cartEntries();
  if (!entries.length) {
    list.innerHTML = `
      <div class="drawer-empty">
        ${icon("flower-2", "drawer-empty-icon")}
        <h3>Aún no hay flores en tu selección.</h3>
        <p>Elige un arreglo y lo verás aquí sin salir de la página.</p>
        <a class="btn" href="catalogo.html">Explorar arreglos</a>
      </div>
    `;
  } else {
    list.innerHTML = entries.map((entry) => cartItemMarkup(entry, "drawer")).join("");
  }
  const subtotal = cartTotals(entries.map(({ item }) => item));
  summary.innerHTML = `
    <div class="summary-line"><span>${entries.length} tipo${entries.length === 1 ? "" : "s"} de arreglo</span><strong>${money(subtotal)}</strong></div>
    <div class="summary-line"><span>Entrega</span><strong>Según distrito</strong></div>
  `;
  refreshIcons();
}

function openCartDrawer() {
  if (!salesOpen()) {
    window.location.href = "catalogo.html";
    return;
  }
  const shell = ensureCartDrawer();
  if (!shell) return;
  renderCartDrawer();
  shell.classList.add("is-open");
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-drawer-open");
}

function closeCartDrawer() {
  const shell = document.querySelector("#cart-drawer-shell");
  if (!shell) return;
  shell.classList.remove("is-open");
  shell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-drawer-open");
}

function toast(message) {
  let node = document.querySelector(".toast");
  if (!node) {
    node = document.createElement("div");
    node.className = "toast";
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("is-visible"), 2200);
}

function icon(name, className = "icon") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({
      attrs: { "stroke-width": 1.8 },
    });
  }
}

function sanitizePublicInterface() {
  document.querySelectorAll('a[href*="personalizar.html"]').forEach((link) => link.remove());
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    node.nodeValue = node.nodeValue.replace(/Openpay/gi, "Culqi");
    if (!salesOpen()) {
      node.nodeValue = node.nodeValue
        .replace(/Checkout protegido con Culqi/gi, "Cotización por WhatsApp")
        .replace(/Checkout con Culqi/gi, "Cotización por WhatsApp")
        .replace(/Pago protegido/gi, "Cotización directa")
        .replace(/Pago seguro/g, "Atención directa")
        .replace(/pago protegido/gi, "atención directa")
        .replace(/pagar/gi, "confirmar");
    }
  });
}

function premiumMediaClass(product) {
  return product?.image?.includes("/premium/") || product?.image?.includes("/edited/")
    ? " is-premium"
    : "";
}

function productGalleryViews(product) {
  return (product.images?.length ? product.images : [product.image]).map((image, index) => ({
    image, mode: "front", label: index === 0 ? "Imagen principal" : `Imagen ${index + 1}`,
    short: index === 0 ? "Principal" : `Foto ${index + 1}`,
  }));
}

function productCard(product) {
  const priceMarkup = showPrices() ? `<span class="price">${product.compareAtPrice ? `<del>${money(product.compareAtPrice)}</del> ` : ""}${money(product.price)}</span>` : "";
  const actionMarkup = salesOpen()
    ? `<button class="btn small" ${product.available === false ? "disabled" : ""} data-add="${product.id}" aria-label="Agregar ${escapeHtml(product.name)} al carrito">${icon("shopping-bag")}<span class="btn-label">${product.available === false ? "Agotado" : "Agregar"}</span></button>`
    : quoteButton(product);
  return `
    <article class="product-card">
      <a class="product-media${premiumMediaClass(product)}" href="producto.html?id=${product.id}" aria-label="Ver ${escapeHtml(product.name)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        <span class="badge">${escapeHtml(product.badge)}</span>
      </a>
      <div class="product-body">
        <div class="product-meta">
          <h3 class="product-name">${escapeHtml(product.name)}</h3>
          ${priceMarkup}
        </div>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-actions">
          ${actionMarkup}
          <a class="btn small secondary icon-only" href="producto.html?id=${product.id}" aria-label="Ver ficha de ${escapeHtml(product.name)}">${icon("eye")}</a>
        </div>
      </div>
    </article>
  `;
}

function renderProductGrid(container, products) {
  if (!container) return;
  container.innerHTML = products.filter(Boolean).map(productCard).join("");
  requestAnimationFrame(() => {
    refreshIcons();
    initRevealEffects(container);
  });
}

function bindProductActions(scope = document) {
  scope.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    const detail = event.target.closest("[data-detail]");
    if (add) {
      playAddFeedback(add);
      addToCart(add.dataset.add);
    }
    if (detail) {
      openProduct(detail.dataset.detail);
    }
  });
}

function openProduct(id) {
  const product = productMap.get(id);
  if (!product) return;
  let dialog = document.querySelector("#product-dialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "product-dialog";
    dialog.className = "product-dialog";
    document.body.appendChild(dialog);
  }
  const priceMarkup = showPrices() ? `<strong class="price">${money(product.price)}</strong>` : "";
  const primaryAction = salesOpen() ? `<button class="btn" data-add="${product.id}">Agregar al carrito</button>` : quoteButton(product, "btn");
  dialog.innerHTML = `
    <button class="dialog-close" aria-label="Cerrar" data-close-dialog>×</button>
    <div class="dialog-grid">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      <div class="dialog-copy">
        <span class="badge">${escapeHtml(product.category)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        ${priceMarkup}
        <p>${escapeHtml(product.description)}</p>
        <p>Incluye tarjeta personalizada. La entrega se elige antes de pagar.</p>
        <div class="button-row">
          ${primaryAction}
          <button class="btn secondary" data-close-dialog>Seguir mirando</button>
        </div>
      </div>
    </div>
  `;
  dialog.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function renderHome() {
  const hero = document.querySelector("#hero-picks");
  const heroProducts = [...ALL_PRODUCTS].sort((a, b) => Number(b.featured) - Number(a.featured)).filter((p) => p.available).slice(0, 2);
  if (hero) {
    hero.innerHTML = heroProducts.map((product, index) => `
      <a class="hero-card ${index === 0 ? "main" : index === 1 ? "side" : "accent"}${premiumMediaClass(product)}" href="producto.html?id=${product.id}" aria-label="${escapeHtml(product.name)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
        <div class="hero-caption">
          <strong>${escapeHtml(product.name)}</strong>
          ${showPrices() ? `<span class="price">${money(product.price)}</span>` : ""}
        </div>
      </a>
    `).join("");
  }

  const occasions = document.querySelector("#occasion-grid");
  if (occasions) {
    occasions.innerHTML = OCCASIONS.map((item) => `
      <a class="occasion-card" href="${item.href || `catalogo.html?ocasion=${encodeURIComponent(item.query)}`}">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  renderProductGrid(document.querySelector("#featured-grid"), ALL_PRODUCTS.filter((p) => p.featured || p.isPromotion).slice(0, 12));

  const flowers = document.querySelector("#flower-grid");
  if (flowers) {
    flowers.innerHTML = FLOWER_GROUPS.map((item) => `
      <a class="flower-card" href="${item.href}">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  const reviews = document.querySelector("#review-grid");
  if (reviews) reviews.closest("section")?.remove();

  bindShippingEstimator(document);
}

function bindShippingEstimator(scope = document) {
  const input = scope.querySelector("#home-district, #product-district");
  const result = scope.querySelector("[data-shipping-result]");
  const pills = scope.querySelector("[data-district-pills]");
  if (!result && !pills) return;

  function show(value) {
    const term = String(value || "").trim().toLowerCase();
    const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const found = DISTRICTS.find((district) => normalize(district.name).includes(normalize(term)));
    if (!term) {
      result.textContent = "Tarifa referencial. La ruta final se confirma en checkout.";
    } else if (found?.enabled && found.fee !== null) {
      result.textContent = `${found.name}: ruta referencial ${money(found.fee)}. El checkout confirma horario y cobertura.`;
    } else {
      result.textContent = "Por el momento no realizamos entregas en este distrito.";
    }
  }

  if (pills) {
    pills.innerHTML = DISTRICTS.filter((d) => d.enabled && d.fee !== null).slice(0, 4).map((district) => `
      <button type="button" data-district="${district.name}">${district.name}<br>${money(district.fee)}</button>
    `).join("");
    pills.addEventListener("click", (event) => {
      const button = event.target.closest("[data-district]");
      if (!button) return;
      if (input) input.value = button.dataset.district;
      show(button.dataset.district);
    });
  }
  input?.addEventListener("input", () => show(input.value));
  show(input?.value || "");
}

function enhanceStaticIcons() {
  const iconByText = [
    ["Catálogo", "grid-3x3"],
    ["Ocasiones", "gift"],
    ["Flores", "flower-2"],
    ["Colecciones", "layers-3"],
    ["Contacto", "message-circle"],
  ];
  document.querySelectorAll(".nav-link:not(.cart-link), .menu-button").forEach((item) => {
    if (item.querySelector("[data-lucide]")) return;
    const text = item.textContent.trim();
    const match = iconByText.find(([label]) => text.includes(label));
    if (match) item.insertAdjacentHTML("afterbegin", icon(match[1]));
  });
  document.querySelectorAll(".cart-link").forEach((link) => {
    if (!link.querySelector("[data-lucide='shopping-bag']")) {
      link.insertAdjacentHTML("afterbegin", icon("shopping-bag"));
    }
  });
  document.querySelectorAll(".topbar-inner > span").forEach((item, index) => {
    if (item.querySelector("[data-lucide]")) return;
    const names = ["truck", "camera", "gift"];
    item.insertAdjacentHTML("afterbegin", icon(names[index] || "sparkles", "topbar-icon"));
  });
  document.querySelectorAll(".btn[href='catalogo.html']").forEach((button) => {
    if (!button.querySelector("[data-lucide]")) {
      button.insertAdjacentHTML("afterbegin", icon("shopping-bag"));
    }
  });
  document.querySelectorAll(".btn.secondary[href*='producto.html']").forEach((button) => {
    if (!button.querySelector("[data-lucide]")) {
      button.insertAdjacentHTML("afterbegin", icon("sparkles"));
    }
  });
}

function initSliders() {
  document.querySelectorAll("[data-slider]").forEach((slider) => {
    const track = slider.querySelector(".product-slider");
    const prev = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");
    const dots = slider.querySelector("[data-slider-dots]");
    if (!track || !prev || !next || !dots) return;

    function metrics() {
      const card = track.querySelector(".product-card");
      if (!card) return { step: 0, pages: 1, current: 0 };
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0");
      const step = card.getBoundingClientRect().width + gap;
      const visible = Math.max(1, Math.floor((track.clientWidth + gap) / step));
      const pages = Math.max(1, track.children.length - visible + 1);
      const current = Math.min(pages - 1, Math.round(track.scrollLeft / step));
      return { step, pages, current };
    }

    function paintDots() {
      const { pages, current } = metrics();
      dots.innerHTML = Array.from({ length: pages }, (_, index) => `
        <button type="button" class="${index === current ? "is-active" : ""}" data-slider-dot="${index}" aria-label="Ver grupo ${index + 1}"></button>
      `).join("");
      prev.disabled = current === 0;
      next.disabled = current >= pages - 1;
      refreshIcons();
    }

    prev.addEventListener("click", () => {
      const { step } = metrics();
      track.scrollBy({ left: -step, behavior: "smooth" });
    });

    next.addEventListener("click", () => {
      const { step } = metrics();
      track.scrollBy({ left: step, behavior: "smooth" });
    });

    dots.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-slider-dot]");
      if (!dot) return;
      const { step } = metrics();
      track.scrollTo({ left: Number(dot.dataset.sliderDot) * step, behavior: "smooth" });
    });

    track.addEventListener("scroll", () => requestAnimationFrame(paintDots), { passive: true });
    window.addEventListener("resize", paintDots);
    requestAnimationFrame(paintDots);
  });
}

let revealObserver;

function playAddFeedback(button) {
  if (!button) return;
  button.classList.add("is-added");
  window.clearTimeout(button.addFeedbackTimer);
  button.addFeedbackTimer = window.setTimeout(() => button.classList.remove("is-added"), 900);
}

function initHeaderEffects() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initHeroSpotlight() {
  const hero = document.querySelector(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hero || reduceMotion) return;

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty("--spot-x", `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
    hero.style.setProperty("--spot-y", `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
  }, { passive: true });
}

function initRevealEffects(scope = document) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const selector = [
    ".hero-copy",
    ".hero-showcase",
    ".section-title",
    ".service-item",
    ".occasion-card",
    ".flower-card",
    ".product-card",
    ".delivery-card",
    ".review-card",
    ".panel",
    ".collection-block",
    ".catalog-page",
    ".cart-item",
    ".checkout-card",
    ".confirmation-card",
  ].join(", ");
  const nodes = [...scope.querySelectorAll(selector)]
    .filter((node) => !node.classList.contains("reveal-ready") && !node.closest(".cart-drawer, .checkout-layout"));

  if (!nodes.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("reveal", "reveal-ready", "is-visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.12,
    });
  }

  nodes.forEach((node) => {
    node.classList.add("reveal", "reveal-ready");
    revealObserver.observe(node);
  });
}

function renderCatalog() {
  const filterRow = document.querySelector("#filter-row");
  const grid = document.querySelector("#product-grid");
  const search = document.querySelector("#catalog-search");
  const sort = document.querySelector("#catalog-sort");
  const result = document.querySelector("#result-line");
  if (!grid) return;

  const urlCategory = new URLSearchParams(window.location.search).get("categoria");
  const urlOccasion = new URLSearchParams(window.location.search).get("ocasion");
  const promoOnly = new URLSearchParams(window.location.search).get("promociones") === "1";
  const collectionId = new URLSearchParams(window.location.search).get("coleccion");
  const collection = catalogCollections.find((c) => c.id === collectionId);
  let activeCategory = CATEGORIES.includes(urlCategory) ? urlCategory : "Todos";
  if (sort && !showPrices()) {
    [...sort.options].forEach((option) => {
      if (option.value.startsWith("price-")) option.remove();
    });
  }

  function paintFilters() {
    filterRow.innerHTML = CATEGORIES.map((category) => `
      <button class="filter-chip ${category === activeCategory ? "is-active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
    `).join("");
  }

  function apply() {
    const term = (search?.value || "").trim().toLowerCase();
    let list = ALL_PRODUCTS.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
      const matchesOccasion = !urlOccasion || product.occasion === urlOccasion;
      const matchesPromo = !promoOnly || product.isAdminPromotion;
      const haystack = `${product.name} ${product.category} ${product.occasion} ${product.description}`.toLowerCase();
      return matchesCategory && matchesOccasion && matchesPromo && (!collectionId || collection?.productIds.includes(product.id)) && (!term || haystack.includes(term));
    });
    if (!sort || sort.value === "featured") {
      list = [...list].sort((a, b) => (featuredRank.get(a.id) ?? 999) - (featuredRank.get(b.id) ?? 999));
    }
    if (sort?.value === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort?.value === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort?.value === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    result.textContent = `${list.length} arreglos disponibles${urlOccasion ? ` para ${urlOccasion}` : ""}${promoOnly ? " en promociones" : ""}`;
    renderProductGrid(grid, list);
    if (!list.length) grid.innerHTML = `<p class="catalog-empty">No encontramos productos para esta seleccion. <a href="catalogo.html">Ver todo el catalogo</a></p>`;
  }

  paintFilters();
  apply();
  filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    paintFilters();
    apply();
  });
  search?.addEventListener("input", apply);
  sort?.addEventListener("change", apply);
}

function renderProductPage() {
  const root = document.querySelector("#product-detail");
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const product = productMap.get(params.get("id"));
  if (!product) {
    root.innerHTML = `<h1>Producto no disponible</h1><p>Este arreglo ya no esta publicado.</p><a class="btn" href="catalogo.html">Ver catalogo</a>`;
    return;
  }
  const related = ALL_PRODUCTS
    .filter((item) => item.category === product.category && item.id !== product.id)
    .sort((a, b) => Number(!premiumMediaClass(a)) - Number(!premiumMediaClass(b)))
    .slice(0, 4);
  const galleryViews = productGalleryViews(product);
  const priceMarkup = showPrices() ? `<strong class="buy-price">${product.compareAtPrice ? `<del>${money(product.compareAtPrice)}</del> ` : ""}${money(product.price)}</strong>` : "";
  const addMarkup = salesOpen()
    ? `<button class="btn" id="add-product-detail" type="button" ${product.available === false ? "disabled" : ""}>${icon("shopping-bag")}${product.available === false ? "Agotado" : `Añadir al carrito · ${money(product.price)}`}</button>`
    : quoteButton(product, "btn");
  const routeCopy = salesOpen() ? "Elige distrito y deja que el checkout ordene fecha, dedicatoria y pago seguro con Culqi." : "Cotiza por WhatsApp y coordinamos disponibilidad, fecha, dedicatoria y entrega.";
  const stickyNote = salesOpen() ? `${icon("shield-check", "note-icon")}Entrega programada · pago seguro con Culqi` : `${icon("message-circle", "note-icon")}Respuesta por WhatsApp para confirmar disponibilidad`;
  document.title = `${product.name} | La Casa de las Flores Atelier`;

  root.innerHTML = `
    <div class="product-detail">
      <div class="gallery">
        <div class="thumbs" aria-label="Vistas de ${escapeHtml(product.name)}">
          ${galleryViews.map((view, index) => `
            <button class="thumb ${index === 0 ? "is-active" : ""}" type="button" data-gallery-mode="${view.mode}" data-gallery-src="${escapeHtml(view.image)}" data-gallery-label="${escapeHtml(view.label)}" aria-label="${escapeHtml(view.label)} de ${escapeHtml(product.name)}">
              <span class="thumb-frame"><img class="gallery-crop-${view.mode}" src="${escapeHtml(view.image)}" alt="${escapeHtml(view.label)} de ${escapeHtml(product.name)}"></span>
              <span class="thumb-label">${escapeHtml(view.short)}</span>
            </button>
          `).join("")}
        </div>
        <div class="main-photo${premiumMediaClass(product)} gallery-view-front" data-main-photo>
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" data-main-gallery-img>
          <span class="view-chip" data-gallery-caption>Vista completa</span>
        </div>
      </div>
      <div class="buy-panel">
        <div class="product-title-row">
          <span class="badge">${escapeHtml(product.category)}</span>
          <h1>${escapeHtml(product.name)}</h1>
          ${priceMarkup}
        </div>
        <div class="panel delivery-studio">
          <div class="route-heading">
            <span class="route-mark">${icon("map-pin")}</span>
            <div>
              <p class="eyebrow">Ruta La Casa</p>
              <h3>Agenda la entrega antes de pagar</h3>
            </div>
          </div>
          <p>${routeCopy}</p>
          <div class="route-steps" aria-label="Proceso de entrega">
            <span>Zona</span>
            <span>Horario</span>
            <span>Confirmacion</span>
          </div>
          <input class="field" id="product-district" type="search" placeholder="Escribe tu distrito">
          <div class="district-pills" data-district-pills></div>
          <p class="tiny-note" data-shipping-result>Tarifa referencial. La ruta final se confirma en checkout.</p>
        </div>
        <div class="panel">
          <p class="eyebrow">El toque final</p>
          <h3>Personaliza tu regalo</h3>
          <div class="form-grid">
            <div class="form-line full">
              <label for="gift-note">Dedicatoria</label>
              <textarea class="textarea" id="gift-note" maxlength="250" placeholder="Escribe unas lineas y firma para que sepan de quien es"></textarea>
              <span class="counter"><span id="gift-count">0</span>/250</span>
            </div>
            <div class="form-line">
              <label for="delivery-date">Fecha de entrega</label>
              <input class="field" id="delivery-date" type="date">
            </div>
            <div class="form-line">
              <label for="delivery-slot">Horario</label>
              <select class="field" id="delivery-slot">
                <option>Hoy disponible</option>
                <option>Manana por la manana</option>
                <option>Manana por la tarde</option>
                <option>Coordinar horario</option>
              </select>
            </div>
          </div>
        </div>
        <div class="sticky-add">
          ${addMarkup}
          <p class="tiny-note">${stickyNote}</p>
        </div>
        <div class="accordion">
          <details open>
            <summary>Descripción del producto</summary>
            <p class="product-description">${escapeHtml(product.description)}</p>
            <ul>
              <li>Incluye tarjeta personalizada.</li>
              <li>El envío no está incluido en el precio.</li>
            </ul>
          </details>
          ${product.specifications?.length ? `<details open><summary>Especificaciones</summary><dl class="product-specs">${product.specifications.map((spec) => `<div><dt>${escapeHtml(spec.label)}</dt><dd>${escapeHtml(spec.value)}</dd></div>`).join("")}</dl></details>` : ""}
          <details>
            <summary>Disponibilidad y sustituciones</summary>
            <p>Si alguna flor no está disponible, el atelier propone una sustitución equivalente en color, volumen e intención.</p>
          </details>
        </div>
      </div>
    </div>
  `;

  const today = todayInLima();
  const dateInput = root.querySelector("#delivery-date");
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }
  const note = root.querySelector("#gift-note");
  const counter = root.querySelector("#gift-count");
  note?.addEventListener("input", () => {
    counter.textContent = note.value.length;
  });
  bindProductGallery(root);
  bindShippingEstimator(root);
  const detailAddButton = root.querySelector("#add-product-detail");
  detailAddButton?.addEventListener("click", () => {
    const extras = [...root.querySelectorAll(".check-option input:checked")].map((item) => item.value);
    const district = root.querySelector("#product-district")?.value || "";
    const deliveryDate = root.querySelector("#delivery-date")?.value || "";
    const slot = root.querySelector("#delivery-slot")?.value || "";
    const lines = [
      note?.value ? `Dedicatoria: ${note.value}` : "",
      deliveryDate ? `Fecha: ${deliveryDate}` : "",
      slot ? `Horario: ${slot}` : "",
      district ? `Distrito: ${district}` : "",
      extras.length ? `Extras: ${extras.join(", ")}` : "",
    ].filter(Boolean);
    playAddFeedback(detailAddButton);
    addToCart(product.id, 1, lines.join(" | "));
  });

  renderProductGrid(document.querySelector("#related-grid"), related);
  refreshIcons();
}

function bindProductGallery(root) {
  const main = root.querySelector("[data-main-photo]");
  const image = root.querySelector("[data-main-gallery-img]");
  const caption = root.querySelector("[data-gallery-caption]");
  const thumbs = [...root.querySelectorAll("[data-gallery-mode]")];
  if (!main || !image || !thumbs.length) return;

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const mode = thumb.dataset.galleryMode || "front";
      const src = thumb.dataset.gallerySrc || image.src;
      image.src = src;
      image.alt = thumb.getAttribute("aria-label") || image.alt;
      main.classList.remove("gallery-view-front", "gallery-view-detail", "gallery-view-base", "gallery-view-angle");
      main.classList.add(`gallery-view-${mode}`);
      thumbs.forEach((item) => item.classList.toggle("is-active", item === thumb));
      if (caption) caption.textContent = thumb.dataset.galleryLabel || "Vista del producto";
    });
  });
}

function renderCollectionsPage() {
  const root = document.querySelector("#collections-page");
  if (!root) return;
  const collections = managedCollections();
  root.innerHTML = collections.map((collection) => `
    <section class="collection-block">
      <div class="collection-copy">
        <p class="eyebrow">Colección</p>
        <h2>${escapeHtml(collection.title)}</h2>
        <p>${escapeHtml(collection.text)}</p>
        <a class="btn secondary" href="${collection.href || "catalogo.html"}">Ver catalogo</a>
      </div>
      <div class="collection-products">
        ${collectionProductIds(collection).slice(0, 4).map((id) => productMap.get(id)).filter(Boolean).map((product) => productCard(product)).join("")}
      </div>
    </section>
  `).join("");
}

function renderOriginalCatalog() {
  const root = document.querySelector("#original-grid");
  if (!root) return;
  const pages = Array.from({ length: 22 }, (_, index) => index + 1);
  root.innerHTML = pages.map((page) => {
    const src = `public/assets/edited/catalog/arrangement-${String(page).padStart(2, "0")}.jpg`;
    const label = page === 1 ? "Portada" : page === 22 ? "Medios de pago" : `Página ${page}`;
    return `
      <a class="catalog-page" href="${src}" target="_blank" rel="noreferrer">
        <img src="${src}" alt="${escapeHtml(label)} del catálogo">
        <span>${escapeHtml(label)} <b>Abrir</b></span>
      </a>
    `;
  }).join("");
}

function renderCustomBuilder() {
  const form = document.querySelector("#custom-form");
  const total = document.querySelector("#custom-total");
  const list = document.querySelector("#custom-summary");
  const previewImg = document.querySelector("#custom-preview-img");
  const previewTitle = document.querySelector("#custom-preview-title");
  const previewPalette = document.querySelector("#custom-preview-palette");
  const submit = form.querySelector("button[type='submit']");
  const review = document.querySelector("[data-cart-open]");
  if (!form || !total || !list) return;
  if (!salesOpen()) {
    submit.textContent = "Cotizar diseño por WhatsApp";
    review.textContent = "Ver catálogo";
    review.href = "catalogo.html";
    review.removeAttribute("data-cart-open");
  }

  const basePrices = {
    ramo: 45,
    box: 60,
    preservado: 55,
    premium: 95,
  };
  const additionPrices = {
    topper: 12,
    ferrero: 18,
    peluche: 25,
    globo: 20,
    vino: 35,
  };
  const baseLabels = {
    ramo: "Ramo coreano",
    box: "Box reutilizable",
    preservado: "Diseño preservado",
    premium: "De autor en loza",
  };
  const baseImages = {
    ramo: "public/assets/edited/products/ramo-love.jpg",
    box: "public/assets/edited/products/box-amber.jpg",
    preservado: "public/assets/edited/products/box-bella.jpg",
    premium: "public/assets/edited/products/orquidia-phalaenopsis.jpg",
  };

  function estimate() {
    const data = new FormData(form);
    const base = data.get("base");
    const stems = Math.max(1, Number(data.get("stems") || 1));
    const color = data.get("color");
    const message = data.get("message");
    const additions = data.getAll("addition");
    const price = (basePrices[base] || 45) + stems * 7 + additions.reduce((sum, item) => sum + additionPrices[item], 0);
    total.textContent = showPrices() ? money(price) : "Cotizacion personalizada";
    if (previewImg) previewImg.src = baseImages[base] || baseImages.ramo;
    if (previewTitle) previewTitle.textContent = baseLabels[base] || "Diseño personalizado";
    if (previewPalette) previewPalette.textContent = `Paleta ${color}`;
    list.innerHTML = [
      `${stems} flores principales`,
      `Base ${baseLabels[base] || base}`,
      `Paleta ${color}`,
      message ? `Tarjeta: "${escapeHtml(message)}"` : "Tarjeta personalizada",
      additions.length ? `Extras: ${additions.join(", ")}` : "Sin extras añadidos",
    ].map((item) => `<li>${item}</li>`).join("");
    return { base, stems, color, message, additions, price };
  }

  form.addEventListener("input", estimate);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = estimate();
    const custom = {
      id: `personalizado-${Date.now()}`,
      name: "Diseño personalizado",
      price: data.price,
      image: baseImages[data.base] || baseImages.ramo,
      category: "Personalizado",
      description: `${data.stems} flores principales, base ${baseLabels[data.base] || data.base}, paleta ${data.color}. ${data.message ? `Tarjeta: ${data.message}.` : "Tarjeta personalizada."}`,
      builder: {
        base: data.base,
        stems: data.stems,
        color: data.color,
        message: data.message,
        additions: data.additions,
      },
    };
    if (salesOpen()) addToCart(custom.id, 1, data.additions.join(", "), custom);
    else window.open(quoteUrl(custom), "_blank", "noopener,noreferrer");
  });
  estimate();
}

function renderCartPage() {
  const list = document.querySelector("#cart-items");
  const summary = document.querySelector("#cart-summary");
  const clear = document.querySelector("#clear-cart");
  const checkoutAction = document.querySelector("#checkout-action");
  if (!list || !summary) return;
  if (!salesOpen()) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Estamos atendiendo por cotizacion</h2>
        <p>Mientras activamos Culqi, puedes revisar los arreglos y pedir disponibilidad por WhatsApp.</p>
        <a class="btn" href="${quoteUrl()}">${icon("message-circle")}Cotizar por WhatsApp</a>
      </div>
    `;
    summary.innerHTML = `
      <div class="summary-line"><span>Modo tienda</span><strong>Solo cotizacion</strong></div>
      <div class="summary-line"><span>Precios y carrito</span><strong>Pausados</strong></div>
    `;
    checkoutAction?.classList.add("is-disabled");
    checkoutAction?.setAttribute("aria-disabled", "true");
    clear?.setAttribute("hidden", "");
    refreshIcons();
    return;
  }

  function paint() {
    const entries = cartEntries();
    if (!entries.length) {
      list.innerHTML = `
        <div class="empty-state">
          <h2>Tu selección está lista para flores.</h2>
          <p>Explora el catálogo y guarda tus arreglos favoritos.</p>
          <a class="btn" href="catalogo.html">Ir al catálogo</a>
        </div>
      `;
    } else {
      list.innerHTML = entries.map((entry) => cartItemMarkup(entry, "page")).join("");
    }
    const subtotal = cartTotals(entries.map(({ item }) => item));
    summary.innerHTML = `
      <div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <div class="summary-line"><span>Entrega</span><strong>Se calcula en checkout</strong></div>
      <div class="summary-line"><span>Pago</span><strong>Culqi</strong></div>
      <div class="summary-line total"><span>Total parcial</span><strong>${money(subtotal)}</strong></div>
    `;
    if (checkoutAction) {
      checkoutAction.classList.toggle("is-disabled", !entries.length);
      checkoutAction.setAttribute("aria-disabled", String(!entries.length));
    }
    renderCartCount();
  }

  list.addEventListener("click", (event) => {
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");
    if (qty) {
      changeCartItem(Number(qty.dataset.qty), Number(qty.dataset.delta));
      paint();
    }
    if (remove) {
      removeCartItem(Number(remove.dataset.remove));
      paint();
    }
  });

  clear?.addEventListener("click", () => {
    saveCart([]);
    paint();
  });

  checkoutAction?.addEventListener("click", (event) => {
    if (!cartEntries().length) {
      event.preventDefault();
      toast("Agrega un arreglo antes de pagar");
    }
  });

  paint();
}

function deliveryFeeForDistrict(district) {
  const item = DISTRICTS.find((item) => item.id === district || item.name === district);
  return item?.enabled ? item.fee : null;
}

function checkoutCartPayload() {
  return getCart().map((item) => ({
    id: item.id,
    qty: item.qty,
    note: item.note || "",
    custom: item.custom && !item.custom.admin_promotion ? {
      id: item.custom.id,
      name: item.custom.name,
      description: item.custom.description,
      builder: item.custom.builder,
    } : null,
  }));
}

function setCheckoutStatus(message, tone = "") {
  const node = document.querySelector("#checkout-status");
  if (!node) return;
  node.textContent = message;
  node.className = `checkout-status ${tone}`.trim();
}

function checkoutOrderPayload(form) {
  const data = new FormData(form);
  return {
    cart: checkoutCartPayload(),
    customer: {
      first_name: data.get("first_name"),
      last_name: data.get("last_name"),
      email: data.get("email"),
      phone: data.get("phone"),
    },
    delivery: {
      recipient: data.get("recipient"),
      recipient_phone: data.get("recipient_phone"),
      date: data.get("delivery_date"),
      slot: data.get("delivery_slot"),
      district_id: data.get("delivery_district"),
      address: data.get("delivery_address"),
      reference: data.get("delivery_reference"),
      dedication: data.get("dedication"),
    },
    legal: {
      accepted_terms: data.get("legal_acceptance") === "on",
    },
  };
}

function renderCheckoutPage() {
  if (!salesOpen()) {
    const form = document.querySelector("#culqi-checkout-form");
    const summary = document.querySelector("#checkout-summary");
    form?.setAttribute("hidden", "");
    if (summary) {
      summary.innerHTML = `
        <div class="empty-state compact">
          <h2>Ventas en pausa</h2>
          <p>Por ahora estamos recibiendo cotizaciones por WhatsApp mientras dejamos Culqi listo.</p>
          <a class="btn" href="${quoteUrl()}">${icon("message-circle")}Cotizar por WhatsApp</a>
        </div>
      `;
    }
    setCheckoutStatus("La tienda esta en modo cotizacion. El pago online esta desactivado.", "error");
    refreshIcons();
    return;
  }
  window.initializeCulqiCheckout?.();
}

async function loadBusinessInfo() {
  try {
    const response = await fetch("/api/business-info", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo leer la informacion del comercio.");
    const payload = await response.json();
    return payload.business || {};
  } catch {
    return {
      commercialName: BRAND.name,
      legalName: "",
      ruc: "",
      fiscalAddress: "",
      phone: BRAND.phone,
      email: "",
      claimsEmail: "",
    };
  }
}

function renderBusinessInfo(info) {
  const missing = !info.legalName || !info.ruc || !info.fiscalAddress;
  return `
    <div class="provider-card">
      <div>
        <p class="eyebrow">Identificacion del proveedor</p>
        <h3>${escapeHtml(info.commercialName || BRAND.name)}</h3>
      </div>
      <dl class="provider-list">
        <div><dt>Titular / Razón social</dt><dd>${escapeHtml(info.legalName || "Por confirmar")}</dd></div>
        <div><dt>RUC</dt><dd>${escapeHtml(info.ruc || "Por confirmar")}</dd></div>
        <div><dt>Domicilio fiscal</dt><dd>${escapeHtml(info.fiscalAddress || "Por confirmar")}</dd></div>
        <div><dt>Atencion</dt><dd>${escapeHtml(info.claimsEmail || info.email || `WhatsApp ${info.phone || BRAND.phone}`)}</dd></div>
      </dl>
      ${missing ? `<p class="config-warning">Consulta los datos del proveedor a través de nuestros canales de atención.</p>` : ""}
    </div>
  `;
}

function renderClaimResult(result) {
  return `
    <div class="claim-result success">
      ${icon("badge-check", "confirmation-icon")}
      <div>
        <p class="eyebrow">Hoja registrada</p>
        <h3>Codigo ${escapeHtml(result.code)}</h3>
        <p>Conserva este codigo para seguimiento. El plazo de respuesta es de ${escapeHtml(result.response_deadline || "15 dias habiles")}.</p>
        <button class="btn secondary small" type="button" onclick="window.print()">Imprimir constancia</button>
      </div>
    </div>
  `;
}

function renderClaimsPage() {
  const provider = document.querySelector("#claims-provider");
  const form = document.querySelector("#claims-form");
  const status = document.querySelector("#claims-status");
  const date = document.querySelector("#claim-date");
  if (!form || !status) return;

  if (date && !date.value) {
    date.value = new Date().toISOString().slice(0, 10);
  }

  loadBusinessInfo().then((info) => {
    if (provider) {
      provider.innerHTML = renderBusinessInfo(info);
      refreshIcons();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.accepted_privacy = data.get("accepted_privacy") === "on";

    submit.disabled = true;
    status.className = "checkout-status";
    status.textContent = "Registrando hoja de reclamacion...";

    try {
      const response = await fetch("/api/reclamaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "No se pudo registrar la hoja de reclamacion.");
      }
      status.className = "checkout-status success";
      status.innerHTML = renderClaimResult(result);
      form.reset();
      if (date) date.value = new Date().toISOString().slice(0, 10);
      refreshIcons();
    } catch (error) {
      status.className = "checkout-status error";
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

function renderBusinessBlocks() {
  const blocks = [...document.querySelectorAll("[data-business-info]")];
  if (!blocks.length) return;
  loadBusinessInfo().then((info) => {
    blocks.forEach((block) => {
      block.innerHTML = renderBusinessInfo(info);
    });
    refreshIcons();
  });
}

function ensureLegalFooterLinks() {
  const footer = document.querySelector(".site-footer .section");
  if (!footer) return;
  footer.classList.add("footer-content");
  footer.innerHTML = `
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="footer-brand-link" href="index.html">
          <img src="assets/logo.svg" alt="" width="48" height="48">
          <strong>La Casa de las Flores Atelier</strong>
        </a>
        <p>Arreglos florales y regalos para cada ocasión.<br>Lima, Perú.</p>
        <p class="footer-provider" hidden></p>
        <a class="footer-contact" href="https://wa.me/${BRAND.phone}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}WhatsApp 947 370 668</a>
        <a class="footer-contact" href="tel:+${BRAND.phone}">${icon("phone")}Llámanos</a>
      </div>
      <nav class="footer-column" aria-label="Comprar">
        <h2>Comprar</h2>
        <a href="catalogo.html">Catálogo de flores</a>
        <a href="colecciones.html">Colecciones</a>
        <a href="catalogo.html?promociones=1">Promociones</a>
        ${salesOpen() ? `<a href="carrito.html">Mi carrito</a>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp</a>`}
      </nav>
      <nav class="footer-column" aria-label="Ayuda al cliente">
        <h2>Te ayudamos</h2>
        <a href="contacto.html">Contacto y atención</a>
        <a href="politicas.html#envios">Envíos y cobertura</a>
        <a href="politicas.html#pagos">Medios de pago</a>
        <a href="politicas.html#cambios">Cambios y devoluciones</a>
        <a href="politicas.html#preguntas">Preguntas frecuentes</a>
      </nav>
      <nav class="footer-column" aria-label="Información legal">
        <h2>Información legal</h2>
        <a href="politicas.html#terminos">Términos y condiciones</a>
        <a href="politicas.html#privacidad">Política de privacidad</a>
        <a href="politicas.html#cookies">Cookies y almacenamiento</a>
        <a href="politicas.html#proveedor">Datos del proveedor</a>
        <a class="footer-claims" href="reclamaciones.html">${icon("book-open-check")}<span>Libro de<br>Reclamaciones</span></a>
      </nav>
    </div>
    <div class="footer-bottom">
      <small>&copy; ${new Date().getFullYear()} La Casa de las Flores Atelier. Todos los derechos reservados.</small>
      <span>${salesOpen() ? `${icon("credit-card")}Pagos con Culqi<span class="footer-currency">Precios en soles (PEN)</span>` : `${icon("message-circle")}Atencion por cotizacion`}</span>
    </div>
  `;
  loadBusinessInfo().then((info) => {
    const provider = footer.querySelector(".footer-provider");
    if (provider && info.legalName && info.ruc) {
      provider.textContent = `${info.legalName} · RUC ${info.ruc}`;
      provider.hidden = false;
    }
  });
}

async function renderConfirmationPage() {
  const panel = document.querySelector("#confirmation-panel");
  if (!panel) return;
  let order = null;
  try {
    const requestId = localStorage.getItem("la-casa-last-payment");
    if (requestId) {
      const response = await fetch("/api/checkout/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: requestId }) });
      const result = await response.json();
      if (response.ok && result.ok) order = result.order || null;
    }
  } catch {
    order = null;
  }

  if (!order) {
    panel.innerHTML = `
      <div class="confirmation-card">
        ${icon("flower-2", "confirmation-icon")}
        <p class="eyebrow">La Casa de las Flores Atelier</p>
        <h1>No encontramos un pedido reciente</h1>
        <p class="lead">Puedes volver al catálogo y crear una nueva compra.</p>
        <a class="btn" href="catalogo.html">Ir al catálogo</a>
      </div>
    `;
    refreshIcons();
    return;
  }

  panel.innerHTML = `
    <div class="confirmation-card">
      ${icon("badge-check", "confirmation-icon")}
      <p class="eyebrow">${order.status === "completed" ? "Pago confirmado" : "Pedido registrado"}</p>
      <h1>${order.status === "completed" ? "Gracias por tu compra" : "Tu pago esta pendiente de confirmacion"}</h1>
      <p class="lead">Orden ${escapeHtml(order.id)} · Total ${money(order.total)}</p>
      <div class="confirmation-details">
        <div><span>Estado</span><strong>${escapeHtml(order.status || "Procesado")}</strong></div>
        <div><span>Culqi</span><strong>${escapeHtml(order.culqi_id || "En verificacion")}</strong></div>
        <div><span>Entrega</span><strong>${escapeHtml(order.delivery?.district || "")}</strong></div>
        <div><span>Fecha</span><strong>${escapeHtml(order.delivery?.date || "")}</strong></div>
      </div>
      <a class="btn" href="catalogo.html">Seguir comprando</a>
    </div>
  `;
  refreshIcons();
}

function menuLinks(items, type) {
  return items.map((item) => {
    const href = type === "occasion"
      ? item.href || `catalogo.html?ocasion=${encodeURIComponent(item.query)}`
      : `catalogo.html?categoria=${encodeURIComponent(item)}`;
    const title = type === "occasion" ? item.title : item;
    const detail = type === "occasion" ? item.query : "Ver productos";
    return `<a href="${href}"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></a>`;
  }).join("");
}

function renderPublicNavigation() {
  if (document.body.dataset.page === "admin") return;
  const navLeft = document.querySelector(".nav-left");
  const navRight = document.querySelector(".nav-right");
  if (!navLeft || !navRight) return;

  const arrangementCategories = CATEGORIES.filter((category) => (
    category !== "Todos" && !["Tulipanes", "Girasoles", "Preservadas"].includes(category)
  ));
  const flowerCategories = CATEGORIES.filter((category) => (
    category !== "Todos" && ["Tulipanes", "Girasoles", "Preservadas"].includes(category)
  ));

  navLeft.innerHTML = `
    <a class="nav-link" data-nav href="catalogo.html">Catalogo</a>
    <a class="nav-link" data-nav href="catalogo.html?promociones=1">Promociones</a>
    <div class="menu">
      <button class="menu-button" type="button">Arreglos <i data-lucide="chevron-down"></i></button>
      <div class="mega">${menuLinks(arrangementCategories, "category")}</div>
    </div>
    <div class="menu">
      <button class="menu-button" type="button">Flores <i data-lucide="chevron-down"></i></button>
      <div class="mega">${menuLinks(flowerCategories, "category")}</div>
    </div>
    <div class="menu">
      <button class="menu-button" type="button">Ocasiones <i data-lucide="chevron-down"></i></button>
      <div class="mega">${menuLinks(OCCASIONS, "occasion")}</div>
    </div>
  `;

  navRight.innerHTML = `
    <a class="nav-link" data-nav href="colecciones.html">Colecciones</a>
    <a class="nav-link" data-nav href="contacto.html">Contacto</a>
    ${salesOpen() ? `<a class="nav-link cart-link" data-nav href="carrito.html" aria-label="Abrir cesta">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></a>` : `<a class="nav-link" href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}Cotizar</a>`}
  `;
}

function setActiveNav() {
  const file = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === file || (file === "" && href === "index.html"));
  });
}

function bindCartTriggers() {
  if (!salesOpen()) return;
  document.querySelectorAll(".cart-link, [data-cart-open]").forEach((trigger) => {
    trigger.setAttribute("aria-label", "Abrir cesta");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openCartDrawer();
    });
  });
}

function ensureMobileTabbar() {
  const shell = document.querySelector(".nav-shell");
  if (shell && !shell.querySelector(".mobile-head-actions")) {
    shell.insertAdjacentHTML("beforeend", `
      <div class="mobile-head-actions" aria-label="Acciones rápidas">
        <a href="catalogo.html" aria-label="Abrir catálogo">${icon("grid-3x3")}</a>
        <a href="catalogo.html#catalog-search" aria-label="Buscar flores">${icon("search")}</a>
        ${salesOpen() ? `<button class="cart-link" type="button" aria-label="Abrir bolsa">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer" aria-label="Cotizar por WhatsApp">${icon("message-circle")}</a>`}
      </div>
    `);
  }

  if (document.querySelector(".mobile-tabbar")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <nav class="mobile-tabbar" aria-label="Navegacion movil">
      <a href="index.html" data-mobile-tab="index.html">${icon("home")}Inicio</a>
      <a href="catalogo.html" data-mobile-tab="catalogo.html">${icon("flower-2")}Catalogo</a>
      <a href="catalogo.html?promociones=1" data-mobile-tab="promociones">${icon("badge-percent")}Promos</a>
      <a href="colecciones.html" data-mobile-tab="colecciones.html">${icon("layers-3")}Colecciones</a>
    </nav>
    ${salesOpen() ? `<button class="mobile-cart-fab cart-link" type="button" aria-label="Abrir cesta">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>` : ""}
  `);

  const file = window.location.pathname.split("/").pop() || "index.html";
  const catalogFiles = new Set(["catalogo.html", "producto.html", "catalogo-original.html"]);
  document.querySelectorAll("[data-mobile-tab]").forEach((link) => {
    const tab = link.dataset.mobileTab;
    const active = tab === file || (tab === "catalogo.html" && catalogFiles.has(file));
    link.classList.toggle("is-active", active);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadStoreSettings();
  sanitizePublicInterface();
  try {
    await loadCatalog();
    reconcileCart();
  } catch (error) {
    const notice = document.createElement("div");
    notice.className = "catalog-load-error";
    notice.setAttribute("role", "alert");
    const local = ["localhost", "127.0.0.1"].includes(location.hostname);
    notice.innerHTML = local
      ? 'No se pudo cargar la tienda. <button type="button">Reintentar</button>'
      : `${escapeHtml(error.message || "La tienda no tiene la base de datos configurada en el hosting.")} <button type="button">Reintentar</button>`;
    notice.querySelector("button").addEventListener("click", () => window.location.reload());
    document.querySelector("main")?.prepend(notice);
    return;
  }
  renderPublicNavigation();
  sanitizePublicInterface();
  setActiveNav();
  ensureMobileTabbar();
  ensureLegalFooterLinks();
  renderBusinessBlocks();
  initHeaderEffects();
  renderCartCount();
  bindProductActions();
  bindCartTriggers();
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "catalog") renderCatalog();
  if (page === "product") renderProductPage();
  if (page === "collections") renderCollectionsPage();
  if (page === "original") renderOriginalCatalog();
  if (page === "custom") renderCustomBuilder();
  if (page === "cart") renderCartPage();
  if (page === "checkout") renderCheckoutPage();
  if (page === "claims") renderClaimsPage();
  if (page === "confirmation") renderConfirmationPage();
  if (page === "contact") bindShippingEstimator(document);
  enhanceStaticIcons();
  sanitizePublicInterface();
  initSliders();
  initHeroSpotlight();
  initRevealEffects();
  refreshIcons();
});
