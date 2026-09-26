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
  function updateProfile(user) {
    menus.forEach((menu) => {
      menu.querySelector(".profile-dropdown").innerHTML = user
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
    updateProfile(session.user);
    if (session.authenticated) return;
  } catch { return; }
  // Account and legal pages must remain directly accessible.
  if (["account", "policies", "claims", "checkout", "confirmation"].includes(document.body.dataset.page)) return;
  if (location.pathname.endsWith("politicas.html")) return;
  try { if (sessionStorage.getItem("floral-welcome-seen")) return; } catch {}
  const dialog = document.createElement("dialog");
  dialog.className = "welcome-dialog";
  dialog.setAttribute("aria-labelledby", "welcome-title");
  dialog.innerHTML = `<button type="button" class="welcome-close" aria-label="Cerrar recordatorio">${icon("x")}</button>
    <img src="assets/logo.svg" width="64" height="64" alt="">
    <p class="eyebrow">Tu espacio floral</p><h2 id="welcome-title">¡Qué gusto verte!</h2>
    <p>Inicia sesión o crea tu cuenta para guardar tus datos y facilitar tus próximas compras.</p>
    <form><label class="legal-check"><input type="checkbox" required name="privacy"><span>Acepto los <a href="politicas.html#terminos" target="_blank" rel="noopener">términos</a> y la <a href="politicas.html#privacidad" target="_blank" rel="noopener">política de privacidad</a>, y he leído la <a href="politicas.html#cookies" target="_blank" rel="noopener">política de cookies</a>.</span></label>
    <p class="welcome-storage">Solo usamos almacenamiento necesario para la cuenta, el carrito y la seguridad. No usamos cookies publicitarias.</p>
    <div class="welcome-actions"><button class="btn dark" type="submit" value="login">Iniciar sesión</button><button class="btn secondary" type="submit" value="register">Registrarse</button></div></form>
    <button type="button" class="welcome-guest">Continuar como invitado</button>`;
  const dismiss = () => dialog.close();
  dialog.querySelector(".welcome-close").addEventListener("click", dismiss);
  dialog.querySelector(".welcome-guest").addEventListener("click", dismiss);
  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    try { localStorage.setItem("la-casa-cookie-consent-v1", "necessary"); } catch {}
    location.href = event.submitter.value === "register" ? "cuenta.html#register" : "cuenta.html";
  });
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  refreshIcons();
  dialog.showModal();
  try { sessionStorage.setItem("floral-welcome-seen", "1"); } catch {}
}

