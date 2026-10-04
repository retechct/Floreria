// Explicit module dependencies; no shared browser globals.
import { profileMarkup } from "./customer-access.js";
import { icon } from "./ui.js";
import { escapeHtml } from "../core/format.js";
import { ALL_PRODUCTS, CATEGORIES, FLOWER_GROUPS, OCCASIONS, salesOpen, showPrices, quoteUrl } from "../core/store.js";
import { openCartDrawer } from "../features/cart.js";

function menuLinks(items, type) {
  return items.map((item) => {
    const href = type === "occasion"
      ? item.href || `catalogo.html?ocasion=${encodeURIComponent(item.query)}`
      : type === "flower" ? item.href : `catalogo.html?categoria=${encodeURIComponent(item)}`;
    const title = type === "occasion" || type === "flower" ? item.title : item;
    const detail = type === "occasion" && item.query !== title ? `<small>${escapeHtml(item.query)}</small>` : "";
    return `<a href="${href}"><strong>${escapeHtml(title)}</strong>${detail}</a>`;
  }).join("");
}

function occasionMega() {
  const primary = OCCASIONS.slice(0, 6);
  const secondary = OCCASIONS.slice(6);
  return `
    <div class="mega mega-rich mega-occasions">
      <div class="mega-main">
        <div class="mega-section-heading"><p class="mega-kicker">Elige por intención</p><a href="ocasiones.html">Ver todas</a></div>
        <div class="mega-occasion-grid">
          ${primary.map((item) => `<a class="mega-occasion-card" href="${item.href || `catalogo.html?ocasion=${encodeURIComponent(item.query)}`}"><img src="${escapeHtml(item.image)}" alt="" width="132" height="148" loading="lazy"><span>${escapeHtml(item.title)}</span></a>`).join("")}
        </div>
      </div>
      <aside class="mega-aside">
        <p class="mega-kicker">Más momentos</p>
        <div class="mega-text-links">
          ${secondary.map((item) => `<a href="${item.href || `catalogo.html?ocasion=${encodeURIComponent(item.query)}`}"><span>${escapeHtml(item.title)}</span>${icon("arrow-right")}</a>`).join("")}
          <a href="ocasiones.html"><span>Todas las ocasiones</span>${icon("arrow-right")}</a>
          <a href="colecciones.html"><span>Colecciones de temporada</span>${icon("arrow-right")}</a>
          <a href="catalogo.html"><span>Ver todo el catálogo</span>${icon("arrow-right")}</a>
        </div>
      </aside>
      <a class="mega-help" href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}<span><strong>¿No sabes cuál elegir?</strong><small>Te ayudamos personalmente por WhatsApp.</small></span><b>Escríbenos</b>${icon("arrow-right")}</a>
    </div>`;
}

function flowersMega() {
  const flowerGroups = FLOWER_GROUPS;
  const feature = ALL_PRODUCTS.find((product) => product.featured && product.available !== false) || ALL_PRODUCTS.find((product) => product.available !== false);
  const formatNames = new Set(["Ramos", "Boxes", "Regalos", "De autor"]);
  const formats = CATEGORIES.filter((item) => formatNames.has(item)).map((title) => ({ title, href: `catalogo.html?categoria=${encodeURIComponent(title)}`, image: ALL_PRODUCTS.find((product) => product.category === title)?.image || "public/assets/premium/products/ramo-love.webp" }));
  const groupLink = (item, flower = false) => `<a href="${escapeHtml(item.href)}"><img${flower ? ' class="mega-flower-thumb"' : ''} src="${escapeHtml(flower ? item.filterImage || item.image : item.image)}" alt="${flower ? `Una ${escapeHtml(item.title.toLowerCase())}` : ''}" width="52" height="52" loading="lazy"><span>${escapeHtml(item.title)}</span>${icon("arrow-right")}</a>`;
  return `
    <div class="mega mega-rich mega-flowers">
      <section class="mega-list-section">
        <div class="mega-section-heading"><p class="mega-kicker">Por flor</p><a href="flores.html">Ver todas</a></div>
        <div class="mega-image-links">${flowerGroups.map((item) => groupLink(item, true)).join("")}</div>
      </section>
      <section class="mega-list-section">
        <p class="mega-kicker">Por formato</p>
        <div class="mega-image-links">${formats.map(groupLink).join("")}</div>
      </section>
      ${feature ? `<a class="mega-feature" href="producto.html?id=${encodeURIComponent(feature.id)}"><img src="${escapeHtml(feature.image)}" alt="${escapeHtml(feature.name)}" width="260" height="300" loading="lazy"><span>Selección del atelier</span><strong>${escapeHtml(feature.name)}</strong>${showPrices() ? `<small>S/ ${Number(feature.price).toFixed(2)}</small>` : `<small>Consultar disponibilidad</small>`}</a>` : ""}
    </div>`;
}

