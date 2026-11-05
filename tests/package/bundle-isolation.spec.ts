/**
 * @module tests/package/bundle-isolation.spec
 * @summary Phase 2 bundle-wall: every packed secondary entry point imports only
 * its own feature peers plus root/core, and the root FESM stays feature-clean.
 * @description Packs the built `dist/lib` distribution, extracts the tarball,
 * and scans every shipped FESM for static, side-effect, and dynamic import
 * specifiers. The assertions run against the packed artifact only, never the
 * monorepo path aliases (spec SS9 testing contract).
 *
 * The per-entry feature allow-list is the executable form of the dependency
 * isolation contract (spec SS5): a feature that is exclusive to one entry point
 * must never appear in another entry point's graph, and the root barrel must
 * not pull any specialised feature runtime.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Repository package root (`for-angular/`). */
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/** Built distribution that `ng build for-angular` produces. */
const DIST_LIB = path.join(PACKAGE_ROOT, 'dist', 'lib');

/** Angular, Decaf core, Ionic and translation peers every consumer needs. */
const CORE_SPECIFIERS = [
  '@angular/animations',
  '@angular/common',
  '@angular/common/http',
  '@angular/compiler',
  '@angular/core',
  '@angular/core/rxjs-interop',
  '@angular/forms',
  '@angular/platform-browser',
  '@angular/platform-browser-dynamic',
  '@angular/router',
  '@decaf-ts/core',
  '@decaf-ts/db-decorators',
  '@decaf-ts/decoration',
  '@decaf-ts/decorator-validation',
  '@decaf-ts/for-http',
  '@decaf-ts/injectable-decorators',
  '@decaf-ts/logging',
  '@decaf-ts/transactional-decorators',
  '@decaf-ts/ui-decorators',
  '@decaf-ts/styles',
  '@ionic/angular',
  '@ionic/angular/standalone',
  '@ionic/core',
  '@ngx-translate/core',
  '@ngx-translate/http-loader',
  'ionicons',
  'ionicons/icons',
  'reflect-metadata',
  'rxjs',
  'rxjs/operators',
  'tslib',
  'zone.js',
];

/** Feature-exclusive peers for each entry point (spec SS5.1 rules 2-4). */
const FEATURE_SPECIFIERS: Record<string, string[]> = {
  '.': [],
  './barcode': ['@bwip-js/browser'],
  './charts': ['@cortex-js/compute-engine', 'echarts'],
  './code-editor': [
    '@codemirror/autocomplete',
    '@codemirror/commands',
    '@codemirror/lang-javascript',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/state',
    '@codemirror/theme-one-dark',
    '@codemirror/view',
    'codemirror',
  ],
  './agent': ['@decaf-ts/as-graph/shared'],
  './cron': ['cronstrue', 'cronstrue/i18n'],
  './diagrams': ['@decaf-ts/as-graph/shared', 'ng-diagram'],
  './gantt': ['@worktile/gantt', 'html2canvas'],
  './kanban': ['@angular/cdk/drag-drop'],
  './math': ['mathlive'],
  // `/scrum` is the only entry allowed to compose another feature: it has no
  // third-party feature peer of its own and reuses `/kanban`.
  './scrum': [],
  './storyboard': [],
};

/**
 * The only cross-feature entry-point imports each secondary entry may make.
 * Deliberate composition is allowed instead of duplication:
 * `/scrum` composes the Kanban board, while `/agent` composes `/diagrams`
 * (shared graph primitives and translation) and `/code-editor` (the chat
 * artifact editor).
 */
const CROSS_ENTRY_SPECIFIERS: Record<string, string[]> = {
  './agent': [
    '@decaf-ts/for-angular/code-editor',
    '@decaf-ts/for-angular/diagrams',
  ],
  './scrum': ['@decaf-ts/for-angular/kanban'],
};

/** Feature directories that must never leak into the `/scrum` graph. */
const NON_SCRUM_FEATURE_DIRECTORIES = [
  'agent',
  'gantt',
  'diagrams',
  'charts',
  'code-editor',
  'math',
  'barcode',
  'cron',
  'storyboard',
];

/** Every feature specifier owned by any secondary entry point. */
const ALL_FEATURE_SPECIFIERS = new Set(Object.values(FEATURE_SPECIFIERS).flat());

/** Package names that carry an optional or required feature runtime. */
const FEATURE_PACKAGES = new Set(
  [...ALL_FEATURE_SPECIFIERS].map((specifier) =>
    specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
  )
);

