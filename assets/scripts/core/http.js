// Explicit module dependencies; no shared browser globals.

async function readPublicData(path) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(path, { cache: "no-store", signal: controller.signal });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error("No se pudo cargar la información.");
      return payload;
    } catch (error) {
      if (attempt === 1) throw error;
    } finally { clearTimeout(timer); }
  }
}

export { readPublicData };
