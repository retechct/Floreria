"use strict";

const account$ = (selector) => document.querySelector(selector);
const accountMessage = (message, success = false) => {
  const node = account$("#account-message");
  node.textContent = message;
  node.classList.toggle("success", success);
};
async function accountApi(path, method = "GET", body) {
  const response = await fetch(`/api/auth/${path}`, {
    method, credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "No se pudo completar la solicitud.");
  return data;
}
function setAccountTab(tab) {
  document.querySelectorAll("[data-account-tab]").forEach((button) => {
    const active = button.dataset.accountTab === tab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-account-panel]").forEach((panel) => { panel.hidden = panel.dataset.accountPanel !== tab; });
  accountMessage("");
}
function showSignedIn(user) {
  account$("#account-panel").hidden = true;
  account$("#account-session").hidden = false;
  account$("#account-name").textContent = user.name;
  account$("#account-email").textContent = user.email;
}
async function submitAccount(form, path) {
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  accountMessage("Procesando...");
  try {
    const body = Object.fromEntries(new FormData(form));
    if (path === "register") {
      body.acceptedTerms = form.elements.acceptedTerms.checked;
      body.acceptedPrivacy = form.elements.acceptedPrivacy.checked;
    }
    const result = await accountApi(path, "POST", body);
    if (result.role === "admin") { window.location.href = result.redirect || "admin.html"; return; }
    showSignedIn(result.user);
  } catch (error) {
    accountMessage(error.message);
  } finally { button.disabled = false; }
}
document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => button.addEventListener("click", () => {
    const input = button.parentElement.querySelector("input");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "Mostrar" : "Ocultar";
    button.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
  }));
  document.querySelectorAll("[data-account-tab]").forEach((button) => button.addEventListener("click", () => setAccountTab(button.dataset.accountTab)));
  account$("#login-form").addEventListener("submit", (event) => { event.preventDefault(); submitAccount(event.currentTarget, "login"); });
  account$("#register-form").addEventListener("submit", (event) => { event.preventDefault(); submitAccount(event.currentTarget, "register"); });
  account$("#logout-button").addEventListener("click", async () => {
    try { await accountApi("logout", "POST", {}); location.reload(); }
    catch (error) { accountMessage(error.message); }
  });
  try {
    const session = await accountApi("session");
    if (session.authenticated) showSignedIn(session.user);
  } catch (error) { accountMessage(error.message); }
});
