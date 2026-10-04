// Explicit module dependencies; no shared browser globals.
import { renderProductGrid } from "../components/products.js";
import { icon } from "../components/ui.js";
import { escapeHtml } from "../core/format.js";
import { ALL_PRODUCTS, CATEGORIES, OCCASIONS, catalogCollections, featuredRank, showPrices } from "../core/store.js";

function renderCatalog() {
  const filterRow = document.querySelector("#filter-row");
  const grid = document.querySelector("#product-grid");
  const search = document.querySelector("#catalog-search");
  const sort = document.querySelector("#catalog-sort");
  const result = document.querySelector("#result-line");
  const pagination = document.querySelector("#catalog-pagination");
  const pageLabel = document.querySelector("#catalog-page-label");
  const occasion = document.querySelector('#catalog-occasion');
  const occasionFilters = document.querySelector('#occasion-filters');
  const occasionCarousel = document.querySelector('#occasion-carousel');
  const budget = document.querySelector('#catalog-budget');
  const available = document.querySelector('#catalog-available');
  const filterContext = document.querySelector('#catalog-filter-context');
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const params = new URLSearchParams(location.search);
  const pageSize = 12;
  let currentPage = Math.max(1, Math.min(10000, Math.floor(Number(params.get('pagina')) || 1)));
  let totalPages = 1;
  if (!grid) return;

  const urlCategory = params.get('categoria');
  let urlOccasion = params.get('ocasion') || '';
  let promoOnly = params.get('promociones') === '1';
  let collectionId = params.get('coleccion');
  const collection = catalogCollections.find((c) => c.id === collectionId);
  let activeCategory = CATEGORIES.includes(urlCategory) ? urlCategory : "Todos";
  const occasionValues = OCCASIONS.map(item => item.query);
  if (urlOccasion && !occasionValues.includes(urlOccasion)) occasionValues.push(urlOccasion);
  occasion.innerHTML = '<option value="">Todas las ocasiones</option>' + occasionValues.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(OCCASIONS.find(item => item.query === value)?.title || value)}</option>`).join('');
  occasion.value = urlOccasion;
  search.value = (params.get('q') || '').slice(0, 150);
  if ([...sort.options].some(option => option.value === params.get('orden'))) sort.value = params.get('orden');
  if ([...budget.options].some(option => option.value === params.get('presupuesto'))) budget.value = params.get('presupuesto');
  available.checked = params.get('disponibles') === '1';
  if (sort && !showPrices()) {
    [...sort.options].forEach((option) => {
      if (option.value.startsWith("price-")) option.remove();
    });
    document.querySelector('#catalog-budget-label').hidden = true;
    budget.value = '';
  }

  function syncUrl() {
    const url = new URL(location.href);
    const values = { categoria: activeCategory === 'Todos' ? '' : activeCategory, ocasion: urlOccasion, promociones: promoOnly ? '1' : '', coleccion: collectionId || '', q: search.value.trim(), orden: sort.value === 'featured' ? '' : sort.value, presupuesto: budget.value, disponibles: available.checked ? '1' : '', pagina: currentPage > 1 ? String(currentPage) : '' };
    for (const [key,value] of Object.entries(values)) { if (value) url.searchParams.set(key,value); else url.searchParams.delete(key); }
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function paintFilters() {
    filterRow.innerHTML = CATEGORIES.map((category) => `
      <button type="button" class="filter-chip ${category === activeCategory ? "is-active" : ""}" aria-pressed="${category === activeCategory}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
    `).join("");
  }

  function paintOccasionFilters() {
    if (!occasionFilters) return;
    occasionFilters.innerHTML = `<button class="collection-filter${urlOccasion ? '' : ' is-active'}" type="button" data-occasion-filter="" aria-pressed="${!urlOccasion}" aria-controls="product-grid"><span class="collection-filter-image">${icon('flower-2')}</span><span>Todas</span></button>` + OCCASIONS.map((item) => {
      const selected = item.query === urlOccasion;
      return `<button class="collection-filter${selected ? ' is-active' : ''}" type="button" data-occasion-filter="${escapeHtml(item.query)}" aria-pressed="${selected}" aria-controls="product-grid"><span class="collection-filter-image"><img src="${escapeHtml(item.image)}" alt="" width="88" height="88" loading="lazy"></span><span>${escapeHtml(item.title)}</span><small>${item.count} dise&ntilde;os</small></button>`;
    }).join('');
  }

  function apply(updateUrl = false) {
    const term = normalize(search.value.trim());
    let list = ALL_PRODUCTS.filter((product) => {
      const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
      const selectedOccasion = OCCASIONS.find(item => item.query === urlOccasion);
      const matchesOccasion = !urlOccasion || selectedOccasion?.productIds.includes(product.id) || product.occasion === urlOccasion;
      const matchesPromo = !promoOnly || product.isAdminPromotion;
      const haystack = normalize(`${product.name} ${product.category} ${product.occasion} ${product.description}`);
      const matchesBudget = !budget.value || (budget.value === 'mas300' ? product.price > 300 : product.price <= Number(budget.value));
      return matchesCategory && matchesOccasion && matchesPromo && matchesBudget && (!available.checked || product.available !== false) && (!collectionId || collection?.productIds.includes(product.id)) && (!term || haystack.includes(term));
    });
    if (!sort || sort.value === "featured") {
      list = [...list].sort((a, b) => (featuredRank.get(a.id) ?? 999) - (featuredRank.get(b.id) ?? 999));
    }
    if (sort?.value === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort?.value === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort?.value === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, list.length);
    const occasionTitle = OCCASIONS.find(item => item.query === urlOccasion)?.title || urlOccasion;
    result.textContent = `${list.length ? `${start + 1}–${end} de ` : ""}${list.length} arreglos disponibles${urlOccasion ? ` para ${occasionTitle}` : ""}${promoOnly ? " en promociones" : ""}`;
    const activeFilters = [activeCategory !== 'Todos' ? activeCategory : '', occasionTitle, promoOnly ? 'Promociones' : '', collectionId ? collection?.title || 'Colección' : '', term ? `Búsqueda: ${search.value.trim()}` : '', budget.value ? budget.selectedOptions[0].textContent : '', available.checked ? 'Solo disponibles' : ''].filter(Boolean);
    filterContext.hidden = !activeFilters.length;
    document.querySelector('#catalog-filter-summary').textContent = activeFilters.join(' · ');
    renderProductGrid(grid, list.slice(start, end));
    if (pagination) {
      pagination.hidden = totalPages <= 1;
      pageLabel.textContent = `Página ${currentPage} de ${totalPages}`;
      pagination.querySelector('[data-page-step="-1"]').disabled = currentPage === 1;
      pagination.querySelector('[data-page-step="1"]').disabled = currentPage === totalPages;
    }
    if (!list.length) grid.innerHTML = `<p class="catalog-empty">No encontramos productos para esta seleccion. <a href="catalogo.html">Ver todo el catalogo</a></p>`;
    if (updateUrl) syncUrl();
  }

  paintFilters();
  paintOccasionFilters();
  apply();
  filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    currentPage = 1;
    paintFilters();
    filterRow.querySelector(`[data-category="${CSS.escape(activeCategory)}"]`)?.focus({ preventScroll: true });
    apply(true);
  });
  const resetPage = () => { currentPage = 1; apply(true); };
  search?.addEventListener("input", resetPage);
  sort?.addEventListener("change", resetPage);
  occasion.addEventListener('change', () => { urlOccasion = occasion.value; paintOccasionFilters(); resetPage(); });
  if (occasionFilters && occasionCarousel) {
    const previous = occasionCarousel.querySelector('[data-occasion-scroll="-1"]');
    const next = occasionCarousel.querySelector('[data-occasion-scroll="1"]');
    const updateArrows = () => {
      const remaining = occasionFilters.scrollWidth - occasionFilters.clientWidth;
      occasionCarousel.dataset.scrollable = String(remaining > 2);
      previous.disabled = occasionFilters.scrollLeft <= 2;
      next.disabled = occasionFilters.scrollLeft >= remaining - 2;
    };
    occasionCarousel.querySelectorAll('[data-occasion-scroll]').forEach((arrow) => arrow.addEventListener('click', () => {
      const distance = Math.max(occasionFilters.clientWidth * .75, 240);
      occasionFilters.scrollBy({ left: Number(arrow.dataset.occasionScroll) * distance, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    occasionFilters.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    occasionFilters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-occasion-filter]');
      if (!button) return;
      urlOccasion = button.dataset.occasionFilter;
      occasion.value = urlOccasion;
      currentPage = 1;
      paintOccasionFilters();
      apply(true);
      occasionFilters.querySelector(`[data-occasion-filter="${CSS.escape(urlOccasion)}"]`)?.focus({ preventScroll: true });
      requestAnimationFrame(updateArrows);
    });
    requestAnimationFrame(updateArrows);
  }
  budget.addEventListener('change', resetPage);
  available.addEventListener('change', resetPage);
  document.querySelector('#catalog-clear').addEventListener('click', () => {
    activeCategory = 'Todos'; urlOccasion = ''; promoOnly = false; collectionId = null;
    search.value = ''; occasion.value = ''; budget.value = ''; available.checked = false; sort.value = 'featured';
    paintFilters(); paintOccasionFilters(); resetPage(); search.focus();
  });
  pagination?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page-step]");
    if (!button || button.disabled) return;
    currentPage = Math.max(1, Math.min(totalPages, currentPage + Number(button.dataset.pageStep)));
    apply(true);
    const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
    window.scrollTo({ top: Math.max(0, grid.getBoundingClientRect().top + window.scrollY - headerHeight - 16), behavior: "instant" });
  });
}

export { renderCatalog };
