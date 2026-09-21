const { fail } = require("./catalog");

const seedSettings = {
  revision: 0,
  salesEnabled: true,
  hidePricesWhenClosed: true,
  quotePhone: process.env.BUSINESS_PHONE || "51947370668",
  quoteMessage: "Hola, quiero cotizar este arreglo.",
  updatedAt: null,
};

function publicSettings(settings) {
  return {
    sales_enabled: settings.salesEnabled !== false,
    hide_prices_when_closed: settings.hidePricesWhenClosed !== false,
    quote_phone: String(settings.quotePhone || process.env.BUSINESS_PHONE || "51947370668").replace(/\D/g, ""),
    quote_message: String(settings.quoteMessage || seedSettings.quoteMessage).slice(0, 160),
  };
}

function createSettings(store) {
  const get = () => store.read("settings", seedSettings);
  async function update(body) {
    return store.update("settings", seedSettings, (settings) => {
      if (body.revision !== settings.revision) fail("La configuracion cambio en otra ventana. Actualiza antes de guardar.", 409);
      if (typeof body.salesEnabled !== "boolean") fail("Selecciona si la tienda vende o solo cotiza.");
      const quotePhone = String(body.quotePhone || settings.quotePhone || "").replace(/\D/g, "");
      if (!/^\d{9,15}$/.test(quotePhone)) fail("Ingresa un WhatsApp valido para cotizaciones.");
      const quoteMessage = String(body.quoteMessage || seedSettings.quoteMessage).trim().slice(0, 160);
      return {
        ...settings,
        revision: settings.revision + 1,
        salesEnabled: body.salesEnabled,
        hidePricesWhenClosed: body.hidePricesWhenClosed !== false,
        quotePhone,
        quoteMessage: quoteMessage || seedSettings.quoteMessage,
        updatedAt: new Date().toISOString(),
      };
    });
  }
  return { get, update };
}

module.exports = { createSettings, publicSettings, seedSettings };
