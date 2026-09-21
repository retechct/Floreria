"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const money = (value) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
const titles = { overview: "Resumen", products: "Productos", collections: "Colecciones", categories: "Categor\u00edas", promotions: "Promociones", orders: "Pedidos", settings: "Modo tienda", shipping: "Env\u00edos por distrito", data: "Datos y reclamos" };
const statuses = { published: "Publicado", draft: "Borrador", archived: "Archivado", "sold-out": "Agotado" };
let catalog, csrf = "", page = 1, editing = null, dirty = false, busy = false, orders = [], claims = [];
let gallery = [];
let selectedProducts = new Set();
let shippingData, shippingDraft = [], shippingDirty = false, shippingBusy = false;
let storeSettings = null;

function icons() { window.lucide?.createIcons({ attrs: { "stroke-width": 1.7 } }); }
function notify(message, success = false) {
  const node = $("#global-message");
  node.textContent = message;
  node.classList.toggle("success", success);
  node.hidden = false;
}
async function api(path, method = "GET", body) {
  const response = await fetch(`/api/admin/${path}`, {
    method, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "login") {
      $("#editor").close();
      $("#admin-shell").hidden = true;
      $("#login-screen").hidden = false;
      $("#login-message").textContent = "Tu sesi\u00f3n termin\u00f3. Ingresa nuevamente.";
    }
    throw Object.assign(new Error(data.message || "No se pudo completar la solicitud."), { status: response.status });
  }
  return data;
}

