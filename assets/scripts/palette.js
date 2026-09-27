(() => {
  const storageKey = "floreria-palette";
  const sheet = document.querySelector("[data-multicolor-styles]");
  let original = true;
  try {
    original = localStorage.getItem(storageKey) !== "multicolor";
  } catch {
    // Use the brand palette when browser storage is unavailable.
  }

  function applyPalette() {
    if (sheet) sheet.disabled = original;
    document.documentElement.dataset.palette = original ? "original" : "multicolor";
  }
  applyPalette();

})();
