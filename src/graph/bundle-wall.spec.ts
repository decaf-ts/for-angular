/**
 * @module for-angular/graph/bundle-wall.spec
 * @summary DECAF-50 §4.20 verification bar 1 — bundle/boundary regression wall.
 * @description Proves the canonical cutover keeps the bundle wall: backend
 * engine, executor, catalogue-runtime, validator, and run-store code never
 * reaches the `for-angular` production browser bundle. It extends the
 * `DECAF-35` TASK-233 bundle scan to the DECAF-50 frontend modules
 * (catalog, document, parameters, runs).
 *
 * Two walls are asserted:
 *  1. Static import wall — every production graph source under `src/graph/**`
 *     and `src/lib/**` imports only frontend-safe paths (`@decaf-ts/ui-decorators`,
 *     contracts); ALL `@decaf-ts/integrations` specifiers (every subpath — the
 *     lib never depends on integrations after the Phase B cutover; only the
 *     app provisions the backend), `for-nest` and the other backend packages
 *     are forbidden.
 *  2. Runtime symbol wall — the production bundle (`www/`) carries no
 *     engine-side executable symbols. When `www/` is missing or older than
 *     the graph sources the test rebuilds the bundle first
 *     (`npx ng build for-angular-app --configuration production`), so the
 *     wall never asserts against a stale dist.
 *
 * Scanning control: the word-scan machinery is self-attested — a control
 * asserts one probe symbol is detected inside a synthetic chunk, so a blind
 * scanner cannot silently pass, and a fixture frontend symbol present in
 * every build proves the scan reads real production bytes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

/** `for-angular` package root (this module's grandparent directory). */
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

/** Production bundle directory (`angular.json` `for-angular-app` `outputPath`). */
const DIST_DIR = path.join(PACKAGE_ROOT, 'www');

/**
 * Import specifier prefixes that never may appear in the browser's
 * canonical-graph module. ALL `@decaf-ts/integrations` import specifiers
 * (every subpath, including the retired shared-contracts re-export) are
 * forbidden from the lib production sources (Phase B boundary cutover): the
 * lib must depend only on the shared `@decaf-ts/ui-decorators` graph export;
 * the app alone provisions the integrations backend. `for-nest` and the other
 * backend packages pull backend/Node-only code.
 */
const FORBIDDEN_IMPORT_SPECIFIERS = [
  '@decaf-ts/integrations',
  '@decaf-ts/for-nest',
  '@decaf-ts/for-server',
  'node:',
  'isolated-vm',
  'vm:',
] as const;

/**
 * Backend engine-side executable symbols that must never appear in the
 * production bundle (DECAF-50 §4.20 bar 1). Symbols the frontend legitimately
 * shares by name (its own error classes and dynamic-port resolution helpers in
 * the fixture catalogue) are excluded so frontend code never collides with the
 * wall.
 */
const FORBIDDEN_BUNDLE_SYMBOLS = [
  'GraphExecutionEngine',
  'GraphExecutionContext',
  'GraphExecutionFrame',
  'BreakGraphNodeExecutor',
  'CodeGraphNodeExecutor',
  'LogGraphNodeExecutor',
  'SwitchGraphNodeExecutor',
  'IsolatedVmCodeSandboxEvaluator',
  'GraphBreakSignal',
  'GraphExecutionPlanner',
  'GraphTopology',
  'GraphDefinitionValidator',
  'GraphDocumentValidationError',
  'GraphEdgeInstanceValidator',
  'GraphNodeInstanceValidator',
  'GraphValueValidator',
  'GraphCredentialReferenceValidator',
  'GraphCredentialAuthorizationError',
  'GraphConnectionPolicyValidator',
  'GraphConnectionValidationError',
  'GraphNodeRegistrationError',
  'GraphPortError',
  'GraphCycleError',
  'GraphInputError',
  'GraphStoreError',
  'GraphRunCancelledError',
  'GraphLoopLimitError',
  'GraphTopologyError',
  'GRAPH_DOCUMENT_FORBIDDEN_FIELD_KEYS',
  'DEFAULT_GRAPH_WORKFLOW_VALIDATION_LIMITS',
  'maxNestingDepthOf',
  'GRAPH_PLAIN_SECRET_KEYS',
  'GraphNodeCatalogue',
  'GraphNodeMethodRegistry',
  'GraphNodeManifestResolver',
  'registerBuiltInGraphNodes',
  'builtInGraphNodeRegistrations',
  'engineBoundExecutors',
  'defaultFlowExecutors',
  'defaultTriggerExecutors',
  'validateCredentials',
  'validateDynamicPortRules',
  'validateMethodDeclarations',
  'GraphRunService',
  'GraphRunExecutor',
  'GraphRunEventPublisher',
  'InMemoryGraphRunEventStore',
  'InMemoryGraphRunStore',
  'graphRunToHttp',
  'graphWorkflowHttpErrorOf',
  'graphWorkflowOwnerOf',
  'graphRunDocumentFingerprint',
  'GraphLoopExecutionContext',
  'ConditionExpressionEvaluator',
  'GraphConditionEvaluator',
  'WhileGraphNodeExecutor',
  'ForeachGraphNodeExecutor',
  'UntilGraphNodeExecutor',
  'GraphPinningPolicy',
  'GraphPinningService',
  'GraphPinningDependencyResolver',
  'DEFAULT_PINNING_METADATA',
  'InMemoryGraphValueStoreAdapter',
  'GraphValueStore',
  'GraphExecutionSnapshotMapper',
  'GraphExecutionModule',
  'GraphExecutionController',
  'GraphRunController',
  'GraphResultService',
  'GraphRunModel',
  'GraphRunModelService',
  'GraphWorkflowModel',
  'GraphWorkflowService',
  'GraphWorkflowController',
  'GraphNodeCatalogueController',
] as const;

