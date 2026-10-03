// Explicit module dependencies; no shared browser globals.
import { icon, refreshIcons } from "../components/ui.js";
import { money, escapeHtml } from "../core/format.js";

async function renderConfirmationPage() {
  const panel = document.querySelector("#confirmation-panel");
  if (!panel) return;
  let order = null;
  let lookupFailed = false;
  let hasReference = false;
  try {
    const privateLink = new URLSearchParams(location.hash.slice(1));
    const orderId = privateLink.get('pedido');
    const accessToken = privateLink.get('token');
    const requestId = localStorage.getItem("la-casa-last-payment");
    hasReference = Boolean((orderId && accessToken) || requestId);
    if (orderId && accessToken) {
      const response = await fetch('/api/checkout/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, access_token: accessToken }) });
      const result = await response.json();
      if (response.ok && result.ok) order = result.order || null;
    } else if (requestId) {
      const response = await fetch("/api/checkout/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request_id: requestId }) });
      const result = await response.json();
      if (response.ok && result.ok) order = result.order || null;
    }
  } catch {
    lookupFailed = true;
  }

  if (!order) {
    const uncertain = hasReference && lookupFailed;
    panel.innerHTML = `
      <div class="confirmation-card">
        ${icon(uncertain ? "refresh-cw" : "flower-2", "confirmation-icon")}
        <p class="eyebrow">La Casa de las Flores Atelier</p>
        <h1>${uncertain ? 'No pudimos consultar tu pedido' : 'No encontramos un pedido reciente'}</h1>
        <p class="lead">${uncertain ? 'Tu pago podría seguir en verificación. Reintenta la consulta y no vuelvas a pagar hasta confirmar el resultado.' : 'Puedes volver al catálogo para elegir un arreglo.'}</p>
        ${uncertain ? '<button class="btn" type="button" data-retry-order>Reintentar consulta</button><a class="btn secondary" href="contacto.html">Contactar a la tienda</a>' : '<a class="btn" href="catalogo.html">Ir al catálogo</a>'}
      </div>
    `;
    panel.querySelector('[data-retry-order]')?.addEventListener('click', () => renderConfirmationPage());
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
        <div><span>Preparación</span><strong>${escapeHtml(order.fulfillment_status || 'received')}</strong></div>
        <div><span>Comprobante</span><strong>${escapeHtml(order.receipt?.status === 'issued' ? `${order.receipt.series}-${order.receipt.number}` : 'Pendiente de emisión')}</strong></div>
      </div>
      ${order.receipt?.downloadUrl ? `<a class="btn secondary" href="${escapeHtml(order.receipt.downloadUrl)}" target="_blank" rel="noopener noreferrer">Abrir comprobante</a>` : ''}
      <a class="btn" href="catalogo.html">Seguir comprando</a>
    </div>
  `;
  refreshIcons();
}

export { renderConfirmationPage };
