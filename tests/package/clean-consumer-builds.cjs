#!/usr/bin/env node
'use strict';

/**
 * Clean-consumer build evidence for the packed `@decaf-ts/for-angular`
 * distribution (context-manifest §25 / spec §9.1).
 *
 * For every checked entry point this script:
 *   1. packs `dist/lib` and extracts the tarball into a fresh throwaway
 *      consumer's `node_modules/@decaf-ts/for-angular`;
 *   2. links only the peers that entry point is allowed to use, so a build
 *      success proves the entry does not reach for a peer it did not declare;
 *   3. links the required Angular/Decaf/Ionic peers from the repository;
 *   4. runs a real `ng build` application build against the packed artifact.
 *
 * The core-only case omits every optional peer, which is the §9.1 gate.
 *
 * Usage:
 *   node tests/package/clean-consumer-builds.cjs [--keep]
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const DIST_LIB = path.join(PACKAGE_ROOT, 'dist', 'lib');
const REPO_NODE_MODULES = path.join(PACKAGE_ROOT, 'node_modules');

/** Optional feature peers allowed for each consumer under test. */
const ENTRY_FEATURE_PEERS = {
  '.': [],
  './agent': ['@decaf-ts/as-graph', 'ng-diagram'],
  './cron': ['cronstrue'],
  './storyboard': [],
};

/** Root symbols used to prove the public specifier resolves and compiles. */
const ENTRY_SYMBOLS = {
  '.': 'ContainerComponent',
  './agent': 'AgentChatComponent',
  './cron': 'CronSelectorComponent',
  './storyboard': 'StoryboardTutorialComponent',
};

function packArtifact(workDir) {
  const tarball = execFileSync(
    'npm',
    ['pack', '--pack-destination', workDir],
    { cwd: DIST_LIB, encoding: 'utf8' }
  )
    .trim()
    .split('\n')
    .filter((line) => line.endsWith('.tgz'))
    .pop();
  if (!tarball) throw new Error('npm pack did not produce a tarball');
  return path.join(workDir, tarball);
}

function linkNodeModules(consumerRoot, omitSet) {
  const target = path.join(consumerRoot, 'node_modules');
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(REPO_NODE_MODULES)) {
    if (entry === '.bin' || entry === '.cache') continue;
    const source = path.join(REPO_NODE_MODULES, entry);
    if (entry.startsWith('@')) {
      const scopedTarget = path.join(target, entry);
      fs.mkdirSync(scopedTarget, { recursive: true });
      for (const child of fs.readdirSync(source)) {
        const fullName = `${entry}/${child}`;
        if (omitSet.has(fullName) || omitSet.has(entry)) continue;
        fs.symlinkSync(path.join(source, child), path.join(scopedTarget, child));
      }
      continue;
    }
    if (omitSet.has(entry)) continue;
    fs.symlinkSync(source, path.join(target, entry));
  }
}

