// Explicit module dependencies; no shared browser globals.
import { premiumMediaClass, renderProductGrid } from "../components/products.js";
import { bindShippingEstimator } from "../components/shipping.js";
import { money, escapeHtml } from "../core/format.js";
import { ALL_PRODUCTS, OCCASIONS, FLOWER_GROUPS, showPrices } from "../core/store.js";

function renderHome() {
  const hero = document.querySelector("#hero-picks");
  const heroProducts = [...ALL_PRODUCTS].sort((a, b) => Number(b.featured) - Number(a.featured)).filter((p) => p.available).slice(0, 2);
  if (hero) {
    hero.innerHTML = heroProducts.map((product, index) => `
      <a class="hero-card ${index === 0 ? "main" : index === 1 ? "side" : "accent"}${premiumMediaClass(product)}" href="producto.html?id=${product.id}" aria-label="${escapeHtml(product.name)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="600" height="600" ${index === 0 ? 'fetchpriority="high"' : 'loading="eager"'} decoding="async">
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
        <img src="${escapeHtml(item.image)}" alt="" width="112" height="112" loading="lazy" decoding="async">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  renderProductGrid(document.querySelector("#featured-grid"), ALL_PRODUCTS.filter((p) => p.featured || p.isPromotion).slice(0, 12));

  const flowers = document.querySelector("#flower-grid");
  if (flowers) {
    flowers.innerHTML = FLOWER_GROUPS.map((item) => `
      <a class="flower-card" href="${item.href}">
        <img src="${escapeHtml(item.image)}" alt="" width="112" height="112" loading="lazy" decoding="async">
        <span>${escapeHtml(item.title)}</span>
      </a>
    `).join("");
  }

  const reviews = document.querySelector("#review-grid");
  if (reviews) reviews.closest("section")?.remove();

  bindShippingEstimator(document);
}

export { renderHome };