/** Extracts every external module specifier from one FESM source. */
function externalSpecifiersOf(source: string): string[] {
  const specifiers = new Set<string>();
  const patterns = [
    /(?:^|[^\w$])from\s+['"]([^'"]+)['"]/g,
    /(?:^|[^\w$])import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|[^\w$])import\s+['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        specifiers.add(specifier);
      }
    }
  }
  return [...specifiers].sort();
}

/** Maps an import specifier to its package name (`@scope/name` or `name`). */
function packageOf(specifier: string): string {
  return specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
}

/** FESM filename for one public export subpath. */
function fesmFileOf(exportKey: string): string {
  return exportKey === '.'
    ? 'decaf-ts-for-angular.mjs'
    : `decaf-ts-for-angular-${exportKey.replace('./', '')}.mjs`;
}

describe('packed bundle isolation (Phase 2)', () => {
  let extractRoot: string;
  let packedPackageJson: Record<string, unknown>;

  beforeAll(() => {
    expect(fs.existsSync(DIST_LIB)).toBe(true);
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'saa1003-pack-'));
    execFileSync('npm', ['pack', '--pack-destination', workDir], {
      cwd: DIST_LIB,
      stdio: 'pipe',
    });
    const tarball = fs
      .readdirSync(workDir)
      .find((entry) => entry.endsWith('.tgz')) as string;
    expect(tarball).toBeTruthy();
    extractRoot = path.join(workDir, 'package');
    fs.mkdirSync(extractRoot, { recursive: true });
    execFileSync('tar', ['-xzf', path.join(workDir, tarball), '-C', extractRoot, '--strip-components=1'], {
      stdio: 'pipe',
    });
    packedPackageJson = JSON.parse(
      fs.readFileSync(path.join(extractRoot, 'package.json'), 'utf8')
    ) as Record<string, unknown>;
  }, 120_000);

  it('ships a root FESM with no specialised feature import', () => {
    const source = fs.readFileSync(
      path.join(extractRoot, 'fesm2022', fesmFileOf('.')),
      'utf8'
    );
    const featureImports = externalSpecifiersOf(source).filter((specifier) =>
      FEATURE_PACKAGES.has(packageOf(specifier))
    );
    expect(featureImports).toEqual([]);
  });

  it.each(Object.keys(FEATURE_SPECIFIERS).filter((entry) => entry !== '.'))(
    '%s FESM imports only its own feature peers plus root/core',
    (exportKey) => {
      const file = path.join(extractRoot, 'fesm2022', fesmFileOf(exportKey));
      expect(fs.existsSync(file)).toBe(true);
      const imports = externalSpecifiersOf(fs.readFileSync(file, 'utf8'));
      const allowed = new Set([
        ...CORE_SPECIFIERS,
        '@decaf-ts/for-angular',
        ...(CROSS_ENTRY_SPECIFIERS[exportKey] ?? []),
        ...FEATURE_SPECIFIERS[exportKey],
      ]);

      const violations = imports.filter((specifier) => !allowed.has(specifier));
      expect(violations).toEqual([]);
    }
  );

  it.each(Object.keys(FEATURE_SPECIFIERS).filter((entry) => entry !== '.'))(
    '%s FESM imports only its explicitly allowed cross-feature entry points',
    (exportKey) => {
      const source = fs.readFileSync(
        path.join(extractRoot, 'fesm2022', fesmFileOf(exportKey)),
        'utf8'
      );
      const secondaryImports = externalSpecifiersOf(source).filter((specifier) =>
        specifier.startsWith('@decaf-ts/for-angular/')
      );
      expect(secondaryImports).toEqual(
        CROSS_ENTRY_SPECIFIERS[exportKey] ?? []
      );
    }
  );

  it('exports every secondary entry point from the packed manifest', () => {
    const exportsMap = packedPackageJson['exports'] as Record<string, unknown>;
    for (const exportKey of Object.keys(FEATURE_SPECIFIERS)) {
      expect(exportsMap[exportKey]).toBeTruthy();
    }
  });

  it('ships ./gantt as a distinct export with its own optional peers', () => {
    const exportsMap = packedPackageJson['exports'] as Record<string, unknown>;
    const peers = (packedPackageJson['peerDependencies'] ?? {}) as Record<string, string>;
    const peerMeta = (packedPackageJson['peerDependenciesMeta'] ?? {}) as Record<
      string,
      { optional?: boolean }
    >;
    const dependencies = (packedPackageJson['dependencies'] ?? {}) as Record<string, string>;
    expect(exportsMap['./gantt']).toBeTruthy();
    expect(peers['@worktile/gantt']).toBe('^21.0.0');
    expect(peers['html2canvas']).toBe('^1.4.1');
    expect(peerMeta['@worktile/gantt']?.optional).toBe(true);
    expect(peerMeta['html2canvas']?.optional).toBe(true);
    expect(peerMeta['@angular/cdk']?.optional).toBe(true);
    expect(dependencies['@worktile/gantt']).toBeUndefined();
    expect(dependencies['html2canvas']).toBeUndefined();
    expect(
      fs.existsSync(path.join(extractRoot, 'gantt', 'README.md'))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(extractRoot, 'types', 'decaf-ts-for-angular-gantt.d.ts')
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(extractRoot, 'fesm2022', fesmFileOf('./gantt') + '.map')
      )
    ).toBe(true);
  });

  it('pins @angular/cdk as an optional peer of ./kanban only', () => {
    const exportsMap = packedPackageJson['exports'] as Record<string, unknown>;
    const peers = (packedPackageJson['peerDependencies'] ?? {}) as Record<string, string>;
    const peerMeta = (packedPackageJson['peerDependenciesMeta'] ?? {}) as Record<
      string,
      { optional?: boolean }
    >;
    const dependencies = (packedPackageJson['dependencies'] ?? {}) as Record<string, string>;
    expect(exportsMap['./kanban']).toBeTruthy();
    expect(peers['@angular/cdk']).toBe('^21.2.14');
    expect(peerMeta['@angular/cdk']?.optional).toBe(true);
    expect(dependencies['@angular/cdk']).toBeUndefined();
  });

  it('keeps feature peers optional and excludes build/test tooling from root peers', () => {
    const peers = (packedPackageJson['peerDependencies'] ?? {}) as Record<string, string>;
    const peerMeta = (packedPackageJson['peerDependenciesMeta'] ?? {}) as Record<
      string,
      { optional?: boolean }
    >;
    for (const packageName of FEATURE_PACKAGES) {
      expect(peers[packageName]).toBeTruthy();
      expect(peerMeta[packageName]?.optional).toBe(true);
    }
    expect(peers['@angular-builders/custom-webpack']).toBeUndefined();
    expect(peers['@angular-builders/custom-esbuild']).toBeUndefined();
    expect(peers['@faker-js/faker']).toBeUndefined();
  });

  it('does not ship the removed /model-builder entry point', () => {
    const exportsMap = packedPackageJson['exports'] as Record<string, unknown>;
    expect(exportsMap['./model-builder']).toBeUndefined();
    expect(
      fs.existsSync(
        path.join(extractRoot, 'fesm2022', 'decaf-ts-for-angular-model-builder.mjs')
      )
    ).toBe(false);
    expect(fs.existsSync(path.join(extractRoot, 'model-builder'))).toBe(false);
  });

  it('keeps cronstrue as an optional peer of ./cron only', () => {
    const peers = (packedPackageJson['peerDependencies'] ?? {}) as Record<string, string>;
    const peerMeta = (packedPackageJson['peerDependenciesMeta'] ?? {}) as Record<
      string,
      { optional?: boolean }
    >;
    const dependencies = (packedPackageJson['dependencies'] ?? {}) as Record<string, string>;
    expect(peers['cronstrue']).toBe('^3.24.0');
    expect(peerMeta['cronstrue']?.optional).toBe(true);
    expect(dependencies['cronstrue']).toBeUndefined();
    expect(dependencies['@decaf-ts/as-zod']).toBeUndefined();
    expect(dependencies['zod']).toBeUndefined();
    expect(peers['@decaf-ts/as-zod']).toBeUndefined();
    expect(peers['zod']).toBeUndefined();
  });

  it.each(['./agent', './cron', './storyboard'])(
    '%s ships its README, declarations, and FESM',
    (exportKey) => {
      const exportsMap = packedPackageJson['exports'] as Record<string, unknown>;
      const directory = exportKey.replace('./', '');
      expect(exportsMap[exportKey]).toBeTruthy();
      expect(
        fs.existsSync(path.join(extractRoot, directory, 'README.md'))
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(
            extractRoot,
            'types',
            `decaf-ts-for-angular-${directory}.d.ts`
          )
        )
      ).toBe(true);
      expect(
        fs.existsSync(path.join(extractRoot, 'fesm2022', fesmFileOf(exportKey)))
      ).toBe(true);
    }
  );

  it('keeps the extracted feature implementations out of the root FESM', () => {
    const rootSource = fs.readFileSync(
      path.join(extractRoot, 'fesm2022', fesmFileOf('.')),
      'utf8'
    );
    expect(rootSource).not.toMatch(
      /AgentChatComponent|CronSelectorComponent|CronSelectorFieldComponent|CronBuilderComponent|StoryboardTutorialComponent|StoryboardTutorialService/
    );
    expect(rootSource).not.toMatch(/cronstrue/);
  });

  it('keeps the model builder available from the root entry point without its former peers', () => {
    const rootSource = fs.readFileSync(
      path.join(extractRoot, 'fesm2022', fesmFileOf('.')),
      'utf8'
    );
    expect(rootSource).toMatch(/ModelBuilderComponent/);
    expect(rootSource).not.toMatch(/@decaf-ts\/as-zod|from ['"]zod['"]/);
  });

  describe('phase 5 scrum entry-point isolation', () => {
    function scrumSource(): string {
      return fs.readFileSync(
        path.join(extractRoot, 'fesm2022', fesmFileOf('./scrum')),
        'utf8'
      );
    }

    it('imports /kanban and nothing else cross-feature', () => {
      const secondaryImports = externalSpecifiersOf(scrumSource()).filter(
        (specifier) => specifier.startsWith('@decaf-ts/for-angular/')
      );
      expect(secondaryImports).toEqual(['@decaf-ts/for-angular/kanban']);
    });

    it('has zero references to every other feature entry point', () => {
      const imports = externalSpecifiersOf(scrumSource());
      const leakedImports = imports.filter((specifier) =>
        NON_SCRUM_FEATURE_DIRECTORIES.some((directory) =>
          specifier.includes(`for-angular/${directory}`)
        )
      );
      expect(leakedImports).toEqual([]);

      const source = scrumSource();
      const featureEntryPattern = new RegExp(
        `@decaf-ts/for-angular/(?:${NON_SCRUM_FEATURE_DIRECTORIES.join('|')})`
      );
      expect(source).not.toMatch(featureEntryPattern);
    });

    it('imports no @angular/cdk code directly', () => {
      const cdkImports = externalSpecifiersOf(scrumSource()).filter(
        (specifier) =>
          specifier === '@angular/cdk' || specifier.startsWith('@angular/cdk/')
      );
      expect(cdkImports).toEqual([]);
      expect(scrumSource()).not.toMatch(/@angular\/cdk/);
    });

    it('composes Kanban without defining or re-exporting its components', () => {
      const source = scrumSource();

      expect(source).toMatch(
        /import\s*\{[^}]*KanbanBoardComponent[^}]*\}\s*from\s*'@decaf-ts\/for-angular\/kanban'/
      );
      expect(source).not.toMatch(
        /class\s+Kanban(?:Board|Card|Column)Component\b/
      );
      expect(source).not.toMatch(
        /export\s*\{[^}]*\bKanban(?:Board|Card|Column)Component\b/
      );
    });

    it('ships ./scrum with its README, declarations, and no new peer or dependency', () => {
      const exportsMap = packedPackageJson['exports'] as Record<string, unknown>;
      const peers = (packedPackageJson['peerDependencies'] ?? {}) as Record<
        string,
        string
      >;
      const dependencies = (packedPackageJson['dependencies'] ?? {}) as Record<
        string,
        string
      >;

      expect(exportsMap['./scrum']).toBeTruthy();
      expect(
        fs.existsSync(path.join(extractRoot, 'scrum', 'README.md'))
      ).toBe(true);
      expect(
        fs.existsSync(
          path.join(extractRoot, 'types', 'decaf-ts-for-angular-scrum.d.ts')
        )
      ).toBe(true);

      // `/scrum` adds no dependency and no peer of its own: every external
      // package it imports is already covered by the shared manifest, and the
      // cross-feature `/kanban` subpath resolves inside this same package.
      for (const specifier of externalSpecifiersOf(scrumSource())) {
        const packageName = packageOf(specifier);
        if (packageName === '@decaf-ts/for-angular') {
          expect(peers['@decaf-ts/for-angular']).toBeUndefined();
          expect(dependencies['@decaf-ts/for-angular']).toBeUndefined();
          continue;
        }
        expect(peers[packageName]).toBeTruthy();
      }
      expect(peers['scrum']).toBeUndefined();
      expect(dependencies['scrum']).toBeUndefined();
      expect(dependencies['@decaf-ts/for-angular/scrum']).toBeUndefined();
    });

    it('keeps scrum code out of the root FESM', () => {
      const rootSource = fs.readFileSync(
        path.join(extractRoot, 'fesm2022', fesmFileOf('.')),
        'utf8'
      );
      expect(rootSource).not.toMatch(
        /@decaf-ts\/for-angular\/scrum|decaf-scrum-|BacklogComponent|SprintBoardComponent|SprintSelectorComponent|SCRUM_BACKLOG_COLUMN_ID|scrumSprintIdOf|ScrumConfig/
      );
    });
  });
});
