const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const sources = ['lib', 'scripts', 'assets/scripts', 'tests'].flatMap(folder => files(path.join(root, folder)))
  .filter(file => file.endsWith('.js'));
sources.push(path.join(root, 'server.js'), path.join(root, 'playwright.config.js'));
for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { process.stderr.write(result.stderr); process.exit(1); }
}
for (const file of files(path.join(root, 'views'))) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="(assets\/[^"?]+)(?:\?[^" ]*)?"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) throw new Error(`${file}: archivo ausente ${match[1]}`);
  }
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (!config.builds.some(build => build.config?.includeFiles?.includes('views/**'))) throw new Error('Vercel debe incluir views/**.');
console.log(`${sources.length} archivos JavaScript y recursos de vistas verificados.`);
