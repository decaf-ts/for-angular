/**
 * Packs the built `dist/lib` distribution and installs it into a throwaway
 * consumer tree so the Scrum verification suite consumes the exact published
 * artifact instead of the monorepo path aliases (SAA-1049).
 *
 * The consumer mirrors a host project: the tarball is extracted under
 * `consumer/node_modules/@decaf-ts/for-angular`, and every public specifier the
 * tests import is mapped to that installed copy by `jest.config.cjs`.
 */
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const DIST_LIB = path.join(PACKAGE_ROOT, 'dist', 'lib');
const OUT_ROOT =
  process.env['SCRUM_PACK_DIR'] || path.join(os.tmpdir(), 'saa1049-scrum-verify');
const CONSUMER_ROOT = path.join(OUT_ROOT, 'consumer');
const EXTRACT_ROOT = path.join(
  CONSUMER_ROOT,
  'node_modules',
  '@decaf-ts',
  'for-angular'
);

function packAndExtract() {
  if (!fs.existsSync(DIST_LIB)) {
    throw new Error(
      `Missing built distribution at ${DIST_LIB}; run ng build first.`
    );
  }
  fs.rmSync(OUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  // `npm pack` includes any pre-existing tarball in the package root, which
  // would nest a previous build inside the artifact under test.
  const packSource = path.join(OUT_ROOT, 'source');
  // Preserve mtimes so the repacked tarball is byte-identical to the artifact
  // whose sha256/size the issue records.
  fs.cpSync(DIST_LIB, packSource, {
    recursive: true,
    preserveTimestamps: true,
  });
  for (const entry of fs.readdirSync(packSource)) {
    if (entry.endsWith('.tgz')) fs.rmSync(path.join(packSource, entry));
  }
  const tarball = execFileSync('npm', ['pack', '--pack-destination', OUT_ROOT], {
    cwd: packSource,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((line) => line.endsWith('.tgz'))
    .pop();
  if (!tarball) throw new Error('npm pack did not produce a tarball');
  const tarballPath = path.join(OUT_ROOT, tarball);
  fs.mkdirSync(EXTRACT_ROOT, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    tarballPath,
    '-C',
    EXTRACT_ROOT,
    '--strip-components=1',
  ]);
  const artifact = {
    tarball,
    tarballPath,
    bytes: fs.statSync(tarballPath).size,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(tarballPath))
      .digest('hex'),
    consumerRoot: CONSUMER_ROOT,
    extractRoot: EXTRACT_ROOT,
  };
  fs.writeFileSync(
    path.join(OUT_ROOT, 'artifact.json'),
    JSON.stringify(artifact, null, 2)
  );
  return artifact;
}

module.exports = {
  packAndExtract,
  OUT_ROOT,
  CONSUMER_ROOT,
  EXTRACT_ROOT,
};

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(packAndExtract(), null, 2)}\n`);
}
