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
const moduleRoot = path.join(root, 'assets', 'scripts');
const graph = new Map();
for (const file of sources.filter(file => file.startsWith(moduleRoot + path.sep))) {
  const source = fs.readFileSync(file, 'utf8');
  const dependencies = [...source.matchAll(/(?:from\s+|import\s*\(\s*)["'](\.[^"']+)["']/g)].map(match => path.resolve(path.dirname(file), match[1]));
  for (const dependency of dependencies) {
    if (!dependency.startsWith(moduleRoot + path.sep) || !fs.existsSync(dependency)) throw new Error(`Importacion invalida: ${file} -> ${dependency}`);
  }
  graph.set(file, dependencies);
}
const visited = new Set();
function visit(file, ancestors = []) {
  if (ancestors.includes(file)) throw new Error(`Dependencia circular: ${[...ancestors, file].map(item => path.relative(root, item)).join(' -> ')}`);
  if (visited.has(file)) return;
  for (const dependency of graph.get(file) || []) visit(dependency, [...ancestors, file]);
  visited.add(file);
}
for (const file of graph.keys()) visit(file);
if (!config.builds.some(build => build.config?.includeFiles?.includes('views/**'))) throw new Error('Vercel debe incluir views/**.');
console.log(`${sources.length} archivos JavaScript y recursos de vistas verificados.`);
