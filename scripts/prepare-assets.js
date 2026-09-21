const fs = require("node:fs");
const path = require("node:path");
const target = path.join(__dirname, "..", "assets", "vendor");
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(require.resolve("lucide/dist/umd/lucide.min.js"), path.join(target, "lucide.min.js"));
fs.copyFileSync(path.join(path.dirname(require.resolve("lucide/package.json")), "LICENSE"), path.join(target, "lucide-LICENSE"));
console.log("Iconos preparados.");
