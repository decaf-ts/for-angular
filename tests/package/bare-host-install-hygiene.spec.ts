/**
 * @module tests/package/bare-host-install-hygiene.spec
 * @summary Bare-host install hygiene contract for the packed distribution
 * (SAA-1038 acceptance criterion 6 / context-manifest SS14).
 * @description Asserts the deterministic surfaces behind the documented npm 11
 * `ERESOLVE` artifact and its `--legacy-peer-deps` fallback:
 *
 * 1. the packed root manifest keeps `@angular/cdk` optional (the peer that makes
 *    an empty host float Angular to 22 and collide with our `^21.2.17` anchor),
 * 2. the packed root manifest keeps the Angular 21 anchor that supported hosts
 *    already pin, and the installed CDK still accepts Angular 22 (the trigger),
 * 3. the packed `/gantt` entry keeps `@worktile/gantt` and `html2canvas`
 *    optional (feature isolation must not be traded away for install hygiene),
 * 4. the packed `/gantt` README still documents both the artifact and the exact
 *    `--legacy-peer-deps` fallback.
 *
 * Choice (SAA-1047): this suite deliberately does **not** run a nested
 * `npm install`. A live bare-host install needs the public registry and makes
 * the standard Jest suite network/timing dependent, i.e. flaky in CI. The
 * manual exit-code evidence is recorded on SAA-1045 and SAA-1046 (plain install
 * exits 1 with `ERESOLVE`; `--legacy-peer-deps` exits 0). This test keeps that
 * contract meaningful and fails if the manifest or documentation that produced
 * those results drifts.
 *
 * The assertions run against a fresh `npm pack` of the built `dist/lib`, never
 * the monorepo path aliases or the working-tree README.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Repository package root (`for-angular/`). */
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/** Built distribution that `ng build for-angular` produces. */
const DIST_LIB = path.join(PACKAGE_ROOT, 'dist', 'lib');

interface PackedArtifact {
  extractRoot: string;
  tarball: string;
  sha256: string;
  packageJson: Record<string, unknown>;
  ganttReadme: string;
}

/**
 * Packs a throwaway copy of `dist/lib` so a previously packed tarball cannot
 * nest itself into the artifact under test and so the shared build output is
 * never mutated.
 */
function packFreshArtifact(): PackedArtifact {
  expect(fs.existsSync(DIST_LIB)).toBe(true);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saa1047-hygiene-'));
  const packSource = path.join(workDir, 'source');
  fs.cpSync(DIST_LIB, packSource, { recursive: true });
  for (const entry of fs.readdirSync(packSource)) {
    if (entry.endsWith('.tgz')) fs.rmSync(path.join(packSource, entry));
  }

  const tarballName = execFileSync('npm', ['pack', '--pack-destination', workDir], {
    cwd: packSource,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((line) => line.endsWith('.tgz'))
    .pop();
  expect(tarballName).toBeTruthy();

  const tarball = path.join(workDir, tarballName as string);
  const extractRoot = path.join(workDir, 'package');
  fs.mkdirSync(extractRoot, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '-C', extractRoot, '--strip-components=1'], {
    stdio: 'pipe',
  });

  return {
    extractRoot,
    tarball,
    sha256: require('node:crypto')
      .createHash('sha256')
      .update(fs.readFileSync(tarball))
      .digest('hex'),
    packageJson: JSON.parse(
      fs.readFileSync(path.join(extractRoot, 'package.json'), 'utf8')
    ) as Record<string, unknown>,
    ganttReadme: fs.readFileSync(
      path.join(extractRoot, 'gantt', 'README.md'),
      'utf8'
    ),
  };
}

describe('bare-host install hygiene (SAA-1038 criterion 6)', () => {
  let artifact: PackedArtifact;
  let peers: Record<string, string>;
  let peerMeta: Record<string, { optional?: boolean }>;
  let dependencies: Record<string, string>;

  beforeAll(() => {
    artifact = packFreshArtifact();
    peers = (artifact.packageJson['peerDependencies'] ?? {}) as Record<string, string>;
    peerMeta = (artifact.packageJson['peerDependenciesMeta'] ?? {}) as Record<
      string,
      { optional?: boolean }
    >;
    dependencies = (artifact.packageJson['dependencies'] ?? {}) as Record<string, string>;
  }, 120_000);

  it('keeps @angular/cdk as the optional peer that triggers the documented ERESOLVE artifact', () => {
    expect(peers['@angular/cdk']).toBe('^21.2.14');
    expect(peerMeta['@angular/cdk']?.optional).toBe(true);
    expect(dependencies['@angular/cdk']).toBeUndefined();
  });

  it('keeps the /gantt renderer and print peers optional and out of runtime dependencies', () => {
    expect(peers['@worktile/gantt']).toBe('^21.0.0');
    expect(peers['html2canvas']).toBe('^1.4.1');
    for (const packageName of ['@worktile/gantt', 'html2canvas']) {
      expect(peerMeta[packageName]?.optional).toBe(true);
      expect(dependencies[packageName]).toBeUndefined();
    }
  });

  it('keeps the Angular 21 anchor and the floating-Angular-22 trigger in place', () => {
    expect(peers['@angular/core']).toBe('^21.2.17');
    expect(peers['@angular/common']).toBe('^21.2.17');

    // The artifact only exists because CDK accepts Angular 22, so npm floats an
    // empty host to 22 and then rejects our required ^21.2.17 peers. If CDK
    // stops accepting 22, this documented fallback is obsolete and the test
    // must be revisited rather than silently kept as dead documentation.
    const cdkManifestPath = path.join(
      PACKAGE_ROOT,
      'node_modules',
      '@angular',
      'cdk',
      'package.json'
    );
    expect(fs.existsSync(cdkManifestPath)).toBe(true);
    const cdkManifest = JSON.parse(
      fs.readFileSync(cdkManifestPath, 'utf8')
    ) as { version?: string; peerDependencies?: Record<string, string> };
    expect(cdkManifest.version).toMatch(/^21\./);
    expect(cdkManifest.peerDependencies?.['@angular/core']).toMatch(/\^22\./);
    expect(cdkManifest.peerDependencies?.['@angular/common']).toMatch(/\^22\./);
  });

  it('documents the bare-host ERESOLVE artifact and --legacy-peer-deps fallback in the packed /gantt README', () => {
    expect(artifact.ganttReadme).toMatch(/Bare-host install note/);
    expect(artifact.ganttReadme).toContain('ERESOLVE');
    expect(artifact.ganttReadme).toMatch(/empty\s+directory/);
    expect(artifact.ganttReadme).toContain('npm 11');
    expect(artifact.ganttReadme).toContain('@angular/cdk');
    expect(artifact.ganttReadme).toMatch(/optional peer/);
    expect(artifact.ganttReadme).toMatch(
      /npm install @decaf-ts\/for-angular --legacy-peer-deps/
    );
  });

  it('documents the supported Angular-21 host path and forbids trading the optional peer for a dependency', () => {
    expect(artifact.ganttReadme).toMatch(/does not\s+occur in an Angular 21 host/);
    expect(artifact.ganttReadme).toMatch(
      /pins `@angular\/core`, `@angular\/common`, and\s+`@angular\/cdk` to 21\.x/
    );
    expect(artifact.ganttReadme).toMatch(
      /do not replace the optional peer with a\s+regular dependency/
    );
  });
});
