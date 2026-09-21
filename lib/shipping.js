const { fail } = require("./catalog");

// UBIGEO: provincia de Lima (1501) y provincia del Callao (0701).
const provinces = {
  "1501": { name: "Lima", districts: ["Lima", "Anc\u00f3n", "Ate", "Barranco", "Bre\u00f1a", "Carabayllo", "Chaclacayo", "Chorrillos", "Cieneguilla", "Comas", "El Agustino", "Independencia", "Jes\u00fas Mar\u00eda", "La Molina", "La Victoria", "Lince", "Los Olivos", "Lurigancho", "Lur\u00edn", "Magdalena del Mar", "Pueblo Libre", "Miraflores", "Pachac\u00e1mac", "Pucusana", "Puente Piedra", "Punta Hermosa", "Punta Negra", "R\u00edmac", "San Bartolo", "San Borja", "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores", "San Luis", "San Mart\u00edn de Porres", "San Miguel", "Santa Anita", "Santa Mar\u00eda del Mar", "Santa Rosa", "Santiago de Surco", "Surquillo", "Villa El Salvador", "Villa Mar\u00eda del Triunfo"] },
  "0701": { name: "Callao", districts: ["Callao", "Bellavista", "Carmen de la Legua Reynoso", "La Perla", "La Punta", "Ventanilla", "Mi Per\u00fa"] },
};
const originalFees = { "150131": 15, "150122": 15, "150140": 25, "150130": 20, "150114": 25, "150104": 18, "150113": 18, "150116": 18 };

function seedShipping() {
  return { revision: 0, districts: Object.entries(provinces).flatMap(([prefix, province]) => province.districts.map((name, index) => {
    const id = prefix + String(index + 1).padStart(2, "0");
    return { id, name, province: province.name, fee: originalFees[id] ?? null, enabled: originalFees[id] !== undefined };
  })) };
}

function createShipping(store) {
  const get = () => store.read("shipping", seedShipping());
  const update = (body) => store.update("shipping", seedShipping(), (shipping) => {
    if (body.revision !== shipping.revision) fail("Las tarifas cambiaron en otra ventana. Recarga antes de guardar.", 409);
    if (!Array.isArray(body.districts) || !body.districts.length || body.districts.length > 50) fail("Selecciona las tarifas que deseas guardar.");
    const ids = new Set();
    for (const item of body.districts) {
      const district = shipping.districts.find((d) => d.id === item.id);
      if (!district || ids.has(item.id)) fail("Distrito no valido o repetido.");
      ids.add(item.id);
      const fee = item.fee;
      if (typeof item.enabled !== "boolean" || (fee !== null && (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0 || fee > 9999 || Math.abs(fee * 100 - Math.round(fee * 100)) > 0.000001))) fail("La tarifa debe ser un importe entre 0 y 9999 con hasta dos decimales.");
      if (item.enabled && fee === null) fail("Asigna un precio antes de activar el distrito.");
      district.fee = fee;
      district.enabled = item.enabled;
    }
    return { ...shipping, revision: shipping.revision + 1, updatedAt: new Date().toISOString() };
  });
  return { get, update };
}

function resolveDistrict(shipping, delivery) {
  const normalize = (name) => String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  let name = normalize(delivery.district);
  if (name === "surco") name = "santiago de surco";
  const district = shipping.districts.find((d) => delivery.district_id ? d.id === delivery.district_id : normalize(d.name) === name);
  if (!district || !district.enabled || district.fee === null) fail("Este distrito no tiene entregas habilitadas. Selecciona otro distrito.");
  return district;
}

module.exports = { createShipping, seedShipping, resolveDistrict };
