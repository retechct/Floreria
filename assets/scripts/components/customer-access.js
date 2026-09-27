// Explicit module dependencies; no shared browser globals.
import { icon } from "./ui.js";
import { readPublicData } from "../core/http.js";

function profileMarkup() {
  return `<details class="profile-menu"><summary aria-label="Perfil de cliente">${icon("user-round")}</summary><div class="profile-dropdown"><a href="cuenta.html">Iniciar sesión</a><a href="cuenta.html#register">Registrarse</a></div></details>`;
}

async function initCustomerAccess() {
  if (document.body.dataset.page === "admin") return;
  const menus = [...document.querySelectorAll(".profile-menu")];
  document.addEventListener("click", (event) => menus.forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") menus.forEach((menu) => {
      if (menu.open) { menu.open = false; menu.querySelector("summary").focus(); }
    });
  });
  function updateProfile(user, role) {
    menus.forEach((menu) => {
      menu.querySelector(".profile-dropdown").innerHTML = role === "admin"
        ? `<a href="admin.html">Administrar tienda</a><button type="button" data-profile-logout>Cerrar sesión</button><p role="status"></p>`
        : user
        ? `<a href="cuenta.html">Ver mi perfil</a><button type="button" data-profile-logout>Cerrar sesión</button><p role="status"></p>`
        : `<a href="cuenta.html">Iniciar sesión</a><a href="cuenta.html#register">Registrarse</a>`;
      menu.querySelector("[data-profile-logout]")?.addEventListener("click", async (event) => {
        event.target.disabled = true;
        try {
          const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          if (!response.ok) throw new Error();
          location.reload();
        } catch {
          menu.querySelector('[role="status"]').textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
          event.target.disabled = false;
        }
      });
    });
  }
  document.addEventListener("customer-session-change", (event) => updateProfile(event.detail));
  try {
    const session = await readPublicData("/api/auth/session");
    updateProfile(session.user, session.role);
    if (session.authenticated) return;
  } catch { return; }
}

export { profileMarkup, initCustomerAccess };