function sidebar(open) {
  $("#sidebar").classList.toggle("is-open", open);
  $("#sidebar-shade").hidden = !open;
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
  $("#sidebar").inert = !open && window.innerWidth <= 1000;
  $(".workspace").inert = open && window.innerWidth <= 1000;
  document.body.classList.toggle("sidebar-open", open && window.innerWidth <= 1000);
  if (open) $("#sidebar a").focus();
}
function showView() {
  const requested = location.hash.slice(1).replace(/^admin-/, "");
  const view = titles[requested] ? requested : "overview";
  $$("[data-section]").forEach((section) => { section.hidden = section.dataset.section !== view; });
  $$("[data-view]").forEach((link) => {
    if (link.dataset.view === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#view-title").textContent = titles[view];
  sidebar(false);
  if (view === "orders" || view === "data") refreshOrders().catch((error) => notify(error.message));
  if (view === "shipping" && !shippingData) loadShipping().catch((error) => notify(error.message));
  if (view === "settings" && storeSettings) renderSettings();
}

function renderSettings() {
  if (!storeSettings) return;
  const enabled = storeSettings.salesEnabled !== false;
  $("#sales-enabled").checked = enabled;
  $("#hide-prices-when-closed").checked = storeSettings.hidePricesWhenClosed !== false;
  $("#quote-phone").value = storeSettings.quotePhone || "";
  $("#quote-message").value = storeSettings.quoteMessage || "";
  $("#store-mode-badge").textContent = enabled ? "Ventas activas" : "Solo cotizacion";
  $("#store-mode-badge").className = `status ${enabled ? "published" : "draft"}`;
  $("#store-mode-title").textContent = enabled ? "La tienda acepta compras" : "La tienda solo recibe cotizaciones";
  $("#store-mode-copy").textContent = enabled ? "La web muestra precios, carrito y pago con Culqi." : "La web oculta carrito y cambia los botones por cotizacion en WhatsApp.";
}

async function loadSettings() {
  storeSettings = (await api("settings")).settings;
  renderSettings();
}

async function saveSettings(event) {
  event.preventDefault();
  const button = event.submitter || $("#store-mode-form button[type='submit']");
  button.disabled = true;
  $("#store-mode-message").textContent = "Guardando modo...";
  try {
    storeSettings = (await api("settings", "PUT", {
      revision: storeSettings.revision,
      salesEnabled: $("#sales-enabled").checked,
      hidePricesWhenClosed: $("#hide-prices-when-closed").checked,
      quotePhone: $("#quote-phone").value,
      quoteMessage: $("#quote-message").value,
    })).settings;
    renderSettings();
    $("#store-mode-message").textContent = storeSettings.salesEnabled === false ? "Modo cotizacion activo. La tienda ya no muestra carrito ni precios." : "Ventas activas. La tienda muestra precios, carrito y checkout.";
    notify("Modo de tienda guardado.", true);
  } catch (error) {
    $("#store-mode-message").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function loadShipping() {
  if (shippingBusy) return;
  if (shippingDirty && !window.confirm("Hay tarifas sin guardar. \u00bfQuieres descartarlas y recargar?")) return;
  shippingData = (await api("shipping")).shipping;
  shippingDraft = structuredClone(shippingData.districts);
  shippingDirty = false;
  $("#shipping-message").textContent = "";
  renderShipping();
}
function renderShipping() {
  const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const term = normalized($("#shipping-search").value.trim());
  const province = $("#shipping-province").value, state = $("#shipping-state").value;
  const list = shippingDraft.filter((d) => (!term || normalized(d.name).includes(term)) && (!province || d.province === province) && (!state || (state === "enabled" ? d.enabled : state === "pending" ? d.fee === null : !d.enabled)));
  $("#shipping-count").textContent = `${list.length} distritos \u00b7 ${shippingDraft.filter((d) => d.enabled).length} activos \u00b7 ${shippingDraft.filter((d) => d.fee === null).length} sin tarifa`;
  $("#shipping-list").innerHTML = list.map((d) => `<div class="shipping-row" data-district-id="${d.id}"><div><strong>${esc(d.name)}</strong><small>${esc(d.province)}${d.fee === null ? " \u00b7 Sin tarifa" : ""}</small></div><label class="shipping-price"><span class="sr-only">Tarifa de ${esc(d.name)}</span><span aria-hidden="true">S/</span><input type="number" inputmode="decimal" min="0" max="9999" step="0.01" data-fee="${d.id}" value="${d.fee ?? ""}" placeholder="Pendiente" ${shippingBusy ? "disabled" : ""}></label><label class="check shipping-toggle"><input type="checkbox" data-enabled="${d.id}" aria-label="Entregas en ${esc(d.name)}" ${d.enabled ? "checked" : ""} ${shippingBusy ? "disabled" : ""}><span>${d.enabled ? "Activo" : "Inactivo"}</span></label></div>`).join("") || '<p class="empty">No hay distritos para esta b\u00fasqueda.</p>';
  $("#save-shipping").disabled = !shippingDirty || shippingBusy;
}
async function saveShipping(event) {
  event.preventDefault();
  if (!shippingDirty || shippingBusy) return;
  if (shippingDraft.some((d) => d.enabled && d.fee === null)) { $("#shipping-message").textContent = "Asigna un precio a cada distrito activo."; return; }
  if (shippingDraft.some((d) => d.fee !== null && (!Number.isFinite(d.fee) || d.fee < 0 || d.fee > 9999 || Math.abs(d.fee * 100 - Math.round(d.fee * 100)) > 0.000001))) { $("#shipping-message").textContent = "Revisa las tarifas: de 0 a 9999, con hasta dos decimales."; return; }
  shippingBusy = true; renderShipping();
  $("#shipping-message").textContent = "Guardando tarifas...";
  try {
    shippingData = (await api("shipping", "PUT", { revision: shippingData.revision, districts: shippingDraft.map(({ id, fee, enabled }) => ({ id, fee, enabled })) })).shipping;
    shippingDraft = structuredClone(shippingData.districts); shippingDirty = false;
    $("#shipping-message").textContent = "Tarifas guardadas.";
  } catch (error) { $("#shipping-message").textContent = error.message; }
  finally { shippingBusy = false; renderShipping(); }
}
function photo(image, name, className = "") {
  return image ? `<img class="${className}" src="${esc(image)}" alt="${esc(name)}" loading="lazy">` : `<span class="photo-placeholder">${icon("image")}</span>`;
}
function actionButtons(kind, item) {
  return `<div class="row-actions"><button class="icon-button" type="button" data-edit="${kind}" data-id="${esc(item.id)}" aria-label="Editar ${esc(item.name || item.title)}" title="Editar">${icon("pencil")}</button><button class="icon-button" type="button" data-delete="${kind}" data-id="${esc(item.id)}" aria-label="Eliminar ${esc(item.name || item.title)}" title="Eliminar">${icon("trash-2")}</button></div>`;
}
function productRow(product) {
  const state = product.available === false && product.status === "published" ? "sold-out" : product.status;
  return `<article class="product-row">
    <div class="product-name">${photo(product.image, product.name)}<div><strong>${esc(product.name)}</strong><small>${esc(product.sku || product.id)} &middot; ${product.images.length} fotos</small></div></div>
    <span class="row-category">${esc(product.category)}</span>
    <span class="product-price">${product.compareAtPrice ? `<del>${money(product.compareAtPrice)}</del>` : ""}${money(product.price)}</span>
    <span class="product-status"><span class="status ${state}">${statuses[state]}</span></span>${actionButtons("products", product)}
  </article>`;
}
function renderProducts() {
  const term = $("#product-search").value.trim().toLocaleLowerCase();
  const state = $("#product-state").value;
  const category = $("#product-category").value;
  const list = catalog.products.filter((p) => (!term || `${p.name} ${p.sku}`.toLocaleLowerCase().includes(term)) && (!category || p.category === category) && (!state || (state === "sold-out" ? p.available === false : p.status === state)));
  const pages = Math.max(1, Math.ceil(list.length / 16));
  page = Math.min(page, pages);
  $("#products-list").innerHTML = list.slice((page - 1) * 16, page * 16).map(productRow).join("") || '<p class="empty">No hay productos para esta b\u00fasqueda.</p>';
  $("#products-result").textContent = `${list.length} productos`;
  $("#page-number").textContent = `${page} / ${pages}`;
  $("#previous-page").disabled = page === 1;
  $("#next-page").disabled = page === pages;
  icons();
}
function render() {
  $("#nav-product-count").textContent = catalog.products.length;
  $("#product-total").textContent = catalog.products.length;
  const category = $("#product-category").value;
  $("#product-category").innerHTML = '<option value="">Todas las categor\u00edas</option>' + catalog.categories.map((c) => `<option>${esc(c.name)}</option>`).join("");
  $("#product-category").value = catalog.categories.some((c) => c.name === category) ? category : "";
  const metrics = [
    ["Productos", catalog.products.length, "flower-2"],
    ["Publicados", catalog.products.filter((p) => p.status === "published").length, "circle-check"],
    ["Colecciones", catalog.collections.length, "layers-3"],
    ["Promociones", catalog.products.filter((p) => p.isPromotion).length, "badge-percent"],
  ];
  $("#metrics").innerHTML = metrics.map(([label, count, symbol]) => `<div class="metric"><span>${icon(symbol)}${label}</span><strong>${count}</strong></div>`).join("");
  const missing = catalog.products.filter((p) => p.images.length < 2);
  const drafts = catalog.products.filter((p) => p.status === "draft");
  $("#catalog-tasks").innerHTML = [
    `<div class="task-row">${icon("images")}<span>${missing.length} productos con menos de dos fotos</span><a href="#products" class="text-link">Revisar</a></div>`,
    `<div class="task-row">${icon("file-pen-line")}<span>${drafts.length} productos en borrador</span><a href="#products" class="text-link">Revisar</a></div>`,
  ].join("");
  $("#recent-products").innerHTML = [...catalog.products].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 4).map(productRow).join("") || '<p class="empty">A\u00fan no hay productos.</p>';
  $("#collections-list").innerHTML = catalog.collections.map((c) => {
    const cover = c.image || catalog.products.find((p) => c.productIds.includes(p.id))?.image;
    return `<article class="collection-card">${photo(cover, c.title)}<div class="collection-card-body"><h3>${esc(c.title)}</h3><p>${c.productIds.length} productos</p></div><footer><span class="status ${c.status}">${statuses[c.status]}</span>${actionButtons("collections", c)}</footer></article>`;
  }).join("") || '<p class="empty">A\u00fan no hay colecciones.</p>';
  $("#categories-list").innerHTML = catalog.categories.map((c) => `<article class="category-row"><div class="product-name">${photo(c.image, c.name)}<div><strong>${esc(c.name)}</strong><small>${catalog.products.filter((p) => p.category === c.name).length} productos</small></div></div>${actionButtons("categories", c)}</article>`).join("") || '<p class="empty">A\u00fan no hay categor\u00edas.</p>';
  $("#promotions-list").innerHTML = catalog.products.filter((p) => p.isPromotion).map(productRow).join("") || '<p class="empty">A\u00fan no hay promociones.</p>';
  renderProducts();
  icons();
}

function input(label, name, value = "", options = "") {
  return `<label>${label}<input name="${name}" value="${esc(value)}" ${options}></label>`;
}
function select(label, name, choices, value) {
  return `<label>${label}<select name="${name}">${choices.map(([id, title]) => `<option value="${esc(id)}" ${id === value ? "selected" : ""}>${esc(title)}</option>`).join("")}</select></label>`;
}
function check(label, name, checked, value = "on") {
  return `<label class="check"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""}>${esc(label)}</label>`;
}
function specRow(spec = {}) {
  return `<div class="spec-row"><input aria-label="Nombre de especificacion" data-spec-label value="${esc(spec.label)}" placeholder="Ej. Dimensiones" maxlength="80" required><input aria-label="Valor de especificacion" data-spec-value value="${esc(spec.value)}" placeholder="Ej. 35 x 45 cm" maxlength="400" required><button class="icon-button" type="button" data-remove-spec aria-label="Eliminar especificacion" title="Eliminar">${icon("x")}</button></div>`;
}
function mediaEditor() {
  return `<section class="form-section"><h3>Im&aacute;genes del producto</h3><div class="image-slots" id="image-slots"></div>
    <div class="media-actions"><button class="button" type="button" id="choose-images">${icon("upload")}Cargar fotos</button><input id="image-files" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></div>
    <p class="form-note">2 o 3 im&aacute;genes &middot; JPG, PNG o WebP &middot; hasta 3 MB cada una</p>
    <div class="media-url"><input type="url" id="image-url" placeholder="https://..." aria-label="URL de imagen"><button type="button" class="icon-button" id="add-image-url" aria-label="Agregar imagen por URL" title="Agregar URL">${icon("plus")}</button></div>
  </section>`;
}
function renderGallery() {
  $("#image-slots").innerHTML = Array.from({ length: 3 }, (_, i) => `<div class="image-slot">${gallery[i] ? `<img src="${esc(gallery[i])}" alt="Imagen ${i + 1}">` : `<div class="image-empty">${icon("image-plus")}</div>`}<small>${i === 0 ? "Principal" : `Foto ${i + 1}`}</small><footer>${gallery[i] ? `<button class="icon-button" type="button" data-move-image="${i}" data-direction="-1" ${i === 0 ? "disabled" : ""} title="Mover antes" aria-label="Mover foto ${i + 1} antes">${icon("arrow-left")}</button><button class="icon-button" type="button" data-move-image="${i}" data-direction="1" ${i === gallery.length - 1 ? "disabled" : ""} title="Mover despues" aria-label="Mover foto ${i + 1} despues">${icon("arrow-right")}</button><button class="icon-button" type="button" data-remove-image="${i}" title="Quitar foto" aria-label="Quitar foto ${i + 1}">${icon("trash-2")}</button>` : ""}</footer></div>`).join("");
  icons();
}
function coverEditor(item) {
  return `<section class="form-section"><h3>Imagen de portada</h3><div id="cover-preview">${item.image ? photo(item.image, "Portada", "cover-preview") : ""}</div>${input("Imagen", "image", item.image, 'maxlength="1000" placeholder="https://... o imagen cargada"')}<input type="file" id="cover-file" accept="image/jpeg,image/png,image/webp" aria-label="Cargar portada"><p class="form-note">JPG, PNG o WebP &middot; hasta 3 MB</p></section>`;
}
function renderPicker() {
  const term = $("#picker-search").value.trim().toLocaleLowerCase();
  $("#product-picker").innerHTML = catalog.products.filter((p) => !term || `${p.name} ${p.category}`.toLocaleLowerCase().includes(term)).map((p) => `<label class="picker-row"><input type="checkbox" data-pick-product="${esc(p.id)}" ${selectedProducts.has(p.id) ? "checked" : ""}>${p.image ? photo(p.image, "") : ""}<span>${esc(p.name)}<small class="form-note"> &middot; ${esc(p.category)}</small></span><b>${money(p.price)}</b></label>`).join("") || '<p class="empty">No hay coincidencias.</p>';
  $("#selected-count").textContent = `${selectedProducts.size} seleccionados`;
}

function openEditor(kind, id, promotion = false) {
  const item = id ? catalog[kind].find((record) => record.id === id) : {};
  if (!item) return;
  editing = { kind, id, revision: catalog.revision };
  gallery = [...(item.images || [])];
  selectedProducts = new Set(item.productIds || []);
  dirty = false;
  $("#editor-message").textContent = "";
  $("#reload-editor").hidden = true;
  $("#editor-kind").textContent = titles[kind];
  $("#editor-title").textContent = id ? (item.name || item.title) : ({ products: "Nuevo producto", collections: "Nueva colecci\u00f3n", categories: "Nueva categor\u00eda" })[kind];
  if (kind === "products") {
    $("#editor-fields").innerHTML = `<div class="editor-columns"><div>
      <section class="form-section"><h3>Informaci&oacute;n del producto</h3>${input("Nombre", "name", item.name, 'required maxlength="120"')}${input("SKU / referencia", "sku", item.sku, 'maxlength="64"')}<label>Descripci&oacute;n<textarea name="description" rows="5" maxlength="5000" required>${esc(item.description)}</textarea></label></section>
      <section class="form-section"><h3>Precios</h3><div class="form-grid">${input("Precio de venta (S/)", "price", item.price, 'type="number" min="0.01" max="99999" step="0.01" required')}${input("Precio anterior (S/)", "compareAtPrice", item.compareAtPrice, 'type="number" min="0.01" max="99999" step="0.01"')}</div>${check("Mostrar en promociones", "isPromotion", item.isPromotion || promotion)}</section>
      <section class="form-section"><h3>Especificaciones</h3><div id="specifications">${(item.specifications || []).map(specRow).join("")}</div><div><button class="button" type="button" id="add-spec">${icon("plus")}Agregar especificaci&oacute;n</button></div></section>
    </div><div>
      <section class="form-section"><h3>Publicaci&oacute;n</h3>${select("Estado", "status", [["draft", "Borrador"], ["published", "Publicado"], ["archived", "Archivado"]], item.status || "draft")}${check("Disponible para comprar", "available", item.available !== false)}${check("Destacado en inicio", "featured", item.featured)}</section>
      ${mediaEditor()}
      <section class="form-section"><h3>Organizaci&oacute;n</h3>${select("Categor&iacute;a", "category", catalog.categories.map((c) => [c.name, c.name]), item.category)}${input("Ocasi&oacute;n", "occasion", item.occasion, 'maxlength="64" list="occasion-options"')}<datalist id="occasion-options">${[...new Set(catalog.products.map((p) => p.occasion).filter(Boolean))].map((o) => `<option value="${esc(o)}"></option>`).join("")}</datalist>${input("Etiqueta", "badge", item.badge, 'maxlength="40" placeholder="Ej. 12 rosas"')}</section>
      <section class="form-section"><h3>Colecciones</h3><div class="collection-options">${catalog.collections.map((c) => check(c.title, "collectionIds", c.productIds.includes(id), c.id)).join("") || '<p class="form-note">A&uacute;n no hay colecciones.</p>'}</div></section>
    </div></div>`;
    renderGallery();
  } else if (kind === "collections") {
    $("#editor-fields").innerHTML = `<div class="editor-columns"><div><section class="form-section"><h3>Detalles de la colecci&oacute;n</h3>${input("Nombre", "title", item.title, 'required maxlength="100"')}<label>Descripci&oacute;n<textarea name="description" rows="4" maxlength="2000">${esc(item.description)}</textarea></label>${select("Estado", "status", [["draft", "Borrador"], ["published", "Publicado"]], item.status || "draft")}</section><section class="form-section"><h3>Productos <span class="form-note" id="selected-count"></span></h3><input type="search" id="picker-search" placeholder="Buscar productos" aria-label="Buscar productos de la coleccion"><div id="product-picker" class="product-picker"></div></section></div><div>${coverEditor(item)}</div></div>`;
    renderPicker();
  } else {
    $("#editor-fields").innerHTML = `<div class="form-section">${input("Nombre de la categor&iacute;a", "name", item.name, 'required maxlength="64"')}</div>${coverEditor(item)}`;
  }
  $("#editor").showModal();
  $("#editor-fields").scrollTop = 0;
  $("#editor-form input:not([type=checkbox])")?.focus();
  icons();
}

function closeEditor() {
  if (busy) return;
  if (dirty && !window.confirm("Hay cambios sin guardar. \u00bfQuieres descartarlos?")) return;
  dirty = false;
  $("#editor").close();
}
function setBusy(value) {
  busy = value;
  $$("#editor button, #editor input, #editor select, #editor textarea").forEach((node) => { node.disabled = value; });
  if (!value && editing?.kind === "products") renderGallery();
}
async function upload(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error("Usa JPG, PNG o WebP de hasta 3 MB.");
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
  return (await api("images", "POST", { data })).url;
}
async function uploadFiles(files, cover = false) {
  if (busy || !files.length) return;
  if (!cover && gallery.length + files.length > 3) { $("#editor-message").textContent = "Cada producto admite hasta tres fotos. Quita una para reemplazarla."; return; }
  setBusy(true);
  $("#editor-message").textContent = "Cargando imagen...";
  try {
    for (const file of files) {
      const url = await upload(file);
      if (cover) {
        $("#editor-form").elements.image.value = url;
        $("#cover-preview").innerHTML = photo(url, "Portada", "cover-preview");
      } else if (!gallery.includes(url)) gallery.push(url);
    }
    dirty = true;
    $("#editor-message").textContent = "";
  } catch (error) { $("#editor-message").textContent = error.message; }
  finally { setBusy(false); }
}
async function saveEditor(event) {
  event.preventDefault();
  if (busy) return;
  const form = new FormData($("#editor-form"));
  const item = Object.fromEntries(form);
  if (editing.kind === "products") {
    item.images = gallery;
    item.price = Number(form.get("price"));
    item.specifications = $$("#specifications .spec-row").map((row) => ({ label: row.querySelector("[data-spec-label]").value, value: row.querySelector("[data-spec-value]").value }));
    ["available", "featured", "isPromotion"].forEach((key) => { item[key] = form.has(key); });
  }
  if (editing.kind === "collections") item.productIds = [...selectedProducts];
  const body = { item, revision: editing.revision };
  if (editing.kind === "products") body.collectionIds = form.getAll("collectionIds");
  setBusy(true);
  $("#editor-message").textContent = "Guardando...";
  try {
    const result = await api(`${editing.kind}${editing.id ? `/${editing.id}` : ""}`, editing.id ? "PUT" : "POST", body);
    catalog = result.catalog;
    dirty = false;
    $("#editor").close();
    render();
    notify("Cambios guardados en la tienda.", true);
  } catch (error) {
    $("#editor-message").textContent = error.message;
    if (error.status === 409) {
      const fresh = await api("catalog").catch(() => null);
      if (fresh) {
        catalog = fresh.catalog;
        $("#reload-editor").hidden = catalog.revision === editing.revision;
        render();
      }
    }
  } finally { setBusy(false); }
}
async function removeRecord(kind, id) {
  const item = catalog[kind].find((record) => record.id === id);
  $("#confirm-title").textContent = `Eliminar ${item.name || item.title}`;
  $("#confirm-text").textContent = kind === "products" ? "El producto se retirar\u00e1 del cat\u00e1logo y de todas sus colecciones." : "Este registro se eliminar\u00e1 de la tienda.";
  const dialog = $("#confirm-dialog");
  dialog.returnValue = "";
  dialog.showModal();
  await new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
  if (dialog.returnValue !== "confirm") return;
  try {
    const result = await api(`${kind}/${id}`, "DELETE", { revision: catalog.revision });
    catalog = result.catalog;
    render();
    notify("Registro eliminado.", true);
  } catch (error) { notify(error.message); }
}

function download(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function refreshOrders() {
  const result = await api("orders");
  orders = result.orders;
  claims = result.claims;
  const paymentStates = { completed: "Pago confirmado", processing: "Procesando", requires_action: "Verificacion bancaria pendiente", pending_review: "Pago por verificar", failed: "Pago no aprobado", cancelled: "Intento cancelado" };
  $("#orders-list").innerHTML = orders.map((order) => `<details class="order-row"><summary><strong>${esc(order.orderId)}</strong> &middot; ${money(order.total)} &middot; ${esc(paymentStates[order.status] || order.status)}</summary><p>${esc(order.customer.first_name)} ${esc(order.customer.last_name)} &middot; ${esc(order.customer.email)} &middot; ${esc(order.customer.phone)}</p><p>Productos: ${money(order.subtotal)} &middot; Envio: ${money(order.deliveryFee)}<br>Culqi: ${esc(order.culqi_id || "Sin cargo confirmado")}</p><p>${esc(order.delivery.date)} &middot; ${esc(order.delivery.slot)} &middot; ${esc(order.delivery.district)}<br>${esc(order.delivery.address)}<br>${esc(order.delivery.reference)}</p><p>Destinatario: ${esc(order.delivery.recipient)} &middot; ${esc(order.delivery.recipient_phone)}<br>Dedicatoria: ${esc(order.delivery.dedication)}</p><ul>${order.items.map((p) => `<li>${p.qty} &times; ${esc(p.name)} &middot; ${money(p.line_total)}<p>${esc(p.note)}</p></li>`).join("")}</ul>${order.status !== "completed" ? `<form class="reconcile-form" data-reconcile-order="${esc(order.orderId)}"><label>Cargo Culqi<input name="charge_id" value="${esc(order.culqi_id || "")}" placeholder="chr_test_... / chr_live_..." required maxlength="25" autocomplete="off"></label><button class="button" type="submit">${icon("refresh-cw")}Verificar cargo</button><p class="message" role="status"></p></form>` : ""}</details>`).join("") || '<p class="empty">Todavia no hay pedidos registrados.</p>';
  icons();
  $("#claims-list").innerHTML = claims.map((claim) => `<details class="order-row"><summary><strong>${esc(claim.code)}</strong> &middot; ${esc(claim.type)} &middot; ${esc(claim.created_at.slice(0, 10))}</summary><p>${esc(claim.consumer.name)} &middot; ${esc(claim.consumer.email)} &middot; ${esc(claim.consumer.phone)}</p><p>${esc(claim.claim.detail)}</p><p>${esc(claim.claim.request)}</p></details>`).join("") || '<p class="empty">No hay reclamos registrados.</p>';
}
function legacyData() {
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  return { categories: read("la-casa-admin-categories-v1", []), collections: read("la-casa-admin-occasions-v1", []), products: read("la-casa-admin-promotions-v1", []), assignments: read("la-casa-admin-collection-products-v1", {}) };
}
async function enter() {
  const result = await api("catalog");
  catalog = result.catalog;
  await loadSettings();
  $("#login-screen").hidden = true;
  $("#admin-shell").hidden = false;
  $("#login-form").elements.password.value = "";
  $("#storage-status").textContent = result.storage === "postgres" ? "Cat\u00e1logo e im\u00e1genes guardados en la base de datos." : "Cat\u00e1logo e im\u00e1genes guardados en el servidor local.";
  const legacy = legacyData();
  const count = legacy.categories.length + legacy.collections.length + legacy.products.length + Object.keys(legacy.assignments).length;
  $("#legacy-import-row").hidden = !count;
  $("#legacy-import-count").textContent = `${count} registros encontrados en este navegador.`;
  render();
  showView();
}

document.addEventListener("DOMContentLoaded", async () => {
  $("#orders-list").addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-reconcile-order]");
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    form.querySelector(".message").textContent = "Consultando Culqi...";
    try {
      const result = await api("orders/" + form.dataset.reconcileOrder + "/reconcile", "POST", { charge_id: form.elements.charge_id.value.trim() });
      await refreshOrders();
      notify(result.order.status === "completed" ? "Culqi confirmo el pago." : "El cargo aun requiere verificacion.", result.order.status === "completed");
    } catch (error) { form.querySelector(".message").textContent = error.message; }
    finally { button.disabled = false; }
  });
  $("#shipping-form").addEventListener("submit", saveShipping);
  $("#store-mode-form").addEventListener("submit", saveSettings);
  $("#reload-shipping").addEventListener("click", () => loadShipping().catch((error) => notify(error.message)));
  ["shipping-search", "shipping-province", "shipping-state"].forEach((id) => $("#" + id).addEventListener(id === "shipping-search" ? "input" : "change", renderShipping));
  $("#shipping-list").addEventListener("input", (event) => {
    const input = event.target;
    const district = shippingDraft.find((d) => d.id === (input.dataset.fee || input.dataset.enabled));
    if (!district || shippingBusy) return;
    if (input.dataset.fee) district.fee = input.value === "" ? null : Number(input.value);
    else { district.enabled = input.checked; input.nextElementSibling.textContent = input.checked ? "Activo" : "Inactivo"; }
    shippingDirty = true;
    $("#save-shipping").disabled = false;
    $("#shipping-message").textContent = "Cambios sin guardar.";
  });
  icons();
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#login-form button");
    button.disabled = true;
    $("#login-message").textContent = "Ingresando...";
    try {
      const data = await api("login", "POST", Object.fromEntries(new FormData(event.target)));
      csrf = data.csrf;
      await enter();
    } catch (error) { $("#login-message").textContent = error.message; }
    finally { button.disabled = false; }
  });
  $("#logout").addEventListener("click", async () => {
    try { await api("logout", "POST", {}); location.reload(); }
    catch (error) { notify(error.message); }
  });
  $("#menu-toggle").addEventListener("click", () => sidebar(!$("#sidebar").classList.contains("is-open")));
  $("#sidebar-shade").addEventListener("click", () => { sidebar(false); $("#menu-toggle").focus(); });
  window.addEventListener("resize", () => { if (window.innerWidth > 1000) sidebar(false); else $("#sidebar").inert = !$("#sidebar").classList.contains("is-open"); });
  window.addEventListener("hashchange", () => { if (catalog) showView(); });
  window.addEventListener("beforeunload", (event) => { if (dirty || shippingDirty) { event.preventDefault(); event.returnValue = ""; } });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#editor").open) sidebar(false); });
  $("#editor").addEventListener("cancel", (event) => { event.preventDefault(); closeEditor(); });
  $("#editor-form").addEventListener("submit", saveEditor);
  $("#editor-form").addEventListener("input", (event) => { if (!["picker-search", "image-url"].includes(event.target.id)) dirty = true; });
  $("#editor-form").addEventListener("change", (event) => {
    if (event.target.id === "image-files") uploadFiles([...event.target.files]);
    if (event.target.id === "cover-file") uploadFiles([...event.target.files], true);
    if (event.target.hasAttribute("data-pick-product")) {
      const id = event.target.dataset.pickProduct;
      if (event.target.checked) selectedProducts.add(id); else selectedProducts.delete(id);
      $("#selected-count").textContent = `${selectedProducts.size} seleccionados`;
      dirty = true;
    }
  });
  $("#editor-fields").addEventListener("input", (event) => { if (event.target.id === "picker-search") renderPicker(); });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.dataset.new) openEditor(button.dataset.new === "promotions" ? "products" : button.dataset.new, null, button.dataset.new === "promotions");
    if (button.dataset.edit) openEditor(button.dataset.edit, button.dataset.id);
    if (button.dataset.delete) removeRecord(button.dataset.delete, button.dataset.id);
    if (button.hasAttribute("data-close-editor")) closeEditor();
    if (button.id === "reload-editor" && window.confirm("Se cargara la version actual del servidor y se descartaran los cambios de este formulario.")) {
      const { kind, id } = editing;
      $("#editor").close();
      openEditor(kind, id);
    }
    if (button.id === "choose-images") $("#image-files").click();
    if (button.id === "add-spec" && $$(".spec-row").length < 20) { $("#specifications").insertAdjacentHTML("beforeend", specRow()); dirty = true; icons(); }
    if (button.hasAttribute("data-remove-spec")) { button.closest(".spec-row").remove(); dirty = true; }
    if (button.hasAttribute("data-remove-image")) { gallery.splice(Number(button.dataset.removeImage), 1); dirty = true; renderGallery(); }
    if (button.hasAttribute("data-move-image")) {
      const index = Number(button.dataset.moveImage), next = index + Number(button.dataset.direction);
      [gallery[index], gallery[next]] = [gallery[next], gallery[index]];
      dirty = true; renderGallery();
    }
    if (button.id === "add-image-url") {
      const input = $("#image-url");
      try {
        const url = new URL(input.value);
        if (url.protocol !== "https:" || url.username || url.password) throw new Error();
        if (gallery.length >= 3 || gallery.includes(url.href)) { $("#editor-message").textContent = "Agrega hasta tres fotos diferentes."; return; }
        gallery.push(url.href); input.value = ""; dirty = true; $("#editor-message").textContent = ""; renderGallery();
      } catch { $("#editor-message").textContent = "Ingresa una URL HTTPS v\u00e1lida."; }
    }
  });
  ["product-search", "product-state", "product-category"].forEach((id) => $("#" + id).addEventListener(id === "product-search" ? "input" : "change", () => { page = 1; renderProducts(); }));
  $("#previous-page").addEventListener("click", () => { page--; renderProducts(); });
  $("#next-page").addEventListener("click", () => { page++; renderProducts(); });
  $("#refresh-orders").addEventListener("click", () => refreshOrders().catch((error) => notify(error.message)));
  $("#export-catalog").addEventListener("click", () => download(`catalogo-${new Date().toISOString().slice(0, 10)}.json`, catalog));
  $("#export-claims").addEventListener("click", async () => { try { await refreshOrders(); download("reclamaciones.json", claims); } catch (error) { notify(error.message); } });
  $("#import-legacy").addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
      const result = await api("import-legacy", "POST", { ...legacyData(), revision: catalog.revision });
      catalog = result.catalog; render(); notify("Datos importados. Las promociones anteriores quedaron como borradores para completar sus fotos.", true);
      $("#legacy-import-row").hidden = true;
    } catch (error) { notify(error.message); $("#import-legacy").disabled = false; }
  });
  try {
    const session = await api("session");
    csrf = session.csrf || "";
    if (session.authenticated) await enter();
    else $("#login-message").textContent = session.configured ? "" : "El acceso del administrador a\u00fan no est\u00e1 configurado.";
  } catch (error) { $("#login-message").textContent = error.message; }
});
