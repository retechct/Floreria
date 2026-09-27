// Explicit module dependencies; no shared browser globals.
import { productCard } from "../components/products.js";
import { icon, refreshIcons, initRevealEffects } from "../components/ui.js";
import { escapeHtml } from "../core/format.js";
import { productMap, managedCollections, collectionProductIds } from "../core/store.js";

function renderCollectionsPage() {
  const root = document.querySelector("#collections-page");
  if (!root) return;
  const collections = managedCollections();
  const filters = document.querySelector("#collection-filters");
  const result = document.querySelector("#collection-result");
  let active = "";
  if (filters) {
    filters.innerHTML = `<button class="collection-filter is-active" type="button" data-collection-filter="" aria-pressed="true" aria-controls="collections-page"><span class="collection-filter-image">${icon("flower-2")}</span><span>Todas</span></button>` + collections.map((collection) => {
      const image = collection.image || productMap.get(collectionProductIds(collection)[0])?.image || "assets/logo.svg";
      return `<button class="collection-filter" type="button" data-collection-filter="${escapeHtml(collection.id)}" aria-pressed="false" aria-controls="collections-page"><span class="collection-filter-image"><img src="${escapeHtml(image)}" alt="" loading="lazy" width="88" height="88"></span><span>${escapeHtml(collection.title)}</span></button>`;
    }).join("");
    filters.hidden = !collections.length;
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-collection-filter]");
      if (!button) return;
      active = button.dataset.collectionFilter;
      filters.querySelectorAll("[data-collection-filter]").forEach((item) => {
        const selected = item.dataset.collectionFilter === active;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      paint();
    });
  }
  function paint() {
    const selected = active ? collections.filter((collection) => collection.id === active) : collections;
    if (result) result.textContent = active ? selected[0]?.title || "" : `${collections.length} colecciones para explorar`;
    root.innerHTML = selected.length ? selected.map((collection) => `
    <section class="collection-block">
      <div class="collection-copy">
        <p class="eyebrow">Colección</p>
        <h2>${escapeHtml(collection.title)}</h2>
        <p>${escapeHtml(collection.text)}</p>
        <a class="btn secondary" href="${collection.href || "catalogo.html"}">Ver catalogo</a>
      </div>
      <div class="collection-products">
        ${collectionProductIds(collection).length ? collectionProductIds(collection).slice(0, 4).map((id) => productMap.get(id)).filter(Boolean).map((product) => productCard(product)).join("") : '<p class="catalog-empty">Pronto tendremos nuevos arreglos en esta colección. Puedes explorar las demás colecciones.</p>'}
      </div>
    </section>
    `).join("") : '<p class="catalog-empty">Estamos preparando nuevas colecciones. <a href="catalogo.html">Explorar el catálogo</a></p>';
    refreshIcons();
    initRevealEffects(root);
  }
  paint();
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

export { renderCollectionsPage, renderOriginalCatalog };
