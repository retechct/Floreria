// Explicit module dependencies; no shared browser globals.
import { quoteButton, icon, refreshIcons, playAddFeedback, initRevealEffects } from "./ui.js";
import { money, escapeHtml } from "../core/format.js";
import { productMap, salesOpen, showPrices } from "../core/store.js";
import { addToCart } from "../features/cart.js";

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

export { premiumMediaClass, productGalleryViews, productCard, renderProductGrid, bindProductActions, openProduct };
