const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const imageDirectory = path.join(root, 'public', 'assets', 'premium', 'products');
const productsPath = path.join(root, 'data', 'products.json');

async function buildPremiumCatalogImages() {
  const products = JSON.parse(await fs.readFile(productsPath, 'utf8'));

  for (const product of products) {
    const source = path.join(imageDirectory, `${product.id}.png`);
    const destination = path.join(imageDirectory, `${product.id}.webp`);
    await sharp(source)
      .rotate()
      .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, smartSubsample: true })
      .toFile(destination);
    product.image = `public/assets/premium/products/${product.id}.webp`;
    if (Array.isArray(product.images)) {
      product.images = product.images.map((image, index) => index === 0 ? product.image : image);
    }
  }

  await fs.writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  console.log(`${products.length} fotografías premium optimizadas y conectadas al catálogo.`);
}

if (require.main === module) {
  buildPremiumCatalogImages().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { buildPremiumCatalogImages };