function writeConsumer(consumerRoot, specifier, symbol) {
  fs.mkdirSync(path.join(consumerRoot, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(consumerRoot, 'package.json'),
    JSON.stringify({ name: 'saa1094-clean-consumer', private: true, version: '0.0.0' }, null, 2)
  );
  fs.writeFileSync(
    path.join(consumerRoot, 'angular.json'),
    JSON.stringify(
      {
        version: 1,
        projects: {
          consumer: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                builder: '@angular/build:application',
                options: {
                  outputPath: 'dist',
                  index: 'src/index.html',
                  browser: 'src/main.ts',
                  tsConfig: 'tsconfig.app.json',
                  polyfills: [],
                  aot: true,
                },
              },
            },
          },
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(consumerRoot, 'tsconfig.app.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          moduleResolution: 'bundler',
          module: 'ES2022',
          target: 'ES2022',
          lib: ['ES2022', 'DOM'],
          skipLibCheck: true,
          useDefineForClassFields: false,
          types: [],
        },
        files: ['src/main.ts'],
        include: ['src/**/*.d.ts'],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(consumerRoot, 'src', 'index.html'),
    '<!doctype html><html><head><title>consumer</title></head><body><app-root></app-root></body></html>\n'
  );
  fs.writeFileSync(
    path.join(consumerRoot, 'src', 'main.ts'),
    [
      "import { Component } from '@angular/core';",
      "import { bootstrapApplication } from '@angular/platform-browser';",
      `import { ${symbol} } from '${specifier}';`,
      '',
      '@Component({',
      "  selector: 'app-root',",
      '  standalone: true,',
      `  imports: [${symbol}],`,
      "  template: '<div></div>',",
      '})',
      'export class App {}',
      '',
      'bootstrapApplication(App);',
      '',
    ].join('\n')
  );
}

function buildConsumer(consumerRoot) {
  const ng = path.join(REPO_NODE_MODULES, '@angular', 'cli', 'bin', 'ng.js');
  const output = execFileSync(process.execPath, [ng, 'build', 'consumer'], {
    cwd: consumerRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
  });
  return output.trim().split('\n').slice(-3).join('\n');
}

function runCase(exportKey, packedTarball, optionalPeers, keep) {
  const specifier = exportKey === '.' ? '@decaf-ts/for-angular' : `@decaf-ts/for-angular/${exportKey.slice(2)}`;
  const symbol = ENTRY_SYMBOLS[exportKey];
  const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'saa1094-consumer-'));
  const allowed = new Set([...ENTRY_FEATURE_PEERS[exportKey], ...optionalPeers.filter((peer) => ENTRY_FEATURE_PEERS[exportKey].includes(peer))]);
  const omit = new Set(optionalPeers.filter((peer) => !allowed.has(peer)));

  linkNodeModules(consumerRoot, omit);
  const packageRoot = path.join(consumerRoot, 'node_modules', '@decaf-ts', 'for-angular');
  fs.mkdirSync(packageRoot, { recursive: true });
  execFileSync('tar', ['-xzf', packedTarball, '-C', packageRoot, '--strip-components=1'], {
    stdio: 'pipe',
  });
  writeConsumer(consumerRoot, specifier, symbol);

  try {
    const summary = buildConsumer(consumerRoot);
    return { entry: exportKey, specifier, status: 'ok', consumerRoot: keep ? consumerRoot : null, summary };
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr) : '';
    const stdout = error.stdout ? String(error.stdout) : '';
    throw new Error(`clean consumer build failed for ${exportKey}\n${stdout}\n${stderr}`);
  } finally {
    if (!keep) fs.rmSync(consumerRoot, { recursive: true, force: true });
  }
}

function main() {
  const keep = process.argv.includes('--keep');
  if (!fs.existsSync(DIST_LIB)) {
    throw new Error(`Missing built distribution at ${DIST_LIB}; run ng build first.`);
  }
  const packedManifest = JSON.parse(fs.readFileSync(path.join(DIST_LIB, 'package.json'), 'utf8'));
  const peerMeta = packedManifest.peerDependenciesMeta || {};
  const optionalPeers = Object.keys(peerMeta).filter((name) => peerMeta[name]?.optional);

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saa1094-pack-'));
  const tarball = packArtifact(workDir);
  const artifact = { name: path.basename(tarball), bytes: fs.statSync(tarball).size };
  const results = [];
  for (const exportKey of Object.keys(ENTRY_SYMBOLS)) {
    results.push(runCase(exportKey, tarball, optionalPeers, keep));
  }
  if (!keep) fs.rmSync(workDir, { recursive: true, force: true });

  process.stdout.write(
    `${JSON.stringify(
      {
        artifact: artifact.name,
        bytes: artifact.bytes,
        omittedOptionalPeers: optionalPeers,
        results,
      },
      null,
      2
    )}\n`
  );
}

main();
