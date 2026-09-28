const fs = require('node:fs');
const path = require('node:path');
const { optimizeSeedImages } = require('./optimize-seed-images');

// Only explicitly public directories enter the static deployment output.
// Never copy the project root, environment files, runtime data or server code.
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
async function buildPublic() {
  await optimizeSeedImages();
  require('./prepare-assets');
  fs.mkdirSync(output, { recursive: true });
  for (const directory of ['assets', 'public']) {
    const destination = path.resolve(output, directory);
    if (path.dirname(destination) !== output || path.dirname(output) !== root) throw new Error('Destino de compilacion invalido.');
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(path.join(root, directory), destination, { recursive: true });
  }
  console.log('Recursos públicos preparados en dist/.');
}
buildPublic().catch(error => { console.error(error); process.exitCode = 1; });
