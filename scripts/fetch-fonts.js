// Manual maintenance command. Fonts are versioned; builds do not use the network.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const endpoint = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..600&family=Cormorant+Garamond:ital,wght@0,400..600;1,500&display=swap';
async function read(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Font download failed (${response.status})`);
  return response;
}
async function main() {
  const css = await (await read(endpoint)).text();
  const blocks = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[\s\S]*?\})/g)].map(match => match[1]);
  if (blocks.length < 2) throw new Error('Expected Latin WOFF2 font faces. No files changed.');
  const downloaded = new Map(), fonts = [], faces = [];
  for (const block of blocks) {
    const source = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
    if (!source) throw new Error('Unexpected font source.');
    let file = downloaded.get(source);
    if (!file) {
      const family = block.match(/font-family:\s*'([^']+)'/)?.[1];
      const style = block.match(/font-style:\s*(\w+)/)?.[1];
      file = `${family.toLowerCase().replaceAll(' ', '-')}-${style}-${downloaded.size + 1}.woff2`;
      const bytes = Buffer.from(await (await read(source)).arrayBuffer());
      if (bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error('Invalid WOFF2 font.');
      fonts.push({ file, source, bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
      downloaded.set(source, file);
    }
    faces.push(block.replace(source, `/assets/fonts/${file}`));
  }
  const licenses = [];
  for (const family of ['inter', 'cormorantgaramond']) {
    const source = `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`;
    licenses.push({ file: `${family}-OFL.txt`, text: await (await read(source)).text() });
  }
  const directory = path.join(root, 'assets', 'fonts');
  await fs.mkdir(directory, { recursive: true });
  for (const font of fonts) await fs.writeFile(path.join(directory, font.file), font.bytes);
  for (const license of licenses) await fs.writeFile(path.join(directory, license.file), license.text);
  await fs.writeFile(path.join(root, 'assets', 'styles', 'base', 'fonts.css'), '/* Self-hosted fonts. Regenerate with node scripts/fetch-fonts.js. */\n' + faces.join('\n\n') + '\n');
  await fs.writeFile(path.join(directory, 'SOURCES.json'), JSON.stringify({ endpoint, downloaded: new Date().toISOString(), fonts: fonts.map(({ bytes, ...font }) => ({ ...font, size: bytes.length })) }, null, 2));
  console.log(`Prepared ${fonts.length} local WOFF2 files (${fonts.reduce((sum, font) => sum + font.bytes.length, 0)} bytes) with licenses.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
