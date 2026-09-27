// Explicit module dependencies; no shared browser globals.
import { toast, icon, refreshIcons } from "../components/ui.js";
import { money } from "../core/format.js";
import { salesOpen, quoteUrl } from "../core/store.js";
import { saveCart, cartTotals, renderCartCount, cartEntries, changeCartItem, removeCartItem, cartItemMarkup } from "../features/cart.js";

function renderCartPage() {
  const list = document.querySelector("#cart-items");
  const summary = document.querySelector("#cart-summary");
  const clear = document.querySelector("#clear-cart");
  const checkoutAction = document.querySelector("#checkout-action");
  if (!list || !summary) return;
  if (!salesOpen()) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Estamos atendiendo por cotizacion</h2>
        <p>Revisa los arreglos y consulta disponibilidad, entrega y precio por WhatsApp.</p>
        <a class="btn" href="${quoteUrl()}">${icon("message-circle")}Cotizar por WhatsApp</a>
      </div>
    `;
    summary.innerHTML = `
      <div class="summary-line"><span>Modo tienda</span><strong>Solo cotizacion</strong></div>
      <div class="summary-line"><span>Atención</span><strong>WhatsApp</strong></div>
    `;
    checkoutAction?.classList.add("is-disabled");
    checkoutAction?.setAttribute("aria-disabled", "true");
    checkoutAction?.removeAttribute("href");
    checkoutAction?.setAttribute("tabindex", "-1");
    clear?.setAttribute("hidden", "");
    refreshIcons();
    return;
  }

  function paint() {
    const entries = cartEntries();
    if (!entries.length) {
      list.innerHTML = `
        <div class="empty-state">
          <h2>Tu selección está lista para flores.</h2>
          <p>Explora el catálogo y guarda tus arreglos favoritos.</p>
          <a class="btn" href="catalogo.html">Ir al catálogo</a>
        </div>
      `;
    } else {
      list.innerHTML = entries.map((entry) => cartItemMarkup(entry, "page")).join("");
    }
    const subtotal = cartTotals(entries.map(({ item }) => item));
    summary.innerHTML = `
      <div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
      <div class="summary-line"><span>Entrega</span><strong>Se calcula en checkout</strong></div>
      <div class="summary-line"><span>Pago</span><strong>Culqi</strong></div>
      <div class="summary-line total"><span>Total parcial</span><strong>${money(subtotal)}</strong></div>
    `;
    if (checkoutAction) {
      checkoutAction.classList.toggle("is-disabled", !entries.length);
      checkoutAction.setAttribute("aria-disabled", String(!entries.length));
      if (entries.length) {
        checkoutAction.setAttribute("href", "checkout.html");
        checkoutAction.removeAttribute("tabindex");
      } else {
        checkoutAction.removeAttribute("href");
        checkoutAction.setAttribute("tabindex", "-1");
      }
    }
    renderCartCount();
  }

  list.addEventListener("click", (event) => {
    const qty = event.target.closest("[data-qty]");
    const remove = event.target.closest("[data-remove]");
    if (qty) {
      changeCartItem(Number(qty.dataset.qty), Number(qty.dataset.delta));
      paint();
    }
    if (remove) {
      removeCartItem(Number(remove.dataset.remove));
      paint();
    }
  });

  clear?.addEventListener("click", () => {
    saveCart([]);
    paint();
  });

  checkoutAction?.addEventListener("click", (event) => {
    if (!cartEntries().length) {
      event.preventDefault();
      toast("Agrega un arreglo antes de pagar");
    }
  });

  paint();
}

export { renderCartPage };
