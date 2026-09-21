const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const target = path.join(root, ".env.admin");
if (fs.existsSync(target)) {
  console.error("Ya existe .env.admin. No se modificaron las credenciales.");
  process.exitCode = 1;
} else {
  const password = crypto.randomBytes(18).toString("base64url");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  fs.writeFileSync(target, `ADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}\nADMIN_SESSION_SECRET=${crypto.randomBytes(48).toString("hex")}\n`, { flag: "wx", mode: 0o600 });
  fs.writeFileSync(path.join(root, ".admin-access.txt"), `Acceso local al panel\nUsuario: admin\nContrasena: ${password}\n\nNo publiques este archivo. Elimina esta copia cuando hayas guardado tu acceso.\nPara produccion, configura las variables de .env.admin en el hosting.\n`, { flag: "wx", mode: 0o600 });
  console.log("Acceso creado. Credenciales en .admin-access.txt; configuracion privada en .env.admin.");
}
