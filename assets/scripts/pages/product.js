// Explicit module dependencies; no shared browser globals.
import { premiumMediaClass, productGalleryViews, renderProductGrid } from "../components/products.js";
import { bindShippingEstimator } from "../components/shipping.js";
import { quoteButton, icon, refreshIcons, playAddFeedback } from "../components/ui.js";
import { money, todayInLima, escapeHtml } from "../core/format.js";
import { ALL_PRODUCTS, productMap, salesOpen, showPrices, quoteUrl } from "../core/store.js";
import { addToCart } from "../features/cart.js";

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
  const routeCopy = salesOpen() ? "Consulta la tarifa y cuéntanos tus preferencias. Confirma la dirección, fecha y horario al finalizar la compra." : "Cotiza por WhatsApp y coordinamos disponibilidad, fecha, dedicatoria y entrega.";
  const stickyNote = salesOpen() ? `${icon("shield-check", "note-icon")}Entrega programada · pago seguro con Culqi` : `${icon("message-circle", "note-icon")}Respuesta por WhatsApp para confirmar disponibilidad`;
  const deliveryMarkup = salesOpen() ? `
        <div class="panel delivery-studio">
          <div class="route-heading">
            <span class="route-mark">${icon("map-pin")}</span>
            <div><p class="eyebrow">Ruta La Casa</p><h3>Prepara la entrega de tu regalo</h3></div>
          </div>
          <p>${routeCopy}</p>
          <div class="route-steps" aria-label="Proceso de entrega"><span>Zona</span><span>Horario</span><span>Confirmación</span></div>
          <label for="product-district">Distrito de entrega</label>
          <input class="field" id="product-district" type="search" placeholder="Escribe tu distrito" aria-describedby="product-shipping-result">
          <div class="district-pills" data-district-pills></div>
          <p class="tiny-note" id="product-shipping-result" data-shipping-result role="status"></p>
        </div>` : "";
  const deliveryPreferencesMarkup = salesOpen() ? `
            <div class="form-line">
              <label for="delivery-date">Fecha de entrega preferida</label>
              <input class="field" id="delivery-date" type="date" aria-describedby="delivery-preferences-note">
            </div>
            <div class="form-line">
              <label for="delivery-slot">Horario preferido</label>
              <select class="field" id="delivery-slot" aria-describedby="delivery-preferences-note">
                <option value="">A coordinar</option><option>09:00 - 12:00</option><option>12:00 - 15:00</option><option>15:00 - 18:00</option><option>18:00 - 20:00</option><option>20:00 - 22:00</option>
              </select>
            </div>` : "";
  document.title = `${product.name} | La Casa de las Flores Atelier`;

  root.innerHTML = `
    <nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="index.html">Inicio</a><span aria-hidden="true">/</span><a href="catalogo.html">Catálogo</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(product.name)}</span></nav>
    <div class="product-detail">
      <div class="gallery">
        <div class="thumbs" aria-label="Vistas de ${escapeHtml(product.name)}">
          ${galleryViews.map((view, index) => `
            <button class="thumb ${index === 0 ? "is-active" : ""}" type="button" data-gallery-mode="${view.mode}" data-gallery-src="${escapeHtml(view.image)}" data-gallery-label="${escapeHtml(view.label)}" aria-pressed="${index === 0}" aria-label="${escapeHtml(view.label)} de ${escapeHtml(product.name)}">
              <span class="thumb-frame"><img class="gallery-crop-${view.mode}" src="${escapeHtml(view.image)}" alt="${escapeHtml(view.label)} de ${escapeHtml(product.name)}"></span>
              <span class="thumb-label">${escapeHtml(view.short)}</span>
            </button>
          `).join("")}
        </div>
        <div class="main-photo${premiumMediaClass(product)} gallery-view-front" data-main-photo>
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="600" height="600" fetchpriority="high" data-main-gallery-img>
          <span class="view-chip" data-gallery-caption>Vista completa</span>
        </div>
      </div>
      <div class="buy-panel">
        <div class="product-title-row">
          <span class="badge">${escapeHtml(product.category)}</span>
          <h1>${escapeHtml(product.name)}</h1>
          ${priceMarkup}
          <p class="product-intro">${escapeHtml(product.description)}</p>
        </div>
        ${deliveryMarkup}
        <div class="panel">
          <p class="eyebrow">El toque final</p>
          <h3>Personaliza tu regalo</h3>
          <div class="form-grid">
            <div class="form-line full">
              <label for="gift-note">Dedicatoria</label>
              <textarea class="textarea" id="gift-note" maxlength="250" placeholder="Escribe unas lineas y firma para que sepan de quien es"></textarea>
              <span class="counter"><span id="gift-count">0</span>/250</span>
            </div>
            ${deliveryPreferencesMarkup}
          </div>
          <p class="tiny-note" id="delivery-preferences-note">${salesOpen() ? "Son preferencias de entrega, sujetas a disponibilidad y confirmación." : "La disponibilidad y la entrega se coordinan durante la cotización."}</p>
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
              <li>${salesOpen() ? "El envío no está incluido en el precio." : "La disponibilidad y la entrega se confirman al cotizar."}</li>
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
  }
  const note = root.querySelector("#gift-note");
  const counter = root.querySelector("#gift-count");
  note?.addEventListener("input", () => {
    counter.textContent = note.value.length;
  });
  bindProductGallery(root);
  if (salesOpen()) bindShippingEstimator(root);
  function personalizationLines() {
    const extras = [...root.querySelectorAll(".check-option input:checked")].map((item) => item.value);
    const district = root.querySelector("#product-district")?.value || "";
    const deliveryDate = root.querySelector("#delivery-date")?.value || "";
    const slot = root.querySelector("#delivery-slot")?.value || "";
    return [
      note?.value ? `Dedicatoria: ${note.value}` : "",
      deliveryDate ? `Fecha: ${deliveryDate}` : "",
      slot ? `Horario: ${slot}` : "",
      district ? `Distrito: ${district}` : "",
      extras.length ? `Extras: ${extras.join(", ")}` : "",
    ].filter(Boolean);
  }
  const quoteLink = root.querySelector('.sticky-add a[href^="https://wa.me/"]');
  function updateQuoteLink() {
    if (!quoteLink) return;
    const url = new URL(quoteUrl(product));
    url.searchParams.set("text", [url.searchParams.get("text"), ...personalizationLines()].join("\n"));
    quoteLink.href = url.href;
  }
  root.addEventListener("input", updateQuoteLink);
  root.addEventListener("change", updateQuoteLink);
  quoteLink?.addEventListener("click", event => {
    if (dateInput && !dateInput.reportValidity()) event.preventDefault();
    updateQuoteLink();
  });
  updateQuoteLink();
  const detailAddButton = root.querySelector("#add-product-detail");
  detailAddButton?.addEventListener("click", () => {
    if (!dateInput.reportValidity()) return;
    playAddFeedback(detailAddButton);
    addToCart(product.id, 1, personalizationLines().join(" | "));
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
      thumbs.forEach((item) => {
        item.classList.toggle("is-active", item === thumb);
        item.setAttribute("aria-pressed", String(item === thumb));
      });
      if (caption) caption.textContent = thumb.dataset.galleryLabel || "Vista del producto";
    });
  });
}

export { renderProductPage, bindProductGallery };
