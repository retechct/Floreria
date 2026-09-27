// Explicit module dependencies; no shared browser globals.
import { icon, refreshIcons } from "../components/ui.js";
import { money, escapeHtml } from "../core/format.js";

async function renderConfirmationPage() {
  const panel = document.querySelector("#confirmation-panel");
  if (!panel) return;
  let order = null;
  try {
    const requestId = localStorage.getItem("la-casa-last-payment");
    if (requestId) {
      const response = await fetch("/api/checkout/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: requestId }) });
      const result = await response.json();
      if (response.ok && result.ok) order = result.order || null;
    }
  } catch {
    order = null;
  }

  if (!order) {
    panel.innerHTML = `
      <div class="confirmation-card">
        ${icon("flower-2", "confirmation-icon")}
        <p class="eyebrow">La Casa de las Flores Atelier</p>
        <h1>No encontramos un pedido reciente</h1>
        <p class="lead">Puedes volver al catálogo y crear una nueva compra.</p>
        <a class="btn" href="catalogo.html">Ir al catálogo</a>
      </div>
    `;
    refreshIcons();
    return;
  }

  panel.innerHTML = `
    <div class="confirmation-card">
      ${icon("badge-check", "confirmation-icon")}
      <p class="eyebrow">${order.status === "completed" ? "Pago confirmado" : "Pedido registrado"}</p>
      <h1>${order.status === "completed" ? "Gracias por tu compra" : "Tu pago esta pendiente de confirmacion"}</h1>
      <p class="lead">Orden ${escapeHtml(order.id)} · Total ${money(order.total)}</p>
      <div class="confirmation-details">
        <div><span>Estado</span><strong>${escapeHtml(order.status || "Procesado")}</strong></div>
        <div><span>Culqi</span><strong>${escapeHtml(order.culqi_id || "En verificacion")}</strong></div>
        <div><span>Entrega</span><strong>${escapeHtml(order.delivery?.district || "")}</strong></div>
        <div><span>Fecha</span><strong>${escapeHtml(order.delivery?.date || "")}</strong></div>
      </div>
      <a class="btn" href="catalogo.html">Seguir comprando</a>
    </div>
  `;
  refreshIcons();
}

export { renderConfirmationPage };
