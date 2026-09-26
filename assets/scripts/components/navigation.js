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
        <a href="catalogo.html" aria-label="Abrir catálogo">${icon("grid-3x3")}</a>
        ${profileMarkup()}
        ${salesOpen() ? `<button class="cart-link" type="button" aria-label="Abrir bolsa">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer" aria-label="Cotizar por WhatsApp">${icon("message-circle")}</a>`}
      </div>
    `);
  }

  if (document.querySelector(".mobile-tabbar")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <nav class="mobile-tabbar" aria-label="Navegacion movil">
      <a href="index.html" data-mobile-tab="index.html">${icon("home")}Inicio</a>
      <a href="catalogo.html" data-mobile-tab="catalogo.html">${icon("flower-2")}Catalogo</a>
      <a href="catalogo.html?promociones=1" data-mobile-tab="promociones">${icon("badge-percent")}Promos</a>
      <a href="colecciones.html" data-mobile-tab="colecciones.html">${icon("layers-3")}Colecciones</a>
    </nav>
    ${salesOpen() ? `<button class="mobile-cart-fab cart-link" type="button" aria-label="Abrir cesta">${icon("shopping-bag")}<span class="cart-count" data-cart-count>0</span></button>` : ""}
  `);

  const file = window.location.pathname.split("/").pop() || "index.html";
  const catalogFiles = new Set(["catalogo.html", "producto.html", "catalogo-original.html"]);
  document.querySelectorAll("[data-mobile-tab]").forEach((link) => {
    const tab = link.dataset.mobileTab;
    const active = tab === file || (tab === "catalogo.html" && catalogFiles.has(file));
    link.classList.toggle("is-active", active);
  });
}

