/**
 * Packs the built `dist/lib` distribution and extracts it so the Gantt
 * functional suite consumes the exact published artifact (SAA-1045).
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const DIST_LIB = path.join(PACKAGE_ROOT, 'dist', 'lib');
const OUT_ROOT =
  process.env['GANTT_PACK_DIR'] ||
  path.join(os.tmpdir(), 'saa1045-gantt-verify');
const EXTRACT_ROOT = path.join(OUT_ROOT, 'package');

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
  for (const entry of fs.readdirSync(DIST_LIB)) {
    if (entry.endsWith('.tgz')) fs.rmSync(path.join(DIST_LIB, entry));
  }
  const tarball = execFileSync('npm', ['pack', '--pack-destination', OUT_ROOT], {
    cwd: DIST_LIB,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((line) => line.endsWith('.tgz'))
    .pop();
  if (!tarball) throw new Error('npm pack did not produce a tarball');
  fs.mkdirSync(EXTRACT_ROOT, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    path.join(OUT_ROOT, tarball),
    '-C',
    EXTRACT_ROOT,
    '--strip-components=1',
  ]);
  fs.writeFileSync(
    path.join(OUT_ROOT, 'artifact.json'),
    JSON.stringify(
      {
        tarball,
        bytes: fs.statSync(path.join(OUT_ROOT, tarball)).size,
        sha256: require('node:crypto')
          .createHash('sha256')
          .update(fs.readFileSync(path.join(OUT_ROOT, tarball)))
          .digest('hex'),
      },
      null,
      2
    )
  );
  return { tarball: path.join(OUT_ROOT, tarball), extractRoot: EXTRACT_ROOT };
}

module.exports = { packAndExtract, OUT_ROOT, EXTRACT_ROOT };

if (require.main === module) {
  process.stdout.write(`${JSON.stringify(packAndExtract(), null, 2)}\n`);
}
