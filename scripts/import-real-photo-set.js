const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.resolve(process.argv[2] || '');
const photos = [
  ['IMG-20261122-WA0042.jpg', 'hero', 'girasoles-cumpleanos.webp'],
  ['IMG-20261122-WA0065.jpg', 'hero', 'preservadas-color.webp'],
  ['IMG-20261122-WA0072.jpg', 'hero', 'tulipanes-love.webp'],
  ['IMG-20261122-WA0095.jpg', 'hero', 'box-rosado-atelier.webp'],
  ['IMG-20261122-WA0082.jpg', 'hero', 'entrega-real.webp'],
  ['IMG-20261122-WA0043.jpg', 'gallery', 'detalle-con-vino.webp'],
  ['IMG-20261122-WA0047.jpg', 'gallery', 'box-my-melody.webp'],
  ['IMG-20261122-WA0054.jpg', 'gallery', 'girasoles-boho.webp'],
  ['IMG-20261122-WA0058.jpg', 'gallery', 'rosas-azules.webp'],
  ['IMG-20261122-WA0068.jpg', 'gallery', 'rosas-rojas-clasicas.webp'],
  ['IMG-20261122-WA0069.jpg', 'gallery', 'canasta-rosada.webp'],
  ['IMG-20261122-WA0083.jpg', 'gallery', 'cumpleanos-rojo.webp'],
  ['IMG-20261122-WA0085.jpg', 'gallery', 'box-mixto.webp'],
  ['IMG-20261122-WA0090.jpg', 'gallery', 'rosas-rosadas.webp'],
  ['IMG-20261122-WA0092.jpg', 'gallery', 'ramo-pastel.webp'],
];

async function main() {
  if (!source || !fs.statSync(source, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('Indica la carpeta que contiene las fotos extraidas.');
  }
  for (const [inputName, group, outputName] of photos) {
    const input = path.join(source, inputName);
    if (!fs.existsSync(input)) throw new Error(`No se encontro ${inputName}`);
    const outputDir = path.join(root, 'public', 'assets', 'real', group);
    fs.mkdirSync(outputDir, { recursive: true });
    const limit = group === 'hero' ? 2000 : 1200;
    await sharp(input)
      .rotate()
      .resize({ width: limit, height: limit, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: group === 'hero' ? 86 : 82, effort: 5 })
      .toFile(path.join(outputDir, outputName));
  }
  console.log(`${photos.length} fotografias reales optimizadas.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
