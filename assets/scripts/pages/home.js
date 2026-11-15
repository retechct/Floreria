// Explicit module dependencies; no shared browser globals.
import { renderProductGrid } from "../components/products.js";
import { bindShippingEstimator } from "../components/shipping.js";
import { escapeHtml } from "../core/format.js";
import { ALL_PRODUCTS, OCCASIONS, FLOWER_GROUPS, salesOpen } from "../core/store.js";

function renderHome() {
  const occasions = document.querySelector("#occasion-grid");
  if (occasions) {
    occasions.innerHTML = OCCASIONS.map((item) => `
      <a class="occasion-card" data-slider-item href="${item.href || `catalogo.html?ocasion=${encodeURIComponent(item.query)}`}">
        <img src="${escapeHtml(item.image)}" alt="Arreglo floral para ${escapeHtml(item.title)}" width="240" height="240" loading="lazy" decoding="async">
        <span class="occasion-card-title">${escapeHtml(item.title)}</span>
        <small>${item.count} diseños</small>
      </a>
    `).join("");
  }

  renderProductGrid(document.querySelector("#featured-grid"), ALL_PRODUCTS.filter((p) => p.featured || p.isPromotion).slice(0, 12));

  const flowers = document.querySelector("#flower-grid");
  if (flowers) {
    flowers.innerHTML = FLOWER_GROUPS.map((item) => `
      <a class="flower-card" href="${item.href}">
        <img src="${escapeHtml(item.filterImage || item.image)}" alt="Una ${escapeHtml(item.title.toLowerCase())}" width="112" height="112" loading="lazy" decoding="async">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  const reviews = document.querySelector("#review-grid");
  if (reviews) reviews.closest("section")?.remove();

  const deliverySection = document.querySelector(".delivery-section");
  if (salesOpen()) bindShippingEstimator(document);
  else deliverySection?.remove();
}

export { renderHome };
