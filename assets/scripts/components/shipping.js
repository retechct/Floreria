// Explicit module dependencies; no shared browser globals.
import { money, escapeHtml } from "../core/format.js";
import { DISTRICTS, shippingLoaded, salesOpen } from "../core/store.js";

function bindShippingEstimator(scope = document) {
  const input = scope.querySelector("#home-district, #product-district");
  const result = scope.querySelector("[data-shipping-result]");
  const pills = scope.querySelector("[data-district-pills]");
  if (!result && !pills) return;
  result?.setAttribute("role", "status");

  function show(value) {
    if (!result) return;
    if (!shippingLoaded) {
      result.textContent = "No pudimos consultar las tarifas. Reintenta la carga para comprobar la cobertura.";
      return;
    }
    const term = String(value || "").trim().toLowerCase();
    const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const found = DISTRICTS.find((district) => normalize(district.name) === normalize(term));
    const confirmation = salesOpen() ? "Confirma dirección y horario al finalizar la compra." : "Confirmamos disponibilidad y horario por WhatsApp.";
    if (!term) {
      result.textContent = `Escribe el distrito completo para consultar la tarifa referencial. ${confirmation}`;
    } else if (found?.enabled && found.fee !== null) {
      result.textContent = `${found.name}: tarifa referencial ${money(found.fee)}. ${confirmation}`;
    } else if (!found) {
      result.textContent = "Escribe el nombre completo del distrito. Si no encuentras tu zona, consulta la cobertura por WhatsApp.";
    } else {
      result.textContent = "Por el momento no realizamos entregas en este distrito.";
    }
  }

  if (pills) {
    pills.innerHTML = DISTRICTS.filter((d) => d.enabled && d.fee !== null).slice(0, 4).map((district) => `
      <button type="button" data-district="${escapeHtml(district.name)}">${escapeHtml(district.name)}<br>${money(district.fee)}</button>
    `).join("");
    pills.onclick = (event) => {
      const button = event.target.closest("[data-district]");
      if (!button) return;
      if (input) {
        input.value = button.dataset.district;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      show(button.dataset.district);
    };
  }
  if (input) input.oninput = () => show(input.value);
  show(input?.value || "");
}

export { bindShippingEstimator };
