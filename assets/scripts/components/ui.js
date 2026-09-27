// Explicit module dependencies; no shared browser globals.
import { salesOpen, quoteUrl } from "../core/store.js";

function quoteButton(product, classes = "btn small") {
  return `<a class="${classes}" href="${quoteUrl(product)}" target="_blank" rel="noopener noreferrer">${icon("message-circle")}Cotizar</a>`;
}

function toast(message) {
  let node = document.querySelector(".toast");
  if (!node) {
    node = document.createElement("div");
    node.className = "toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-atomic", "true");
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add("is-visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("is-visible"), 2200);
}

function icon(name, className = "icon") {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({
      attrs: { "stroke-width": 1.8 },
    });
  }
}

function sanitizePublicInterface() {
  document.querySelectorAll('[data-quote-copy]').forEach((node) => {
    if (!node.dataset.saleCopy) node.dataset.saleCopy = node.textContent;
    node.textContent = salesOpen() ? node.dataset.saleCopy : node.dataset.quoteCopy;
  });
}

function enhanceStaticIcons() {
  const iconByText = [
    ["Catálogo", "grid-3x3"],
    ["Ocasiones", "gift"],
    ["Flores", "flower-2"],
    ["Colecciones", "layers-3"],
    ["Contacto", "message-circle"],
  ];
  document.querySelectorAll(".nav-link:not(.cart-link), .menu-button").forEach((item) => {
    if (item.querySelector("[data-lucide]")) return;
    const text = item.textContent.trim();
    const match = iconByText.find(([label]) => text.includes(label));
    if (match) item.insertAdjacentHTML("afterbegin", icon(match[1]));
  });
  document.querySelectorAll(".cart-link").forEach((link) => {
    if (!link.querySelector("[data-lucide='shopping-bag']")) {
      link.insertAdjacentHTML("afterbegin", icon("shopping-bag"));
    }
  });
  document.querySelectorAll(".topbar-inner > span").forEach((item, index) => {
    if (item.querySelector("[data-lucide]")) return;
    const names = ["truck", "camera", "gift"];
    item.insertAdjacentHTML("afterbegin", icon(names[index] || "sparkles", "topbar-icon"));
  });
  document.querySelectorAll(".btn[href='catalogo.html']").forEach((button) => {
    if (!button.querySelector("[data-lucide]")) {
      button.insertAdjacentHTML("afterbegin", icon("shopping-bag"));
    }
  });
  document.querySelectorAll(".btn.secondary[href*='producto.html']").forEach((button) => {
    if (!button.querySelector("[data-lucide]")) {
      button.insertAdjacentHTML("afterbegin", icon("sparkles"));
    }
  });
}

function initSliders() {
  document.querySelectorAll("[data-slider]").forEach((slider) => {
    const track = slider.querySelector(".product-slider");
    const prev = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");
    const dots = slider.querySelector("[data-slider-dots]");
    if (!track || !prev || !next || !dots) return;

    function metrics() {
      const card = track.querySelector(".product-card");
      if (!card) return { step: 0, pages: 1, current: 0 };
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0");
      const step = card.getBoundingClientRect().width + gap;
      const visible = Math.max(1, Math.floor((track.clientWidth + gap) / step));
      const pages = Math.max(1, track.children.length - visible + 1);
      const current = Math.min(pages - 1, Math.round(track.scrollLeft / step));
      return { step, pages, current };
    }

    function paintDots() {
      const { pages, current } = metrics();
      dots.innerHTML = Array.from({ length: pages }, (_, index) => `
        <button type="button" class="${index === current ? "is-active" : ""}" data-slider-dot="${index}" aria-label="Ver grupo ${index + 1}"></button>
      `).join("");
      prev.disabled = current === 0;
      next.disabled = current >= pages - 1;
      refreshIcons();
    }

    prev.addEventListener("click", () => {
      const { step } = metrics();
      track.scrollBy({ left: -step, behavior: "smooth" });
    });

    next.addEventListener("click", () => {
      const { step } = metrics();
      track.scrollBy({ left: step, behavior: "smooth" });
    });

    dots.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-slider-dot]");
      if (!dot) return;
      const { step } = metrics();
      track.scrollTo({ left: Number(dot.dataset.sliderDot) * step, behavior: "smooth" });
    });

    track.addEventListener("scroll", () => requestAnimationFrame(paintDots), { passive: true });
    window.addEventListener("resize", paintDots);
    requestAnimationFrame(paintDots);
  });
}

let revealObserver;

function playAddFeedback(button) {
  if (!button) return;
  button.classList.add("is-added");
  window.clearTimeout(button.addFeedbackTimer);
  button.addFeedbackTimer = window.setTimeout(() => button.classList.remove("is-added"), 900);
}

function initHeaderEffects() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initHeroSpotlight() {
  const hero = document.querySelector(".hero");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!hero || reduceMotion) return;

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty("--spot-x", `${Math.max(0, Math.min(100, x)).toFixed(1)}%`);
    hero.style.setProperty("--spot-y", `${Math.max(0, Math.min(100, y)).toFixed(1)}%`);
  }, { passive: true });
}

function initRevealEffects(scope = document) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const selector = [
    ".hero-copy",
    ".hero-showcase",
    ".section-title",
    ".service-item",
    ".occasion-card",
    ".flower-card",
    ".product-card",
    ".delivery-card",
    ".review-card",
    ".panel",
    ".collection-block",
    ".catalog-page",
    ".cart-item",
    ".checkout-card",
    ".confirmation-card",
  ].join(", ");
  const nodes = [...scope.querySelectorAll(selector)]
    .filter((node) => !node.classList.contains("reveal-ready") && !node.closest(".cart-drawer, .checkout-layout"));

  if (!nodes.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("reveal", "reveal-ready", "is-visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.12,
    });
  }

  nodes.forEach((node) => {
    node.classList.add("reveal", "reveal-ready");
    revealObserver.observe(node);
  });
}

export { quoteButton, toast, icon, refreshIcons, sanitizePublicInterface, enhanceStaticIcons, initSliders, revealObserver, playAddFeedback, initHeaderEffects, initHeroSpotlight, initRevealEffects };
