'use strict';
// Construye una distribución ejecutable sin proceso de transpilación.
// El proyecto utiliza HTML, CSS y JavaScript nativos servidos por Node.js.
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const files = ['index.html', 'package.json', '.env.example', 'README.md'];
const dirs = ['api', 'css', 'js'];

(async () => {
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  for (const file of files) {
    await fs.copyFile(path.join(root, file), path.join(dist, file));
  }
  for (const dir of dirs) {
    await fs.cp(path.join(root, dir), path.join(dist, dir), {
      recursive: true,
      filter: source => !path.relative(root, source).split(path.sep).includes('data')
    });
  }
  await fs.mkdir(path.join(dist, 'api', 'data'), { recursive: true });
  await fs.writeFile(path.join(dist, 'api', 'data', '.gitkeep'), '');
  await fs.mkdir(path.join(dist, 'docs'), { recursive: true });
  for (const file of ['API_REFERENCE.md', 'ENDPOINTS_API.txt', 'openapi.json', 'ARQUITECTURA_SERVICIOS.md']) {
    await fs.copyFile(path.join(root, 'docs', file), path.join(dist, 'docs', file));
  }
  console.log(`Distribución lista en ${dist}`);
  console.log('No se genera binario: la aplicación usa JavaScript nativo ejecutado por Node.js.');
})().catch(error => { console.error(error); process.exitCode = 1; });
