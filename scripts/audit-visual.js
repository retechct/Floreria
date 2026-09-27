const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function main() {
  const phase = process.argv[2];
  if (!['before', 'after'].includes(phase)) throw new Error('Usa before o after con el servidor local de prueba iniciado.');
  const root = path.join(__dirname, '..', '.runtime', 'audit-visual');
  await fs.mkdir(root, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const fingerprints = {};
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${process.env.UI_TEST_PORT || 3050}/`);
      await page.waitForFunction(() => document.body.dataset.storeReady === 'true');
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({ path: path.join(root, `${phase}-home-${width}.png`), animations: 'disabled' });
      fingerprints[width] = crypto.createHash('sha256').update(png).digest('hex');
      await page.close();
    }
  } finally { await browser.close(); }
  await fs.writeFile(path.join(root, `${phase}.json`), JSON.stringify(fingerprints, null, 2));
  if (phase === 'after') {
    const before = JSON.parse(await fs.readFile(path.join(root, 'before.json'), 'utf8'));
    for (const width of Object.keys(fingerprints)) console.log(`${width}px: ${before[width] === fingerprints[width] ? 'portada idéntica píxel a píxel' : 'diferencia visual; revisar las capturas'}`);
  } else console.log('Referencia visual guardada para móvil y escritorio.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