function renderPublicNavigation({ refreshLeft = true } = {}) {
  if (document.body.dataset.page === "admin") return;
  const navLeft = document.querySelector(".nav-left");
  const navRight = document.querySelector(".nav-right");
  if (!navLeft || !navRight) return;
  const existingProfile = navRight.querySelector(".profile-menu");

  if (refreshLeft) {
    navLeft.innerHTML = `
      <a class="nav-link" data-nav href="catalogo.html">Catálogo</a>
      <details class="menu">
        <summary class="menu-button">Ocasiones <i data-lucide="chevron-down"></i></summary>
        ${occasionMega()}
      </details>
      <details class="menu">
        <summary class="menu-button">Flores <i data-lucide="chevron-down"></i></summary>
        ${flowersMega()}
      </details>
    `;
  }

  navRight.innerHTML = `
    <a class="nav-link" data-nav href="colecciones.html">Colecciones</a>
    <a class="nav-link" data-nav href="contacto.html">Contacto</a>
    ${profileMarkup()}
    ${salesOpen() ? `<a class="nav-link cart-link" data-nav href="carrito.html" aria-label="Abrir cesta">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></a>` : `<a class="nav-link" href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}Cotizar</a>`}
  `;
  if (existingProfile) navRight.querySelector(".profile-menu").replaceWith(existingProfile);
  navLeft.querySelectorAll('details.menu').forEach(menu => {
    let closeTimer;
    menu.addEventListener('pointerenter', () => {
      if (!matchMedia('(min-width:761px)').matches) return;
      clearTimeout(closeTimer);
      navLeft.querySelectorAll('details.menu[open]').forEach(item => { if (item !== menu) item.open = false; });
      menu.open = true;
    });
    menu.addEventListener('pointerleave', () => {
      if (!matchMedia('(min-width:761px)').matches) return;
      closeTimer = setTimeout(() => { if (!menu.matches(':focus-within')) menu.open = false; }, 140);
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') { menu.open = false; menu.querySelector('summary').focus(); }
    });
    menu.addEventListener('focusout', event => { if (!menu.contains(event.relatedTarget)) menu.open = false; });
  });
  if (!document.documentElement.dataset.menuDismissBound) {
    document.documentElement.dataset.menuDismissBound = 'true';
    document.addEventListener('click', event => document.querySelectorAll('.nav-left .menu[open]').forEach(item => {
      if (!item.contains(event.target)) item.open = false;
    }));
  }
}

function ensureProfileAccess() {
  if (document.body.dataset.page === "admin") return;
  const navRight = document.querySelector(".nav-right");
  if (!navRight || navRight.querySelector(".profile-menu")) return;
  const finalAction = navRight.lastElementChild;
  if (finalAction) finalAction.insertAdjacentHTML("beforebegin", profileMarkup());
  else navRight.insertAdjacentHTML("beforeend", profileMarkup());
}

