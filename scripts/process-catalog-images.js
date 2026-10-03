const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceDirectory = path.join(root, 'public', 'assets', 'products');
const outputDirectory = path.join(root, 'public', 'assets', 'edited', 'products');
const productsPath = path.join(root, 'data', 'products.json');
const analysisSize = 180;
const cropRatio = 0.66;

async function focalPoint(input) {
  const { data } = await sharp(input)
    .rotate()
    .resize(analysisSize, analysisSize, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let total = 0;
  let weightedX = 0;
  let weightedY = 0;
  for (let y = 0; y < analysisSize; y += 1) {
    for (let x = 0; x < analysisSize; x += 1) {
      const offset = (y * analysisSize + x) * 3;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      if (chroma <= 30) continue;
      const weight = (chroma - 30) ** 1.6;
      total += weight;
      weightedX += x * weight;
      weightedY += y * weight;
    }
  }

  return total
    ? { x: weightedX / total / analysisSize, y: weightedY / total / analysisSize }
    : { x: 0.5, y: 0.48 };
}

async function editProductPhoto(input, output) {
  const image = sharp(input).rotate();
  const metadata = await image.metadata();
  const focus = await focalPoint(input);
  const side = Math.round(Math.min(metadata.width, metadata.height) * cropRatio);
  const centerX = focus.x * metadata.width;
  const centerY = focus.y * metadata.height;
  const left = Math.max(0, Math.min(metadata.width - side, Math.round(centerX - side / 2)));
  const top = Math.max(0, Math.min(metadata.height - side, Math.round(centerY - side / 2)));

  await sharp(input)
    .rotate()
    .extract({ left, top, width: side, height: side })
    .resize(1200, 1200, { fit: 'cover' })
    .modulate({ brightness: 1.01, saturation: 1.06 })
    .sharpen({ sigma: 0.7, m1: 0.7, m2: 1.4 })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(output);
}

async function processCatalogImages() {
  const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));
  await fs.mkdir(outputDirectory, { recursive: true });
  let processed = 0;

  for (const product of products) {
    const extension = path.extname(product.image) || '.jpg';
    const filename = `${product.id}${extension}`;
    const input = path.join(sourceDirectory, filename);
    const output = path.join(outputDirectory, `${product.id}.jpg`);
    await editProductPhoto(input, output);
    processed += 1;
  }

  console.log(`${processed} fotos de producto reencuadradas y corregidas.`);
}

if (require.main === module) {
  processCatalogImages().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { processCatalogImages, editProductPhoto };
