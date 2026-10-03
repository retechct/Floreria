import { DISTRICTS } from "../core/store.js";
import { getCart } from "./cart.js";

function deliveryFeeForDistrict(district) {
  const item = DISTRICTS.find((item) => item.id === district || item.name === district);
  return item?.enabled ? item.fee : null;
}

function checkoutCartPayload() {
  return getCart().map((item) => ({
    id: item.id,
    qty: item.qty,
    note: item.note || "",
    custom: item.custom && !item.custom.admin_promotion ? {
      id: item.custom.id,
      name: item.custom.name,
      description: item.custom.description,
      builder: item.custom.builder,
    } : null,
  }));
}

function setCheckoutStatus(message, tone = "") {
  const node = document.querySelector("#checkout-status");
  if (!node) return;
  node.textContent = message;
  node.className = `checkout-status ${tone}`.trim();
}

function checkoutOrderPayload(form) {
  const data = new FormData(form);
  return {
    cart: checkoutCartPayload(),
    customer: {
      first_name: data.get("first_name"),
      last_name: data.get("last_name"),
      email: data.get("email"),
      phone: data.get("phone"),
    },
    delivery: {
      recipient: data.get("recipient"),
      recipient_phone: data.get("recipient_phone"),
      date: data.get("delivery_date"),
      slot: data.get("delivery_slot"),
      district_id: data.get("delivery_district"),
      address: data.get("delivery_address"),
      reference: data.get("delivery_reference"),
      dedication: data.get("dedication"),
    },
    legal: {
      accepted_terms: data.get("legal_acceptance") === "on",
    },
    receipt: {
      type: data.get('receipt_type'),
      document_type: data.get('receipt_document_type'),
      document_number: data.get('receipt_document_number'),
      legal_name: data.get('receipt_legal_name'),
      fiscal_address: data.get('receipt_fiscal_address'),
    },
  };
}


export { deliveryFeeForDistrict, checkoutCartPayload, setCheckoutStatus, checkoutOrderPayload };