function setActiveNav() {
  const file = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === `${file}${window.location.search}`);
    if (href === `${file}${window.location.search}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function bindCartTriggers() {
  if (!salesOpen()) return;
  document.querySelectorAll(".cart-link, [data-cart-open]").forEach((trigger) => {
    if (trigger.dataset.cartBound) return;
    trigger.dataset.cartBound = "true";
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
        <button class="mobile-menu-toggle" type="button" aria-label="Abrir menú" aria-controls="mobile-menu" aria-expanded="false">${icon("menu")}</button>
        ${profileMarkup()}
        ${salesOpen() ? `<button class="cart-link" type="button" aria-label="Abrir bolsa">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer" aria-label="Cotizar por WhatsApp">${icon("message-circle")}</a>`}
      </div>
    `);
  }

  ensureMobileMenu();
  document.querySelector('.mobile-tabbar')?.remove();
  document.querySelector('.mobile-cart-fab')?.remove();
  document.body.insertAdjacentHTML("beforeend", `
    <nav class="mobile-tabbar" aria-label="Navegacion movil">
      <a href="index.html" data-mobile-tab="index.html">${icon("home")}Inicio</a>
      <a href="catalogo.html" data-mobile-tab="catalogo.html">${icon("flower-2")}Catálogo</a>
      <a href="colecciones.html" data-mobile-tab="colecciones.html">${icon("layers-3")}Colecciones</a>
      ${salesOpen() ? `<a class="cart-link" href="carrito.html" data-mobile-tab="carrito.html">${icon("shopping-bag")}Carrito<span class="cart-count" data-cart-count>0</span></a>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}Cotizar</a>`}
    </nav>
  `);

  const file = window.location.pathname.split("/").pop() || "index.html";
  const catalogFiles = new Set(["catalogo.html", "producto.html", "catalogo-original.html"]);
  document.querySelectorAll("[data-mobile-tab]").forEach((link) => {
    const tab = link.dataset.mobileTab;
    const active = tab === file || (tab === "catalogo.html" && catalogFiles.has(file));
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute('aria-current', 'page');
  });
}

function ensureMobileMenu() {
  let dialog = document.querySelector('#mobile-menu');
  if (!dialog) {
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="mobile-menu" class="mobile-menu-dialog" aria-labelledby="mobile-menu-title">
        <div class="mobile-menu-heading"><h2 id="mobile-menu-title">Explora la florería</h2><button type="button" data-menu-close aria-label="Cerrar menú" autofocus>${icon('x')}</button></div>
        <nav aria-label="Todos los apartados" class="mobile-menu-links">
          <a href="index.html">Inicio</a><a href="catalogo.html">Catálogo de flores</a><a href="ocasiones.html">Ocasiones</a>
          <a href="catalogo.html?promociones=1">Promociones</a><a href="colecciones.html">Colecciones</a><a href="flores.html">Flores por variedad</a>
          <a href="contacto.html">Arreglos a medida y contacto</a>
          <a href="cuenta.html">Mi cuenta</a>
        </nav>
        <details data-menu-category-section hidden><summary>Flores por variedad</summary><div class="mobile-menu-links" data-menu-categories></div></details>
        <details data-menu-occasion-section hidden><summary>Por ocasión</summary><div class="mobile-menu-links" data-menu-occasions></div></details>
        <nav aria-label="Información y ayuda" class="mobile-menu-help">
          <a href="politicas.html#envios">Envíos y cobertura</a><a href="politicas.html#preguntas">Preguntas frecuentes</a>
          <a href="politicas.html">Políticas de la tienda</a><a href="reclamaciones.html">Libro de reclamaciones</a>
        </nav>
      </dialog>`);
    dialog = document.querySelector('#mobile-menu');
    dialog.querySelector('[data-menu-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
    dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('a[href],button,summary')].filter(node => node.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('mobile-menu-open');
      const trigger = document.querySelector('.mobile-menu-toggle');
      trigger?.setAttribute('aria-expanded', 'false');
      if (matchMedia('(max-width:760px)').matches) trigger?.focus();
    });
    matchMedia('(min-width:761px)').addEventListener('change', event => { if (event.matches && dialog.open) dialog.close(); });
  }
  const categories = FLOWER_GROUPS;
  const categorySection = dialog.querySelector('[data-menu-category-section]');
  const occasionSection = dialog.querySelector('[data-menu-occasion-section]');
  dialog.querySelector('[data-menu-categories]').innerHTML = menuLinks(categories, 'flower');
  dialog.querySelector('[data-menu-occasions]').innerHTML = menuLinks(OCCASIONS, 'occasion');
  categorySection.hidden = categories.length === 0;
  occasionSection.hidden = OCCASIONS.length === 0;
  dialog.querySelectorAll('[data-menu-categories] a, [data-menu-occasions] a').forEach(link => link.addEventListener('click', () => dialog.close()));
  const toggle = document.querySelector('.mobile-menu-toggle');
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = 'true';
    toggle.setAttribute('aria-expanded', String(dialog.open));
    toggle.addEventListener('click', () => {
      document.querySelectorAll('.profile-menu[open]').forEach(profile => { profile.open = false; });
      dialog.showModal();
      document.body.classList.add('mobile-menu-open');
      toggle.setAttribute('aria-expanded', 'true');
    });
  }
}

export { menuLinks, renderPublicNavigation, setActiveNav, bindCartTriggers, ensureMobileTabbar, ensureProfileAccess };
