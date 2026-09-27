// Explicit module dependencies; no shared browser globals.
import { money, escapeHtml } from "../core/format.js";
import { salesOpen, showPrices, quoteUrl } from "../core/store.js";
import { addToCart } from "../features/cart.js";

function renderCustomBuilder() {
  const form = document.querySelector("#custom-form");
  const total = document.querySelector("#custom-total");
  const list = document.querySelector("#custom-summary");
  const previewImg = document.querySelector("#custom-preview-img");
  const previewTitle = document.querySelector("#custom-preview-title");
  const previewPalette = document.querySelector("#custom-preview-palette");
  if (!form || !total || !list) return;
  const submit = form.querySelector("button[type='submit']");
  const review = document.querySelector("[data-cart-open]");
  if (!salesOpen()) {
    submit.textContent = "Cotizar diseño por WhatsApp";
    review.textContent = "Ver catálogo";
    review.href = "catalogo.html";
    review.removeAttribute("data-cart-open");
  }

  const basePrices = {
    ramo: 45,
    box: 60,
    preservado: 55,
    premium: 95,
  };
  const additionPrices = {
    topper: 12,
    ferrero: 18,
    peluche: 25,
    globo: 20,
    vino: 35,
  };
  const baseLabels = {
    ramo: "Ramo coreano",
    box: "Box reutilizable",
    preservado: "Diseño preservado",
    premium: "De autor en loza",
  };
  const baseImages = {
    ramo: "public/assets/edited/products/ramo-love.jpg",
    box: "public/assets/edited/products/box-amber.jpg",
    preservado: "public/assets/edited/products/box-bella.jpg",
    premium: "public/assets/edited/products/orquidia-phalaenopsis.jpg",
  };

  function estimate() {
    const data = new FormData(form);
    const base = data.get("base");
    const stems = Math.max(1, Number(data.get("stems") || 1));
    const color = data.get("color");
    const message = data.get("message");
    const additions = data.getAll("addition");
    const price = (basePrices[base] || 45) + stems * 7 + additions.reduce((sum, item) => sum + additionPrices[item], 0);
    total.textContent = showPrices() ? money(price) : "Cotizacion personalizada";
    if (previewImg) previewImg.src = baseImages[base] || baseImages.ramo;
    if (previewTitle) previewTitle.textContent = baseLabels[base] || "Diseño personalizado";
    if (previewPalette) previewPalette.textContent = `Paleta ${color}`;
    list.innerHTML = [
      `${stems} flores principales`,
      `Base ${baseLabels[base] || base}`,
      `Paleta ${color}`,
      message ? `Tarjeta: "${escapeHtml(message)}"` : "Tarjeta personalizada",
      additions.length ? `Extras: ${additions.join(", ")}` : "Sin extras añadidos",
    ].map((item) => `<li>${item}</li>`).join("");
    return { base, stems, color, message, additions, price };
  }

  form.addEventListener("input", estimate);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = estimate();
    const custom = {
      id: `personalizado-${Date.now()}`,
      name: "Diseño personalizado",
      price: data.price,
      image: baseImages[data.base] || baseImages.ramo,
      category: "Personalizado",
      description: `${data.stems} flores principales, base ${baseLabels[data.base] || data.base}, paleta ${data.color}. ${data.message ? `Tarjeta: ${data.message}.` : "Tarjeta personalizada."}`,
      builder: {
        base: data.base,
        stems: data.stems,
        color: data.color,
        message: data.message,
        additions: data.additions,
      },
    };
    if (salesOpen()) addToCart(custom.id, 1, data.additions.join(", "), custom);
    else window.open(quoteUrl(custom), "_blank", "noopener,noreferrer");
  });
  estimate();
}

export { renderCustomBuilder };
