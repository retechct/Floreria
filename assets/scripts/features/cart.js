// Explicit module dependencies; no shared browser globals.
import { toast, icon, refreshIcons } from "../components/ui.js";
import { money, escapeHtml } from "../core/format.js";
import { productMap, cartKey, salesOpen, showPrices, quoteUrl } from "../core/store.js";

let cartReturnFocus = null;
const cartInertBackground = new Map();

function drawerControls(shell) {
  return [...shell.querySelectorAll('.cart-drawer a[href], .cart-drawer button:not([disabled]), .cart-drawer [tabindex="0"]')]
    .filter(node => !node.closest('[hidden]') && node.getClientRects().length);
}

function reconcileCart() {
  const saved = getCart();
  const remaining = saved.filter((item) => item && Number.isInteger(item.qty) && item.qty > 0 && itemProduct(item));
  if (remaining.length !== saved.length) {
    try { localStorage.setItem(cartKey, JSON.stringify(remaining)); } catch {}
    toast("Se retiraron de tu cesta los productos que ya no estan publicados.");
  }
}

function getCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey));
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.id === "string" && Number.isInteger(item.qty) && item.qty > 0) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  try { localStorage.setItem(cartKey, JSON.stringify(cart)); }
  catch { toast("No se pudo guardar la cesta. Permite el almacenamiento del navegador e inténtalo de nuevo."); return false; }
  renderCartCount();
  renderCartDrawer();
  return true;
}

function addToCart(id, qty = 1, note = "", custom = null) {
  if (!salesOpen()) {
    const product = custom || productMap.get(id);
    window.open(quoteUrl(product), "_blank", "noopener,noreferrer");
    return;
  }
  const cart = getCart();
  const addedProduct = custom || productMap.get(id);
  if (!addedProduct || addedProduct.available === false) return toast("Este producto no esta disponible.");
  if (custom) {
    cart.push({ id: custom.id, qty, note, custom });
  } else {
    const found = cart.find((item) => item.id === id && !item.custom && item.note === note);
    if (found) {
      found.qty = Math.min(20, found.qty + qty);
    } else {
      cart.push({ id, qty, note });
    }
  }
  if (!saveCart(cart)) return;
  toast(`${addedProduct?.name || "Arreglo"} agregado a tu seleccion`);
  openCartDrawer();
}

function itemProduct(item) {
  return item.custom?.admin_promotion ? productMap.get(item.id) : item.custom || productMap.get(item.id);
}

function cartTotals(cart = getCart()) {
  return cart.reduce((sum, item) => {
    const product = itemProduct(item);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function renderCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = count;
    node.setAttribute("aria-label", `${count} productos en el carrito`);
  });
}

function cartEntries(cart = getCart()) {
  return cart
    .map((item, index) => ({ item, index, product: itemProduct(item) }))
    .filter((entry) => entry.product);
}

function changeCartItem(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty = Math.min(20, cart[index].qty + delta);
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart(cart);
}

function removeCartItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function cartItemMarkup(entry, variant = "drawer") {
  const { item, index, product } = entry;
  const isDrawer = variant === "drawer";
  const linePrice = showPrices() ? `<strong class="price">${money(product.price * item.qty)}</strong>` : "";
  return `
    <article class="${isDrawer ? "drawer-cart-item" : "cart-item"}">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      <div class="${isDrawer ? "drawer-cart-copy" : ""}">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.category)} · ${escapeHtml(product.badge)}</p>
        ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        ${isDrawer ? `
          <div class="drawer-cart-meta">
            ${linePrice}
            <div class="qty-controls" role="group" aria-label="Cantidad de ${escapeHtml(product.name)}">
              <button type="button" data-cart-qty="${index}" data-delta="-1" aria-label="Reducir cantidad de ${escapeHtml(product.name)}">−</button>
              <span aria-label="${item.qty} unidades">${item.qty}</span>
              <button type="button" data-cart-qty="${index}" data-delta="1" aria-label="Aumentar cantidad de ${escapeHtml(product.name)}" ${item.qty >= 20 ? 'disabled' : ''}>+</button>
            </div>
            <button class="icon-button remove-line" type="button" data-cart-remove="${index}" aria-label="Quitar ${escapeHtml(product.name)}">${icon("trash-2")}</button>
          </div>
        ` : ""}
      </div>
      ${!isDrawer ? `
        <div class="product-actions">
          ${linePrice}
          <div class="qty-controls" role="group" aria-label="Cantidad de ${escapeHtml(product.name)}">
            <button type="button" data-qty="${index}" data-delta="-1" aria-label="Reducir cantidad de ${escapeHtml(product.name)}">−</button>
            <span aria-label="${item.qty} unidades">${item.qty}</span>
            <button type="button" data-qty="${index}" data-delta="1" aria-label="Aumentar cantidad de ${escapeHtml(product.name)}" ${item.qty >= 20 ? 'disabled' : ''}>+</button>
          </div>
          <button class="btn small secondary" type="button" data-remove="${index}">Quitar</button>
        </div>
      ` : ""}
    </article>
  `;
}

