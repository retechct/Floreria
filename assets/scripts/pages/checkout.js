import { icon, refreshIcons } from "../components/ui.js";
import { salesOpen, quoteUrl } from "../core/store.js";
import { setCheckoutStatus } from "../features/checkout.js";

async function renderCheckoutPage() {
  if (!salesOpen()) {
    const form = document.querySelector("#culqi-checkout-form");
    const summary = document.querySelector("#checkout-summary");
    form?.setAttribute("hidden", "");
    if (summary) {
      summary.innerHTML = `
        <div class="empty-state compact">
          <h2>Ventas en pausa</h2>
          <p>Por ahora estamos recibiendo cotizaciones por WhatsApp mientras dejamos Culqi listo.</p>
          <a class="btn" href="${quoteUrl()}">${icon("message-circle")}Cotizar por WhatsApp</a>
        </div>
      `;
    }
    setCheckoutStatus("La tienda esta en modo cotizacion. El pago online esta desactivado.", "error");
    refreshIcons();
    return;
  }
  const { initializeCulqiCheckout } = await import("../integrations/culqi.js");
  await initializeCulqiCheckout();
}

export { renderCheckoutPage };
