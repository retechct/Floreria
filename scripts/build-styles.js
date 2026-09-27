const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const styles = path.join(root, 'assets', 'styles');

function expand(file, parents = []) {
  if (parents.includes(file)) throw new Error(`Importacion CSS circular: ${file}`);
  return fs.readFileSync(file, 'utf8').replace(/@import\s+url\(["'](\.[^"']+)["']\);/g, (_, relative) => {
    const dependency = path.resolve(path.dirname(file), relative);
    if (!dependency.startsWith(styles + path.sep)) throw new Error('Importacion fuera de assets/styles.');
    return `\n/* Source: ${path.relative(root, dependency).replaceAll('\\', '/')} */\n${expand(dependency, [...parents, file])}`;
  });
}

function buildStyles() {
  const output = path.join(root, 'assets', 'generated');
  fs.mkdirSync(output, { recursive: true });
  const css = expand(path.join(styles, 'site.css'));
  fs.writeFileSync(path.join(output, 'storefront.css'), '/* GENERATED. Edit assets/styles/ and run npm run build. */\n' + css);
}

if (require.main === module) { buildStyles(); console.log('Estilos de la tienda compilados.'); }
module.exports = { buildStyles };