function ensureCartDrawer() {
  if (!salesOpen()) return null;
  let shell = document.querySelector("#cart-drawer-shell");
  if (shell) return shell;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="cart-drawer-shell" id="cart-drawer-shell" aria-hidden="true" inert>
      <button class="cart-drawer-backdrop" type="button" data-cart-close tabindex="-1" aria-hidden="true" aria-label="Cerrar cesta"></button>
      <aside class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header class="cart-drawer-head">
          <div>
            <p class="eyebrow">Cesta La Casa</p>
            <h2 id="cart-drawer-title">Tu selección</h2>
          </div>
          <button class="icon-button" type="button" data-cart-close aria-label="Cerrar cesta">${icon("x")}</button>
        </header>
        <div class="cart-drawer-scroll" data-cart-drawer-list></div>
        <footer class="cart-drawer-foot">
          <div data-cart-drawer-summary aria-live="polite" aria-atomic="true"></div>
          <a class="btn" href="checkout.html" data-drawer-checkout>${icon("credit-card")}Finalizar compra</a>
          <a class="btn secondary" href="carrito.html">${icon("shopping-bag")}Ver cesta</a>
          <p class="tiny-note">${icon("shield-check", "note-icon")}Pago seguro con Culqi.</p>
        </footer>
      </aside>
    </div>
  `);
  shell = document.querySelector("#cart-drawer-shell");
  shell.addEventListener("click", (event) => {
    const qty = event.target.closest("[data-cart-qty]");
    const remove = event.target.closest("[data-cart-remove]");
    if (event.target.closest("[data-cart-close]")) closeCartDrawer();
    if (qty || remove) {
      const index = Number(qty ? qty.dataset.cartQty : remove.dataset.cartRemove);
      if (qty) changeCartItem(index, Number(qty.dataset.delta));
      else removeCartItem(index);
      const replacement = qty && shell.querySelector(`[data-cart-qty="${index}"][data-delta="${qty.dataset.delta}"]:not([disabled])`);
      const nextLine = shell.querySelectorAll('[data-cart-remove]')[Math.min(index, cartEntries().length - 1)];
      (replacement || nextLine || shell.querySelector('.drawer-empty a') || drawerControls(shell)[0])?.focus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!shell.classList.contains("is-open")) return;
    if (event.key === "Escape") { event.preventDefault(); closeCartDrawer(); }
    if (event.key === "Tab") {
      const controls = drawerControls(shell);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  return shell;
}

function renderCartDrawer() {
  if (!salesOpen()) return;
  const shell = document.querySelector("#cart-drawer-shell");
  if (!shell) return;
  const list = shell.querySelector("[data-cart-drawer-list]");
  const summary = shell.querySelector("[data-cart-drawer-summary]");
  const entries = cartEntries();
  shell.querySelector('[data-drawer-checkout]').hidden = !entries.length;
  if (!entries.length) {
    list.innerHTML = `
      <div class="drawer-empty">
        ${icon("flower-2", "drawer-empty-icon")}
        <h3>Aún no hay flores en tu selección.</h3>
        <p>Elige un arreglo y lo verás aquí sin salir de la página.</p>
        <a class="btn" href="catalogo.html">Explorar arreglos</a>
      </div>
    `;
  } else {
    list.innerHTML = entries.map((entry) => cartItemMarkup(entry, "drawer")).join("");
  }
  const subtotal = cartTotals(entries.map(({ item }) => item));
  summary.innerHTML = `
    <div class="summary-line"><span>${entries.length} tipo${entries.length === 1 ? "" : "s"} de arreglo</span><strong>${money(subtotal)}</strong></div>
    <div class="summary-line"><span>Entrega</span><strong>Según distrito</strong></div>
  `;
  refreshIcons();
}

function openCartDrawer() {
  if (!salesOpen()) {
    window.location.href = "catalogo.html";
    return;
  }
  const shell = ensureCartDrawer();
  if (!shell) return;
  if (!shell.classList.contains("is-open")) cartReturnFocus = document.activeElement;
  renderCartDrawer();
  shell.classList.add("is-open");
  shell.inert = false;
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-drawer-open");
  drawerControls(shell)[0]?.focus();
  for (const sibling of document.body.children) {
    if (sibling === shell || !(sibling instanceof HTMLElement) || cartInertBackground.has(sibling)) continue;
    cartInertBackground.set(sibling, sibling.inert);
    sibling.inert = true;
  }
}

function closeCartDrawer() {
  const shell = document.querySelector("#cart-drawer-shell");
  if (!shell || !shell.classList.contains("is-open")) return;
  for (const [node, wasInert] of cartInertBackground) node.inert = wasInert;
  cartInertBackground.clear();
  if (cartReturnFocus?.isConnected) cartReturnFocus.focus({ preventScroll: true });
  cartReturnFocus = null;
  shell.classList.remove("is-open");
  shell.setAttribute("aria-hidden", "true");
  shell.inert = true;
  document.body.classList.remove("cart-drawer-open");
}

export { reconcileCart, getCart, saveCart, addToCart, itemProduct, cartTotals, renderCartCount, cartEntries, changeCartItem, removeCartItem, cartItemMarkup, ensureCartDrawer, renderCartDrawer, openCartDrawer, closeCartDrawer };
