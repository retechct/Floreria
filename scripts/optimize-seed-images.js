const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const groups = [
  { directory: 'products', size: 1200, quality: 78 },
  { directory: 'thumbs', size: 240, quality: 78 },
];

async function optimizeSeedImages() {
  let changed = 0;
  for (const group of groups) {
    const directory = path.join(root, 'public', 'assets', 'edited', group.directory);
    for (const name of await fs.readdir(directory)) {
      if (!/\.(?:jpe?g|png)$/i.test(name)) continue;
      const source = path.join(directory, name);
      const target = path.join(directory, name.replace(/\.(?:jpe?g|png)$/i, '.webp'));
      const input = await fs.stat(source);
      const output = await fs.stat(target).catch(() => null);
      if (output && output.mtimeMs >= input.mtimeMs) continue;
      await sharp(source).rotate().resize(group.size, group.size, { fit: 'inside', withoutEnlargement: true }).webp({ quality: group.quality, effort: 4 }).toFile(target);
      changed++;
    }
  }
  console.log(`${changed} imágenes de catálogo optimizadas.`);
}

if (require.main === module) optimizeSeedImages().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { optimizeSeedImages };
