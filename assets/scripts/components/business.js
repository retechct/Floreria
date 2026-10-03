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
  const claim = result.claim || {};
  const consumer = claim.consumer || {};
  const detail = claim.claim || {};
  return `
    <div class="claim-result success" data-claim-receipt>
      ${icon("badge-check", "confirmation-icon")}
      <div>
        <p class="eyebrow">Hoja registrada</p>
        <h3>Codigo ${escapeHtml(result.code)}</h3>
        <p>Conserva este codigo para seguimiento. El plazo de respuesta es de ${escapeHtml(result.response_deadline || "15 dias habiles")}.</p>
        ${claim.code ? `<dl class="provider-list"><div><dt>Fecha</dt><dd>${escapeHtml(claim.created_at)}</dd></div><div><dt>Consumidor</dt><dd>${escapeHtml(consumer.name)}</dd></div><div><dt>Documento</dt><dd>${escapeHtml(`${consumer.document_type || ''} ${consumer.document_number || ''}`)}</dd></div>${consumer.representative ? `<div><dt>Representante</dt><dd>${escapeHtml(`${consumer.representative.name || ''} · ${consumer.representative.document_number || ''}`)}</dd></div>` : ''}<div><dt>Contacto</dt><dd>${escapeHtml(`${consumer.email || ''} · ${consumer.phone || ''}`)}</dd></div><div><dt>Producto o servicio</dt><dd>${escapeHtml(detail.product)}</dd></div><div><dt>Detalle</dt><dd>${escapeHtml(detail.detail)}</dd></div><div><dt>Pedido concreto</dt><dd>${escapeHtml(detail.request)}</dd></div></dl>` : ''}
        <p>${result.email_status === 'sent' ? 'Enviamos una copia al correo indicado.' : 'Guarda o imprime esta copia. Si el correo no llega, el registro permanece guardado.'}</p>
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
  const requestId = crypto.randomUUID();

  const limaToday = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  if (date && !date.value) date.value = limaToday();

  const minor = form.querySelector('#is-minor');
  const representativeFields = [...form.querySelectorAll('[data-representative-field]')];
  const toggleRepresentative = () => representativeFields.forEach((wrapper) => {
    wrapper.hidden = !minor.checked;
    wrapper.querySelector('input').required = minor.checked;
  });
  if (minor) {
    minor.addEventListener('change', toggleRepresentative);
    toggleRepresentative();
  }

  if (provider && !provider.children.length) loadBusinessInfo().then((info) => {
    provider.innerHTML = renderBusinessInfo(info);
    refreshIcons();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submit = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    payload.request_id = requestId;
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
      form.querySelectorAll('input, select, textarea').forEach(field => { field.disabled = true; });
      if (date) date.value = limaToday();
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
  const blocks = [...document.querySelectorAll("[data-business-info]:empty")];
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
      <details class="footer-column" open>
        <summary>Comprar</summary>
        <nav aria-label="Comprar">
        <a href="catalogo.html">Catálogo de flores</a>
        <a href="colecciones.html">Colecciones</a>
        <a href="catalogo.html?promociones=1">Promociones</a>
        ${salesOpen() ? `<a href="carrito.html">Mi carrito</a>` : `<a href="${quoteUrl()}" target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp</a>`}
        </nav>
      </details>
      <details class="footer-column" open>
        <summary>Te ayudamos</summary>
        <nav aria-label="Ayuda al cliente">
        <a href="contacto.html">Contacto y atención</a>
        <a href="politicas.html#envios">Envíos y cobertura</a>
        <a href="politicas.html#pagos">Medios de pago</a>
        <a href="politicas.html#cambios">Cambios y devoluciones</a>
        <a href="politicas.html#preguntas">Preguntas frecuentes</a>
        </nav>
      </details>
      <details class="footer-column" open>
        <summary>Información legal</summary>
        <nav aria-label="Información legal">
        <a href="politicas.html#terminos">Términos y condiciones</a>
        <a href="politicas.html#privacidad">Política de privacidad</a>
        <a href="politicas.html#cookies">Cookies y almacenamiento</a>
        <a href="politicas.html#proveedor">Datos del proveedor</a>
        <a class="footer-claims" href="reclamaciones.html">${icon("book-open-check")}<span>Libro de<br>Reclamaciones</span></a>
        </nav>
      </details>
    </div>
    <div class="footer-bottom">
      <small>&copy; ${new Date().getFullYear()} La Casa de las Flores Atelier. Todos los derechos reservados.</small>
      <span>${salesOpen() ? `${icon("credit-card")}Pagos con Culqi<span class="footer-currency">Precios en soles (PEN)</span>` : `${icon("message-circle")}Atencion por cotizacion`}</span>
    </div>
  `;
  const footerMedia = matchMedia('(max-width:600px)');
  const syncFooterColumns = () => footer.querySelectorAll('.footer-column').forEach(column => { column.open = !footerMedia.matches; });
  syncFooterColumns();
  footerMedia.addEventListener('change', syncFooterColumns);
  loadBusinessInfo().then((info) => {
    const provider = footer.querySelector(".footer-provider");
    if (provider && info.legalName && info.ruc) {
      provider.textContent = `${info.legalName} · RUC ${info.ruc}`;
      provider.hidden = false;
    }
  });
}

export { loadBusinessInfo, renderBusinessInfo, renderClaimResult, renderClaimsPage, renderBusinessBlocks, ensureLegalFooterLinks };
