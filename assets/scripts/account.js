"use strict";

const account$ = selector => document.querySelector(selector);
let mfaChallenge = null;
let actionKind = null, actionToken = null;
function readActionLink() {
  const action = new URLSearchParams(location.hash.slice(1));
  const kind = action.has('reset') ? 'reset' : action.has('verify') ? 'verify' : null;
  if (!kind) return false;
  actionKind = kind; actionToken = action.get(kind);
  // Keep bearer links out of history, referrers and subsequent requests.
  history.replaceState(null, '', location.pathname);
  return true;
}
readActionLink();
let emailEnabled = false;

function accountMessage(message, success = false) {
  const node = account$('#account-message');
  node.textContent = message;
  node.classList.toggle('success', success);
}
async function accountApi(path, method = 'GET', body) {
  const response = await fetch(`/api/auth/${path}`, {
    method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la solicitud.');
  return data;
}
function setAccountTab(tab) {
  document.querySelectorAll('[data-account-tab]').forEach(button => {
    const active = button.dataset.accountTab === tab;
    button.classList.toggle('is-active', active);
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('[data-account-panel]').forEach(panel => { panel.hidden = panel.dataset.accountPanel !== tab; });
  accountMessage('');
}
function showSignedIn(user) {
  document.dispatchEvent(new CustomEvent('customer-session-change', { detail: user }));
  account$('#account-panel').hidden = true;
  account$('#account-session').hidden = false;
  account$('#account-name').textContent = user.name;
  account$('#account-email').textContent = user.email;
}
function bindForm(id, submit) {
  account$(id).addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, button = form.querySelector('button[type=submit]');
    button.disabled = true; accountMessage('Procesando…');
    try { await submit(form, Object.fromEntries(new FormData(form))); }
    catch (error) { accountMessage(error.message); }
    finally { button.disabled = false; }
  });
}
function loginResult(result) {
  if (result.requiresMfa) {
    mfaChallenge = result.challenge;
    account$('#login-form [name=password]').value = '';
    setAccountTab('mfa'); account$('#mfa-form [name=code]').focus(); return;
  }
  if (result.role === 'admin') { location.replace('/admin.html'); return; }
  if (result.role !== 'customer' || !result.user) throw new Error('No se pudo iniciar la sesión.');
  showSignedIn(result.user);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
    const input = button.parentElement.querySelector('input'), visible = input.type === 'text';
    input.type = visible ? 'password' : 'text'; button.textContent = visible ? 'Mostrar' : 'Ocultar';
    button.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  }));
  const routeTab = () => setAccountTab(['register', 'forgot', 'verify-request'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'login');
  document.querySelectorAll('[data-account-tab]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); mfaChallenge = null;
    history.replaceState(null, '', `#${button.dataset.accountTab}`); setAccountTab(button.dataset.accountTab);
  }));
  window.addEventListener('hashchange', () => {
    if (readActionLink()) {
      account$('#account-panel').hidden = false; account$('#account-session').hidden = true;
      setAccountTab(actionKind);
    } else routeTab();
  });
  if (actionKind) setAccountTab(actionKind); else routeTab();
  bindForm('#login-form', async (_, body) => loginResult(await accountApi('login', 'POST', body)));
  bindForm('#mfa-form', async (_, body) => loginResult(await accountApi('mfa', 'POST', { challenge: mfaChallenge, code: body.code })));
  bindForm('#register-form', async (form, body) => {
    const result = await accountApi('register', 'POST', { ...body, acceptedTerms: form.elements.acceptedTerms.checked, acceptedPrivacy: form.elements.acceptedPrivacy.checked });
    form.reset(); setAccountTab('verify-request');
    account$('#verification-request-form [name=email]').value = body.email;
    account$('#login-form [name=identifier]').value = body.email;
    accountMessage(result.message, true);
  });
  for (const [id, endpoint] of [['#forgot-form', 'forgot-password'], ['#verification-request-form', 'resend-verification']]) {
    bindForm(id, async (_, body) => {
      if (!emailEnabled) throw new Error('El envío de correos no está disponible por el momento. Puedes continuar explorando la tienda.');
      const result = await accountApi(endpoint, 'POST', body); accountMessage(result.message, true);
    });
  }
  bindForm('#verify-form', async () => {
    const result = await accountApi('verify-email', 'POST', { token: actionToken });
    setAccountTab('login'); accountMessage(result.message, true);
  });
  bindForm('#reset-form', async (form, body) => {
    if (body.password !== body.confirmation) throw new Error('Las contraseñas no coinciden.');
    const result = await accountApi('reset-password', 'POST', { token: actionToken, password: body.password });
    form.reset(); setAccountTab('login'); accountMessage(result.message, true);
  });
  account$('#logout-button').addEventListener('click', async () => {
    try { await accountApi('logout', 'POST', {}); location.reload(); }
    catch { account$('#account-email').textContent = 'No se pudo cerrar la sesión. Inténtalo de nuevo.'; }
  });
  try {
    const config = await accountApi('config'); emailEnabled = config.emailEnabled;
    account$('#register-form').hidden = !emailEnabled;
    account$('#registration-note').hidden = emailEnabled;
    account$('#registration-note').textContent = 'El registro está temporalmente pausado. Puedes explorar el catálogo y consultarnos por WhatsApp sin crear una cuenta.';
    const session = await accountApi('session');
    if (actionKind) return;
    if (session.role === 'admin') { location.replace('/admin.html'); return; }
    if (session.authenticated) showSignedIn(session.user);
  } catch (error) { accountMessage(error.message); }
});
