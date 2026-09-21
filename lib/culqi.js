const { fail } = require("./catalog");

function culqiConfig() {
  const publicKey = process.env.CULQI_PUBLIC_KEY || "";
  const secretKey = process.env.CULQI_SECRET_KEY || "";
  const mode = publicKey.match(/^pk_(test|live)_/u)?.[1];
  return {
    publicKey, secretKey, mode,
    configured: Boolean(mode && secretKey.startsWith(`sk_${mode}_`) && publicKey.length > 16 && secretKey.length > 16),
    apiBase: process.env.NODE_ENV === "test" && process.env.CULQI_API_BASE ? process.env.CULQI_API_BASE : "https://api.culqi.com/v2",
  };
}

async function culqiRequest(endpoint, body) {
  const config = culqiConfig();
  if (!config.configured) fail("El pago con Culqi aun no esta habilitado.", 503);
  const response = await fetch(`${config.apiBase}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Only a structured provider rejection proves that retrying is safe.
    const rejected = response.status >= 400 && response.status < 500 && data.object === "error";
    throw Object.assign(new Error(rejected ? String(data.user_message || "Culqi no aprobo el pago. Revisa los datos o consulta con tu banco.").slice(0, 250) : "No se pudo confirmar el pago con Culqi."), { status: rejected ? 422 : 502, rejected });
  }
  return data;
}

function normalizePayment(payment = {}) {
  const { mode } = culqiConfig();
  if (typeof payment.token_id !== "string" || !new RegExp(`^(tkn|ype)_${mode}_[A-Za-z0-9]{16}$`).test(payment.token_id)) fail("Culqi no devolvio un token de pago valido.");
  if (typeof payment.device_id !== "string" || !/^[A-Za-z0-9_.:-]{6,180}$/.test(payment.device_id)) fail("No se pudo verificar el dispositivo de pago.");
  let authentication;
  if (payment.authentication_3DS !== undefined) {
    const source = payment.authentication_3DS;
    if (!source || typeof source !== "object" || Array.isArray(source)) fail("La autenticacion bancaria no es valida.");
    authentication = {};
    for (const key of ["eci", "xid", "cavv", "protocolVersion", "directoryServerTransactionId"]) {
      if (source[key] !== undefined) {
        if (typeof source[key] !== "string" || !source[key] || source[key].length > 256) fail("La autenticacion bancaria no es valida.");
        authentication[key] = source[key];
      }
    }
    if (!authentication.eci || !authentication.cavv || !authentication.protocolVersion) fail("La autenticacion bancaria esta incompleta.");
  }
  return { token: payment.token_id, device: payment.device_id, authentication };
}

function createCharge(order, payment) {
  return culqiRequest("/charges", {
    amount: Math.round(order.total * 100), currency_code: "PEN", email: order.customer.email,
    source_id: payment.token, capture: true,
    description: `La Casa de las Flores ${order.orderId}`.slice(0, 80),
    metadata: { order_id: order.orderId },
    antifraud_details: {
      first_name: order.customer.first_name, last_name: order.customer.last_name,
      country_code: "PE", phone_number: order.customer.phone, device_finger_print_id: payment.device,
    },
    ...(payment.authentication ? { authentication_3DS: payment.authentication } : {}),
  });
}

function chargeStatus(charge, order) {
  if (charge.object !== "charge" || !/^chr_(test|live)_[A-Za-z0-9]+$/.test(charge.id || "") || charge.amount !== Math.round(order.total * 100) || charge.currency_code !== "PEN") fail("La respuesta del pago requiere verificacion.", 502);
  // `paid` means a deposit to the merchant bank account, not customer approval.
  const approved = charge.outcome?.type === "venta_exitosa" || charge.outcome?.code === "succesfull_charge";
  return charge.capture === true && approved ? "completed" : "pending_review";
}

module.exports = { culqiConfig, culqiRequest, normalizePayment, createCharge, chargeStatus };
