const { test, expect } = require("@playwright/test");

test("customer account requires legal consent and keeps a session", async ({ page }) => {
  await page.goto("/cuenta.html");
  await page.getByRole("tab", { name: "Crear cuenta", exact: true }).click();
  const registerForm = page.locator("#register-form");
  const email = `cliente-${Date.now()}@example.com`;
  await registerForm.locator('[name="name"]').fill("Cliente de prueba");
  await registerForm.locator('[name="email"]').fill(email);
  await registerForm.locator('[name="password"]').fill("UnaClaveSegura123");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.locator("#account-session")).toBeHidden();
  await page.locator('[name="acceptedTerms"]').check();
  await page.locator('[name="acceptedPrivacy"]').check();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.locator("#account-session")).toBeVisible();
  await page.reload();
  await expect(page.locator("#account-session")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page.locator("#account-panel")).toBeVisible();
  await page.locator("#login-form [name=\"email\"]").fill(email);
  await page.locator("#login-form [name=\"password\"]").fill("UnaClaveSegura123");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.locator("#account-session")).toBeVisible();
});
