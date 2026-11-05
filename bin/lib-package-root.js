const fs = require('fs');
const path = require('path');

// ng-packagr needs these files inside the package root (src/); they live at the repo root.
// `copy` runs before the lib build, `clean` after it. The copies are gitignored.
const FILES = ['package.json', 'README.md', 'LICENSE.md', 'NOTICE'];
const root = path.join(__dirname, '..');
const target = path.join(root, 'src');

const actions = {
  copy: () => FILES.forEach((f) => fs.copyFileSync(path.join(root, f), path.join(target, f))),
  clean: () => FILES.forEach((f) => fs.rmSync(path.join(target, f), { force: true })),
};

const action = process.argv[2];
if (!actions[action]) {
  console.error(`Usage: node bin/lib-package-root.js <${Object.keys(actions).join('|')}>`);
  process.exit(1);
}
actions[action]();
