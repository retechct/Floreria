import { renderProductGrid } from "../components/products.js";
import { icon, refreshIcons, initRevealEffects } from "../components/ui.js";
import { escapeHtml } from "../core/format.js";
import { ALL_PRODUCTS, FLOWER_GROUPS } from "../core/store.js";

function renderFlowersPage() {
  const filters = document.querySelector('#flower-filters');
  const carousel = document.querySelector('#flower-carousel');
  const grid = document.querySelector('#flower-product-grid');
  const result = document.querySelector('#flower-result');
  const pageHead = document.querySelector('body[data-page="flowers"] .page-head');
  const title = pageHead?.querySelector('h1');
  const lead = pageHead?.querySelector('.lead');
  const guideTitle = document.querySelector('#flower-guide-title');
  const guideText = document.querySelector('#flower-guide-text');
  if (!filters || !carousel || !grid) return;

  const requested = new URLSearchParams(location.search).get('flor') || '';
  let active = FLOWER_GROUPS.some((flower) => flower.id === requested) ? requested : '';
  const defaultTitle = 'Flores por variedad';
  const cssImage = image => /^(?:https?:)?\/\//.test(image) || image.startsWith('/') ? image : `/${image}`;
  const defaultLead = 'Descubre rosas, tulipanes, girasoles y otras flores presentes en nuestros arreglos. Elige una variedad para encontrar diseños que la incluyan.';

  function paintFilters() {
    filters.innerHTML = `<a class="collection-filter${active ? '' : ' is-active'}" href="flores.html" data-flower-filter=""${active ? '' : ' aria-current="page"'}><span class="collection-filter-image">${icon('flower-2')}</span><span>Todas</span></a>` + FLOWER_GROUPS.map((flower) => {
      const selected = flower.id === active;
      return `<a class="collection-filter flower-filter${selected ? ' is-active' : ''}" href="flores.html?flor=${encodeURIComponent(flower.id)}" data-flower-filter="${escapeHtml(flower.id)}"${selected ? ' aria-current="page"' : ''}><span class="collection-filter-image"><img src="${escapeHtml(flower.image)}" alt="${escapeHtml(flower.title)}" width="88" height="88" loading="lazy"></span><span>${escapeHtml(flower.title)}</span><small>${flower.count} arreglos</small></a>`;
    }).join('');
  }

  function paint() {
    const flower = FLOWER_GROUPS.find((item) => item.id === active);
    const products = flower ? flower.productIds.map((id) => ALL_PRODUCTS.find((product) => product.id === id)).filter(Boolean) : ALL_PRODUCTS;
    if (title) title.textContent = flower ? `Arreglos con ${flower.title.toLowerCase()}` : defaultTitle;
    if (lead) lead.textContent = flower?.description || defaultLead;
    if (guideTitle) guideTitle.textContent = flower ? `${flower.title}: significado y estilo` : 'Cada flor comunica algo distinto';
    if (guideText) guideText.textContent = flower?.description || 'Las rosas hablan de afecto, los girasoles transmiten energía y los tulipanes aportan una elegancia serena. Usa el filtro para descubrir arreglos por la flor que quieres regalar.';
    if (result) result.textContent = flower ? `${products.length} arreglos incluyen ${flower.title.toLowerCase()}` : `${FLOWER_GROUPS.length} variedades y ${products.length} arreglos para explorar`;
    if (pageHead) {
      if (flower) pageHead.style.setProperty('--page-head-image', `url(${JSON.stringify(cssImage(flower.image))})`);
      else pageHead.style.removeProperty('--page-head-image');
      pageHead.classList.toggle('has-selected-flower', Boolean(flower));
    }
    renderProductGrid(grid, products);
    refreshIcons();
    initRevealEffects(grid);
  }

  paintFilters();
  paint();

  const previous = carousel.querySelector('[data-flower-scroll="-1"]');
  const next = carousel.querySelector('[data-flower-scroll="1"]');
  const updateArrows = () => {
    const remaining = filters.scrollWidth - filters.clientWidth;
    carousel.dataset.scrollable = String(remaining > 2);
    previous.disabled = filters.scrollLeft <= 2;
    next.disabled = filters.scrollLeft >= remaining - 2;
  };
  carousel.querySelectorAll('[data-flower-scroll]').forEach((arrow) => arrow.addEventListener('click', () => {
    const distance = Math.max(filters.clientWidth * .75, 240);
    filters.scrollBy({ left: Number(arrow.dataset.flowerScroll) * distance, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  filters.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  filters.addEventListener('click', (event) => {
    const link = event.target.closest('[data-flower-filter]');
    if (!link) return;
    event.preventDefault();
    active = link.dataset.flowerFilter;
    const url = new URL(location.href);
    if (active) url.searchParams.set('flor', active);
    else url.searchParams.delete('flor');
    history.replaceState({}, '', `${url.pathname}${url.search}`);
    paintFilters();
    paint();
    filters.querySelector(`[data-flower-filter="${CSS.escape(active)}"]`)?.focus({ preventScroll: true });
    requestAnimationFrame(updateArrows);
  });
  requestAnimationFrame(updateArrows);
}

export { renderFlowersPage };
