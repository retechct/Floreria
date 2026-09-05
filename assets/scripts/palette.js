(() => {
  const storageKey = "floreria-palette";
  const sheet = document.querySelector("[data-multicolor-styles]");
  let original = false;
  try {
    original = localStorage.getItem(storageKey) === "original";
  } catch {
    // The switch still works when browser storage is unavailable.
  }

  function applyPalette() {
    if (sheet) sheet.disabled = original;
    document.documentElement.dataset.palette = original ? "original" : "multicolor";
  }
  applyPalette();

  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.querySelector(".topbar-inner");
    if (!bar) return;
    bar.classList.add("has-palette-toggle");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-toggle";
    button.setAttribute("aria-label", "Colores originales");
    button.innerHTML = '<i data-lucide="palette" aria-hidden="true"></i><span>Colores originales</span>';
    const label = button.querySelector("span");

    function updateButton() {
      button.setAttribute("aria-pressed", String(original));
      button.title = original ? "Volver a los colores multicolor" : "Usar los colores morado y aqua originales";
      label.textContent = original ? "Volver a multicolor" : "Colores originales";
    }
    updateButton();
    button.addEventListener("click", () => {
      original = !original;
      applyPalette();
      updateButton();
      try {
        localStorage.setItem(storageKey, original ? "original" : "multicolor");
      } catch {
        // Keep the current selection for this page without persistence.
      }
    });
    bar.append(button);
  });
})();
