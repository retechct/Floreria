// Explicit module dependencies; no shared browser globals.
import { icon, refreshIcons } from "./ui.js";
import { escapeHtml } from "../core/format.js";
import { readPublicData } from "../core/http.js";
import { BRAND, salesOpen, quoteUrl } from "../core/store.js";

async function loadBusinessInfo() {
  try {
    const payload = await readPublicData("/api/business-info");
    return payload.business || {};
  } catch {
    return {
      commercialName: BRAND.name,
      legalName: "",
      ruc: "",
      fiscalAddress: "",
      phone: BRAND.phone,
      email: "",
      claimsEmail: "",
    };
  }
}

function renderBusinessInfo(info) {
  const missing = !info.legalName || !info.ruc || !info.fiscalAddress;
  return `
    <div class="provider-card">
      <div>
        <p class="eyebrow">Identificacion del proveedor</p>
        <h3>${escapeHtml(info.commercialName || BRAND.name)}</h3>
      </div>
      <dl class="provider-list">
        <div><dt>Titular / Razón social</dt><dd>${escapeHtml(info.legalName || "Por confirmar")}</dd></div>
        <div><dt>RUC</dt><dd>${escapeHtml(info.ruc || "Por confirmar")}</dd></div>
        <div><dt>Domicilio fiscal</dt><dd>${escapeHtml(info.fiscalAddress || "Por confirmar")}</dd></div>
        <div><dt>Atencion</dt><dd>${escapeHtml(info.claimsEmail || info.email || `WhatsApp ${info.phone || BRAND.phone}`)}</dd></div>
      </dl>
      ${missing ? `<p class="config-warning">Consulta los datos del proveedor a través de nuestros canales de atención.</p>` : ""}
    </div>
  `;
}

function renderClaimResult(result) {
  return `
    <div class="claim-result success">
      ${icon("badge-check", "confirmation-icon")}
      <div>
        <p class="eyebrow">Hoja registrada</p>
        <h3>Codigo ${escapeHtml(result.code)}</h3>
        <p>Conserva este codigo para seguimiento. El plazo de respuesta es de ${escapeHtml(result.response_deadline || "15 dias habiles")}.</p>
        <button class="btn secondary small" type="button" data-claim-print>Imprimir constancia</button>
      </div>
    </div>
  `;
}

function renderClaimsPage() {
  const provider = document.querySelector("#claims-provider");
  const form = document.querySelector("#claims-form");
  const status = document.querySelector("#claims-status");
  const date = document.querySelector("#claim-date");
  if (!form || !status) return;

  if (date && !date.value) {
    date.value = new Date().toISOString().slice(0, 10);
  }

  loadBusinessInfo().then((info) => {
    if (provider) {
      provider.innerHTML = renderBusinessInfo(info);
      refreshIcons();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.accepted_privacy = data.get("accepted_privacy") === "on";

    submit.disabled = true;
    status.className = "checkout-status";
    status.textContent = "Registrando hoja de reclamacion...";

    try {
      const response = await fetch("/api/reclamaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "No se pudo registrar la hoja de reclamacion.");
      }
      status.className = "checkout-status success";
      status.innerHTML = renderClaimResult(result);
      status.querySelector('[data-claim-print]').addEventListener('click', () => window.print());
      form.reset();
      if (date) date.value = new Date().toISOString().slice(0, 10);
      refreshIcons();
    } catch (error) {
      status.className = "checkout-status error";
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
}

function renderBusinessBlocks() {
  const blocks = [...document.querySelectorAll("[data-business-info]")];
  if (!blocks.length) return;
  loadBusinessInfo().then((info) => {
    blocks.forEach((block) => {
      block.innerHTML = renderBusinessInfo(info);
    });
    refreshIcons();
  });
}

function ensureLegalFooterLinks() {
  const footer = document.querySelector(".site-footer .section");
  if (!footer) return;
  footer.classList.add("footer-content");
  footer.innerHTML = `
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="footer-brand-link" href="index.html">
          <img src="assets/logo.svg" alt="" width="48" height="48">
          <strong>La Casa de las Flores Atelier</strong>
        </a>
        <p>Arreglos florales y regalos para cada ocasión.<br>Lima, Perú.</p>
        <p class="footer-provider" hidden></p>
        <a class="footer-contact" href="https://wa.me/${BRAND.phone}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}WhatsApp 947 370 668</a>
        <a class="footer-contact" href="tel:+${BRAND.phone}">${icon("phone")}Llámanos</a>
      </div>
      <nav class="footer-column" aria-label="Comprar">
        <h2>Comprar</h2>
        <a href="catalogo.html">Catálogo de flores</a>
        <a href="colecciones.html">Colecciones</a>
        <a href="catalogo.html?promociones=1">Promociones</a>
        ${salesOpen() ? `<a href="carrito.html">Mi carrito</a>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp</a>`}
      </nav>
      <nav class="footer-column" aria-label="Ayuda al cliente">
        <h2>Te ayudamos</h2>
        <a href="contacto.html">Contacto y atención</a>
        <a href="politicas.html#envios">Envíos y cobertura</a>
        <a href="politicas.html#pagos">Medios de pago</a>
        <a href="politicas.html#cambios">Cambios y devoluciones</a>
        <a href="politicas.html#preguntas">Preguntas frecuentes</a>
      </nav>
      <nav class="footer-column" aria-label="Información legal">
        <h2>Información legal</h2>
        <a href="politicas.html#terminos">Términos y condiciones</a>
        <a href="politicas.html#privacidad">Política de privacidad</a>
        <a href="politicas.html#cookies">Cookies y almacenamiento</a>
        <a href="politicas.html#proveedor">Datos del proveedor</a>
        <a class="footer-claims" href="reclamaciones.html">${icon("book-open-check")}<span>Libro de<br>Reclamaciones</span></a>
      </nav>
    </div>
    <div class="footer-bottom">
      <small>&copy; ${new Date().getFullYear()} La Casa de las Flores Atelier. Todos los derechos reservados.</small>
      <span>${salesOpen() ? `${icon("credit-card")}Pagos con Culqi<span class="footer-currency">Precios en soles (PEN)</span>` : `${icon("message-circle")}Atencion por cotizacion`}</span>
    </div>
  `;
  loadBusinessInfo().then((info) => {
    const provider = footer.querySelector(".footer-provider");
    if (provider && info.legalName && info.ruc) {
      provider.textContent = `${info.legalName} · RUC ${info.ruc}`;
      provider.hidden = false;
    }
  });
}

export { loadBusinessInfo, renderBusinessInfo, renderClaimResult, renderClaimsPage, renderBusinessBlocks, ensureLegalFooterLinks };
