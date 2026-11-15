import { icon, refreshIcons } from "../components/ui.js";
import { salesOpen, quoteUrl } from "../core/store.js";
import { setCheckoutStatus } from "../features/checkout.js";

async function renderCheckoutPage() {
  if (!salesOpen()) {
    document.querySelector('.page-head h1').textContent = 'Coordinemos tu pedido';
    document.querySelector('.page-head .eyebrow').textContent = 'Atención personalizada';
    document.querySelector('.page-head .lead').textContent = 'Confirmamos el arreglo, la entrega y el importe contigo por WhatsApp.';
    document.querySelector('.order-summary-panel h3').textContent = 'Consulta al atelier';
    const protection = document.querySelector('.order-summary-panel + .panel');
    if (protection) protection.innerHTML = '<h3>Antes de confirmar</h3><p>Te ayudamos a revisar disponibilidad, dedicatoria, distrito y fecha de entrega.</p><a href="politicas.html">Información sobre pedidos y entregas</a>';
    const form = document.querySelector("#culqi-checkout-form");
    const summary = document.querySelector("#checkout-summary");
    form?.setAttribute("hidden", "");
    if (summary) {
      summary.innerHTML = `
        <div class="empty-state compact">
          <h2>Tu regalo empieza con una conversación</h2>
          <p>Cuéntanos qué arreglo te gusta y para qué ocasión. Te ayudamos a coordinar los detalles.</p>
          <a class="btn" href="${quoteUrl()}">${icon("whatsapp")}Cotizar por WhatsApp</a>
        </div>
      `;
    }
    setCheckoutStatus("Coordinamos tu pedido por WhatsApp.", "info");
    refreshIcons();
    return;
  }
  const { initializeCulqiCheckout } = await import("../integrations/culqi.js");
  await initializeCulqiCheckout();
}

export { renderCheckoutPage };
