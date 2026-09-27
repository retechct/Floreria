// Explicit module dependencies; no shared browser globals.
import { profileMarkup } from "./customer-access.js";
import { icon } from "./ui.js";
import { escapeHtml } from "../core/format.js";
import { CATEGORIES, OCCASIONS, salesOpen, quoteUrl } from "../core/store.js";
import { openCartDrawer } from "../features/cart.js";

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
  const existingProfile = navRight.querySelector(".profile-menu");

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
      <button class="menu-button" type="button">Explorar <i data-lucide="chevron-down"></i></button>
      <div class="mega">${menuLinks(arrangementCategories, "category")}${menuLinks(flowerCategories, "category")}${menuLinks(OCCASIONS, "occasion")}</div>
    </div>
  `;

  navRight.innerHTML = `
    <a class="nav-link" data-nav href="colecciones.html">Colecciones</a>
    <a class="nav-link" data-nav href="contacto.html">Contacto</a>
    ${profileMarkup()}
    ${salesOpen() ? `<a class="nav-link cart-link" data-nav href="carrito.html" aria-label="Abrir cesta">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></a>` : `<a class="nav-link" href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}Cotizar</a>`}
  `;
  if (existingProfile) navRight.querySelector(".profile-menu").replaceWith(existingProfile);
}

function setActiveNav() {
  const file = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", href === `${file}${window.location.search}`);
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
          <a href="index.html">Inicio</a><a href="catalogo.html">Catálogo de flores</a>
          <a href="catalogo.html?promociones=1">Promociones</a><a href="colecciones.html">Colecciones</a>
          <a href="contacto.html">Arreglos a medida y contacto</a>
          <a href="cuenta.html">Mi cuenta</a>
        </nav>
        <details><summary>Flores y arreglos</summary><div class="mobile-menu-links">${menuLinks(CATEGORIES.filter(category => category !== 'Todos'), 'category')}</div></details>
        <details><summary>Por ocasión</summary><div class="mobile-menu-links">${menuLinks(OCCASIONS, 'occasion')}</div></details>
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

export { menuLinks, renderPublicNavigation, setActiveNav, bindCartTriggers, ensureMobileTabbar };
