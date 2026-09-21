"use strict";

window.initializeCulqiCheckout = async function () {
  const form = document.querySelector("#culqi-checkout-form");
  if (!form) return;
  const summary = document.querySelector("#checkout-summary");
  const district = document.querySelector("#delivery-district");
  const payButton = document.querySelector("#pay-order");
  const statusButton = document.querySelector("#check-payment");
  const cancelButton = document.querySelector("#cancel-payment");
  let config, ready = false, busy = false, active = null, pending = null, phase = "idle";
  try { pending = JSON.parse(sessionStorage.getItem("checkout-attempt")); } catch {}
  if (!pending?.id) pending = null;

  async function request(path, body) {
    const response = await fetch(`/api/checkout/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(35000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw Object.assign(new Error(data.message || "No se pudo completar la solicitud."), { retry: data.retry_allowed === true });
    return data;
  }
  function lock(value) {
    form.querySelectorAll("input, select, textarea").forEach((input) => { input.disabled = value; });
  }
  function paint() {
    const entries = cartEntries();
    const subtotal = cartTotals();
    const fee = deliveryFeeForDistrict(district.value);
    summary.innerHTML = entries.length ? `<div class="checkout-items">${entries.map(({ item, product }) => `<div class="checkout-mini-item"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"><div><strong>${escapeHtml(product.name)}</strong><span>${item.qty} &times; ${money(product.price)}</span></div><b>${money(product.price * item.qty)}</b></div>`).join("")}</div><div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-line"><span>Entrega</span><strong>${fee === null ? "Seleccionar" : money(fee)}</strong></div><div class="summary-line total"><span>Total</span><strong>${money(subtotal + (fee ?? 0))}</strong></div>` : '<div class="empty-state compact"><h2>Tu cesta est&aacute; vac&iacute;a</h2><a class="btn" href="catalogo.html">Ir al cat&aacute;logo</a></div>';
    payButton.disabled = !entries.length || fee === null || !ready || busy || Boolean(pending) || entries.some(({ product }) => product.available === false);
    payButton.textContent = busy ? "Procesando..." : pending ? "Pago en verificacion" : active ? "Abrir pago seguro" : !ready ? "Pago no disponible" : fee === null ? "Selecciona distrito" : `Pagar ${money(subtotal + fee)}`;
    statusButton.hidden = !pending;
    statusButton.disabled = busy;
    cancelButton.hidden = !(phase === "collect" || phase === "requires_action");
    cancelButton.disabled = busy;
  }
  function finish(order) {
    localStorage.setItem("la-casa-last-payment", pending.id);
    localStorage.setItem(checkoutOrderKey, JSON.stringify(order));
    sessionStorage.removeItem("checkout-attempt");
    saveCart([]);
    window.location.href = `confirmacion.html?order=${encodeURIComponent(order.id)}`;
  }
  function reset() {
    active?.checkout?.close();
    window.Culqi3DS?.reset();
    active = null; pending = null; phase = "idle"; busy = false;
    sessionStorage.removeItem("checkout-attempt");
    lock(false); paint();
  }
  async function checkStatus() {
    if (!pending || busy) return;
    busy = true; paint();
    try {
      const result = await request("status", { request_id: pending.id });
      if (result.status === "completed") { finish(result.order); return; }
      if (result.retry_allowed) { reset(); setCheckoutStatus("No hay un pago confirmado para este intento. Puedes volver a intentarlo."); return; }
      phase = result.status;
      const reference = result.order?.id ? ` Pedido ${result.order.id}.` : "";
      setCheckoutStatus(result.status === "requires_action" ? "Falta la verificacion de tu banco. Puedes cancelarla y empezar de nuevo." : `El pago sigue en verificacion.${reference} Consulta con la tienda antes de intentar otro pago.`, "error");
    } catch (error) { setCheckoutStatus(error.message, "error"); }
    finally { busy = false; paint(); }
  }
  async function sendPayment(authentication) {
    if (!active || busy) return;
    busy = true; phase = "processing"; paint();
    setCheckoutStatus("Verificando el pago con Culqi...");
    try {
      const result = await request("culqi", { ...active.body, request_id: pending.id, payment: { token_id: active.token, device_id: active.device, ...(authentication ? { authentication_3DS: authentication } : {}) } });
      if (result.requires_action) {
        phase = "requires_action";
        busy = false; paint();
        setCheckoutStatus("Completa la verificacion de tu banco.");
        window.Culqi3DS.initAuthentication(active.token);
      } else if (result.order?.status === "completed") finish(result.order);
      else { phase = "pending_review"; setCheckoutStatus(`Tu pago esta en verificacion. Pedido ${result.order?.id || ""}. No vuelvas a pagar hasta confirmar el resultado.`, "error"); }
    } catch (error) {
      if (error.retry) reset();
      else phase = "pending_review";
      setCheckoutStatus(error.message || "No se pudo confirmar el pago. Consulta su estado antes de volver a pagar.", "error");
    } finally { busy = false; paint(); }
  }

  district.innerHTML = '<option value="">Seleccionar distrito</option>' + ["Lima", "Callao"].map((province) => `<optgroup label="${province}">${DISTRICTS.filter((d) => d.province === province).map((d) => `<option value="${d.id}" ${!d.enabled || d.fee === null ? "disabled" : ""}>${escapeHtml(d.name)} - ${d.enabled && d.fee !== null ? money(d.fee) : "Sin cobertura"}</option>`).join("")}</optgroup>`).join("");
  document.querySelector("#delivery-date").min = todayInLima();
  district.addEventListener("change", paint);
  statusButton.addEventListener("click", checkStatus);
  cancelButton.addEventListener("click", async () => {
    if (busy) return;
    if (pending) {
      busy = true; paint();
      try {
        const result = await request("cancel", { request_id: pending.id });
        if (result.status === "completed") { finish(result.order); return; }
      }
      catch (error) { busy = false; setCheckoutStatus(error.message, "error"); paint(); return; }
    }
    reset(); setCheckoutStatus("Puedes revisar tus datos e iniciar otro intento.");
  });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || !event.data || typeof event.data !== "object" || phase !== "requires_action" || !active || busy) return;
    if (event.data.parameters3DS) sendPayment(event.data.parameters3DS);
    else if (event.data.error) setCheckoutStatus("Tu banco no completo la verificacion. Puedes cancelarla y volver a intentarlo.", "error");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || pending || !ready) return;
    if (active && phase === "collect") { active.checkout.open(); return; }
    if (!form.reportValidity() || !cartEntries().length || deliveryFeeForDistrict(district.value) === null) return;
    busy = true; paint();
    try {
      const body = checkoutOrderPayload(form);
      body.expected_total = Number((cartTotals() + deliveryFeeForDistrict(district.value)).toFixed(2));
      const quote = await request("quote", body);
      if (quote.amount !== Math.round(body.expected_total * 100)) throw new Error("El precio o la tarifa cambio. Actualiza la pagina para revisar el nuevo total.");
      const checkout = new window.CulqiCheckout(config.public_key, {
        settings: { title: "La Casa de las Flores", currency: "PEN", amount: quote.amount },
        client: { email: body.customer.email },
        options: { lang: "es", installments: false, modal: true, paymentMethods: { tarjeta: true, yape: true, billetera: false, bancaMovil: false, agente: false, cuotealo: false }, paymentMethodsSort: ["tarjeta", "yape"] },
      });
      window.Culqi3DS.reset();
      window.Culqi3DS.publicKey = config.public_key;
      window.Culqi3DS.settings = { charge: { totalAmount: quote.amount, currency: "PEN", returnUrl: `${location.origin}/checkout.html` }, card: { email: body.customer.email } };
      window.Culqi3DS.options = { showModal: true, showLoading: true, showIcon: true, closeModalAction: () => setCheckoutStatus("La verificacion bancaria no se completo. Consulta el estado o cancela el intento.", "error") };
      const device = await window.Culqi3DS.generateDevice();
      if (typeof device !== "string" || !device) throw new Error("No se pudo verificar tu dispositivo. Intenta nuevamente.");
      active = { body, checkout, device };
      const current = active;
      checkout.culqi = () => {
        if (active !== current || pending || busy) return;
        if (!checkout.token?.id) { setCheckoutStatus(checkout.error?.user_message || "Culqi no genero el token de pago. Revisa los datos.", "error"); return; }
        current.token = checkout.token.id;
        pending = { id: crypto.randomUUID() };
        sessionStorage.setItem("checkout-attempt", JSON.stringify(pending));
        checkout.close();
        sendPayment();
      };
      lock(true); busy = false; phase = "collect"; paint();
      setCheckoutStatus("Completa el pago seguro con Culqi.");
      checkout.open();
    } catch (error) { reset(); setCheckoutStatus(error.message, "error"); }
    finally { busy = false; paint(); }
  });
  paint();
  try {
    const response = await fetch("/api/culqi-config", { cache: "no-store" });
    config = await response.json();
    ready = response.ok && config.configured && typeof window.CulqiCheckout === "function" && Boolean(window.Culqi3DS);
    setCheckoutStatus(ready ? config.sandbox ? "Modo de prueba: no se realizan cargos reales." : "Pago seguro con Culqi." : "El pago no esta disponible por el momento. Contacta a la tienda.", ready ? "success" : "error");
  } catch { setCheckoutStatus("No se pudo conectar con el servicio de pagos.", "error"); }
  if (pending) { lock(true); await checkStatus(); }
  paint();
};
