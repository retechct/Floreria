// Explicit module dependencies; no shared browser globals.
import { renderClaimsPage, renderBusinessBlocks, ensureLegalFooterLinks } from "./components/business.js";
import { initCustomerAccess } from "./components/customer-access.js";
import { renderPublicNavigation, setActiveNav, bindCartTriggers, ensureMobileTabbar, ensureProfileAccess } from "./components/navigation.js";
import { bindProductActions } from "./components/products.js";
import { bindShippingEstimator } from "./components/shipping.js";
import { refreshIcons, sanitizePublicInterface, enhanceStaticIcons, initSliders, initHeaderEffects, initHeroSpotlight, initRevealEffects } from "./components/ui.js";
import { escapeHtml } from "./core/format.js";
import { loadStoreSettings, loadShipping, loadCatalog } from "./core/store.js";
import { reconcileCart, renderCartCount } from "./features/cart.js";


const pageRenderers = {
  home: () => import("./pages/home.js").then(module => module.renderHome()),
  catalog: () => import("./pages/catalog.js").then(module => module.renderCatalog()),
  product: () => import("./pages/product.js").then(module => module.renderProductPage()),
  collections: () => import("./pages/collections.js").then(module => module.renderCollectionsPage()),
  original: () => import("./pages/collections.js").then(module => module.renderOriginalCatalog()),
  custom: () => import("./pages/custom.js").then(module => module.renderCustomBuilder()),
  cart: () => import("./pages/cart.js").then(module => module.renderCartPage()),
  checkout: () => import("./pages/checkout.js").then(module => module.renderCheckoutPage()),
  confirmation: () => import("./pages/confirmation.js").then(module => module.renderConfirmationPage()),
};

function showLoadNotice(message, failed = false) {
  let notice = document.querySelector(".catalog-load-error");
  if (!notice) {
    notice = document.createElement("div");
    document.querySelector("main")?.prepend(notice);
  }
  notice.className = `catalog-load-error${failed ? '' : ' is-loading'}`;
  notice.setAttribute("role", failed ? "alert" : "status");
  notice.innerHTML = `<span>${escapeHtml(message)}</span>${failed ? ' <button type="button">Reintentar</button>' : ''}`;
  notice.querySelector("button")?.addEventListener("click", () => location.reload());
}

function finishPublicRendering() {
  enhanceStaticIcons();
  initSliders();
  initRevealEffects();
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page === "admin") return;
  // Keep the server-rendered navigation visible while the store data loads.
  // Replacing it here caused the labels to flash from "Ocasiones/Flores" to
  // another menu before the catalog request had even finished.
  const settingsReady = loadStoreSettings().then(() => true, () => false);
  const catalogReady = loadCatalog().then(() => true, () => false);
  const needsShipping = ["home", "product", "contact", "checkout"].includes(page);
  const shippingReady = needsShipping ? loadShipping().then(() => true, () => false) : Promise.resolve(true);
  setActiveNav();
  ensureMobileTabbar();
  ensureProfileAccess();
  ensureLegalFooterLinks();
  renderBusinessBlocks();
  initCustomerAccess();
  initHeaderEffects();
  renderCartCount();
  bindProductActions();
  enhanceStaticIcons();
  refreshIcons();
  initHeroSpotlight();
  if (page === "claims") renderClaimsPage();
  if (page === "confirmation") await pageRenderers.confirmation();
  if (page === "original") await pageRenderers.original();
  const catalogPages = ["home", "catalog", "product", "collections", "custom", "cart", "checkout"];
  if (catalogPages.includes(page)) showLoadNotice("Cargando la tienda...");
  const [settingsOk, catalogOk] = await Promise.all([settingsReady, catalogReady]);
  renderPublicNavigation({ refreshLeft: catalogOk });
  // Refresh the mobile purchase action after the store mode is known.
  const mobileActions = document.querySelector(".mobile-head-actions");
  if (mobileActions) {
    const oldProfile = mobileActions.querySelector(".profile-menu");
    mobileActions.remove();
    ensureMobileTabbar();
    if (oldProfile) document.querySelector(".mobile-head-actions .profile-menu")?.replaceWith(oldProfile);
  }
  setActiveNav();
  bindCartTriggers();
  renderCartCount();
  ensureLegalFooterLinks();
  if (settingsOk) sanitizePublicInterface();
  document.querySelector(".catalog-load-error")?.remove();
  if (!catalogOk && catalogPages.includes(page)) {
    showLoadNotice("No pudimos cargar los productos. Comprueba tu conexión y vuelve a intentarlo.", true);
  } else if (catalogOk) {
    try {
      reconcileCart();
      if (page === "home") await pageRenderers.home();
      if (page === "catalog") await pageRenderers.catalog();
      if (page === "product") await pageRenderers.product();
      if (page === "collections") await pageRenderers.collections();
      if (page === "custom") await pageRenderers.custom();
      if (page === "cart") await pageRenderers.cart();
      if (page === "checkout") {
        const shippingOk = await shippingReady;
        if (settingsOk && shippingOk) await pageRenderers.checkout();
        else showLoadNotice("No pudimos comprobar las ventas o las tarifas de entrega. Reintenta antes de pagar.", true);
      }
    } catch (error) {
      console.error("Storefront rendering failed", error);
      showLoadNotice("No pudimos completar esta sección. Vuelve a intentarlo.", true);
    }
  }
  if (!settingsOk && page !== "checkout") showLoadNotice("No pudimos comprobar el modo de venta. Puedes consultar por WhatsApp o reintentar.", true);
  finishPublicRendering();
  document.body.dataset.storeReady = catalogOk && settingsOk ? "true" : "error";
  if (needsShipping && page !== "checkout") {
    const shippingOk = await shippingReady;
    bindShippingEstimator(document);
    if (!shippingOk) showLoadNotice("No pudimos cargar las tarifas de entrega. Reintenta para comprobar la cobertura.", true);
  }
});

export { showLoadNotice, finishPublicRendering };