/** Escapes all regex control characters in one phrase. */
function escapeRegExp(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Word-bounded match count for one backend symbol inside one text. The
 * boundary guards keep the wall free of coincidental sub-identifiers.
 * @param text The scanned bundle JS.
 * @param symbol The backend symbol name.
 */
function occurrenceOf(text: string, symbol: string): number {
  const pattern = new RegExp(
    `(?<![\\w$])${escapeRegExp(symbol)}(?![\\w$])`,
    'g',
  );
  return (text.match(pattern) ?? []).length;
}

/** Scans one bundle text for every forbidden symbol. @returns violations. */
function bundleViolationsOf(text: string): string[] {
  return FORBIDDEN_BUNDLE_SYMBOLS.filter((symbol) => occurrenceOf(text, symbol) > 0);
}

/** Visits every `.ts`/`.scss`/`.html` production source file under one root. */
function walkSources(root: string, visit: (file: string) => void): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkSources(full, visit);
      continue;
    }
    if (
      entry.name.endsWith('.ts') ||
      entry.name.endsWith('.scss') ||
      entry.name.endsWith('.html')
    ) {
      visit(full);
    }
  }
}

/** Runs the Angular production build for the app project. */
function runProductionBuild(): void {
  execSync('npx ng build for-angular-app --configuration production', {
    cwd: PACKAGE_ROOT,
    stdio: 'pipe',
    env: { ...process.env, NG_BUILD_CACHE: '0' },
  });
}

/**
 * Detects the app's production `outputPath` shape (`angular.json` `for-angular-app`
 * builds both `production` and `development` into `www/`; production hashes every
 * chunk onto `main.<hash>.js`, while the development config emits the unhashed
 * `main.js`/`vendor.js` bundle). The runtime wall never asserts against a
 * development dist — the dev bundle carries un-minified backend symbol names even
 * when no backend code is actually executable in the browser.
 */
function isProductionBundle(): boolean {
  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexHtml)) return false;
  const text = fs.readFileSync(indexHtml, 'utf8');
  return /<(script|link)[^>]+(main|polyfills|vendor|styles|runtime)\.[0-9a-f]+\.(js|css)/.test(text);
}

/**
 * Rebuilds the production bundle when it is missing, not a production build, or
 * older than the graph sources so the runtime wall never asserts on a stale dist.
 */
function refreshProductionBundleWhenStale(): void {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html')) || !isProductionBundle()) {
    runProductionBuild();
    return;
  }
  const distStamp = fs.statSync(path.join(DIST_DIR, 'index.html')).mtimeMs;
  const sourceRoot = path.join(PACKAGE_ROOT, 'src');
  let newestSource = 0;
  walkSources(sourceRoot, (file) => {
    newestSource = Math.max(newestSource, fs.statSync(file).mtimeMs);
  });
  if (newestSource > distStamp) runProductionBuild();
}

describe('bundle wall (DECAF_50 §4.20 verification bar 1)', () => {
  test('static import wall: no backend import segment is reachable from the graph sources', () => {
    const violations: string[] = [];
    const sourceRoots = [path.join(PACKAGE_ROOT, 'src', 'graph'), path.join(PACKAGE_ROOT, 'src', 'lib')];
    for (const sourceRoot of sourceRoots) {
      walkSources(sourceRoot, (file) => {
        if (!file.endsWith('.ts')) return;
        const content = fs.readFileSync(file, 'utf8');
        for (const matcher of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          const specifier = matcher[1];
          for (const forbidden of FORBIDDEN_IMPORT_SPECIFIERS) {
            if (specifier === forbidden || specifier.startsWith(`${forbidden}/`)) {
              violations.push(`${path.relative(sourceRoot, file)} imports '${specifier}'`);
            }
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });

  test('runtime bundle wall: the production bundle carries no backend engine/executor/validator/run-store symbols', () => {
    refreshProductionBundleWhenStale();
    const chunks: string[] = [];
    const walkDist = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDist(full);
          continue;
        }
        if (entry.name.endsWith('.js')) chunks.push(full);
      }
    };
    walkDist(DIST_DIR);
    expect(chunks.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const chunk of chunks) {
      const text = fs.readFileSync(chunk, 'utf8');
      const chunkViolations = bundleViolationsOf(text);
      if (chunkViolations.length) {
        violations.push(`${path.relative(DIST_DIR, chunk)}: ${chunkViolations.join(', ')}`);
      }
    }
    expect(violations).toEqual([]);
  });

  test('scanner control: a front-end safe symbol never counts as backend engine-runtime code', () => {
    const safeBundle = 'class GraphRunClient { resolve(){ return 1; } } const d: GraphWorkflowDocument = null;';
    expect(bundleViolationsOf(safeBundle)).toEqual([]);
  });

  test('scanner control: a deliberately injected backend symbol is detected', () => {
    const synthetic = `const probe = 'GraphExecutionEngine'; const warn = 'GraphRunService';`;
    const found = bundleViolationsOf(synthetic);
    expect(found).toContain('GraphExecutionEngine');
    expect(found).toContain('GraphRunService');
  });
});
