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
    const track = slider.querySelector("[data-slider-track], .product-slider");
    const prev = slider.querySelector("[data-slider-prev]");
    const next = slider.querySelector("[data-slider-next]");
    const dots = slider.querySelector("[data-slider-dots]");
    if (!track || !prev || !next || !dots) return;

    const loop = slider.hasAttribute("data-slider-loop");
    const originals = [...track.querySelectorAll(":scope > [data-slider-item], :scope > .product-card")];
    const originalCount = originals.length;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let autoplayTimer;
    let scrollTimer;
    let loopReady = false;

    if (loop && originalCount > 1) {
      const before = document.createDocumentFragment();
      const after = document.createDocumentFragment();
      originals.forEach((item) => {
        const leadingClone = item.cloneNode(true);
        const trailingClone = item.cloneNode(true);
        [leadingClone, trailingClone].forEach((clone) => {
          clone.dataset.sliderClone = "";
          clone.setAttribute("aria-hidden", "true");
          clone.setAttribute("tabindex", "-1");
        });
        before.append(leadingClone);
        after.append(trailingClone);
      });
      track.prepend(before);
      track.append(after);
    }

    function metrics() {
      const card = track.querySelector("[data-slider-item], .product-card");
      if (!card) return { step: 0, pages: 1, current: 0 };
      const gap = Number.parseFloat(getComputedStyle(track).columnGap || "0");
      const step = card.getBoundingClientRect().width + gap;
      if (loop && originalCount) {
        const current = ((Math.round(track.scrollLeft / step) - originalCount) % originalCount + originalCount) % originalCount;
        return { step, pages: originalCount, current, cycle: step * originalCount };
      }
      const visible = Math.max(1, Math.floor((track.clientWidth + gap) / step));
      const pages = Math.max(1, track.children.length - visible + 1);
      const current = Math.min(pages - 1, Math.round(track.scrollLeft / step));
      return { step, pages, current };
    }

    function settleLoop() {
      if (!loopReady) return;
      const { cycle } = metrics();
      if (!cycle) return;
      if (track.scrollLeft < cycle * 0.5) track.scrollLeft += cycle;
      else if (track.scrollLeft >= cycle * 2.5) track.scrollLeft -= cycle;
    }

    function paintDots() {
      const { pages, current } = metrics();
      if (dots.children.length !== pages) dots.innerHTML = Array.from({ length: pages }, (_, index) => `
        <button type="button" data-slider-dot="${index}" aria-label="Ver grupo ${index + 1}"></button>
      `).join("");
      [...dots.children].forEach((dot, index) => {
        dot.classList.toggle('is-active', index === current);
        dot.setAttribute('aria-pressed', String(index === current));
      });
      prev.disabled = !loop && current === 0;
      next.disabled = !loop && current >= pages - 1;
      refreshIcons();
    }

    function move(direction) {
      const { step } = metrics();
      track.scrollBy({ left: direction * step, behavior: reduceMotion.matches ? "auto" : "smooth" });
    }

    function stopAutoplay() {
      window.clearInterval(autoplayTimer);
      autoplayTimer = undefined;
    }

    function startAutoplay() {
      const delay = Number(slider.dataset.sliderAutoplay);
      if (!loop || !Number.isFinite(delay) || delay < 1500 || reduceMotion.matches || document.hidden) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(() => move(1), delay);
    }

    prev.addEventListener("click", () => move(-1));

    next.addEventListener("click", () => move(1));

    dots.addEventListener("click", (event) => {
      const dot = event.target.closest("[data-slider-dot]");
      if (!dot) return;
      const { step, current } = metrics();
      const target = Number(dot.dataset.sliderDot);
      const delta = loop
        ? ((target - current + originalCount + Math.floor(originalCount / 2)) % originalCount) - Math.floor(originalCount / 2)
        : target - current;
      track.scrollBy({ left: delta * step, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });

    track.addEventListener("scroll", () => {
      requestAnimationFrame(paintDots);
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(settleLoop, 140);
    }, { passive: true });

    if (loop) {
      slider.addEventListener("pointerenter", stopAutoplay);
      slider.addEventListener("pointerleave", startAutoplay);
      slider.addEventListener("focusin", stopAutoplay);
      slider.addEventListener("focusout", (event) => {
        if (!slider.contains(event.relatedTarget)) startAutoplay();
      });
      track.addEventListener("touchstart", stopAutoplay, { passive: true });
      track.addEventListener("touchend", startAutoplay, { passive: true });
      document.addEventListener("visibilitychange", () => document.hidden ? stopAutoplay() : startAutoplay());
      reduceMotion.addEventListener?.("change", () => reduceMotion.matches ? stopAutoplay() : startAutoplay());
    }

    function initialize() {
      const { cycle } = metrics();
      if (loop && cycle) track.scrollLeft = cycle;
      loopReady = true;
      paintDots();
      startAutoplay();
    }

    window.addEventListener("resize", () => {
      const current = metrics().current;
      requestAnimationFrame(() => {
        const { step, cycle } = metrics();
        if (loop && cycle) track.scrollLeft = cycle + current * step;
        paintDots();
      });
    });
    requestAnimationFrame(initialize);
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
    .filter((node) => !node.hasAttribute("data-slider-clone") && !node.classList.contains("reveal-ready") && !node.closest(".cart-drawer, .checkout-layout"));

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
