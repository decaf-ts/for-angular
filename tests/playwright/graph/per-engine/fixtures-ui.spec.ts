import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';

/**
 * Per-engine for-angular UI validation (SAA-729, gap from SAA-724 deliverable 1).
 *
 * Unlike every other spec under `tests/playwright/graph` — which route-mock the
 * run lifecycle — this lane drives the *real* Angular app against a *real*
 * seeded as-graph backend, for one engine driver per run (selected by
 * `GRAPH_BACKEND_ENGINE`; the runner boots the matching seeded host). It asserts
 * through the UI, never `page.route`, that for the active driver:
 *   1. every fixture in the registry set is listed at `/workflows` (list),
 *   2. every fixture opens to its detail canvas (show),
 *   3. every fixture runs/replays with each node's inputs/outputs visible (replay + I-O),
 *   4. a workflow row and a direct deep link both open `/workflows/<id>` on the selected engine (route),
 *   5. a failed run surfaces the failure banner + a failed node (failure, SAA-1361 D8).
 *
 * Before the fixture matrix, the lane certifies the Run affordances: step 0
 * checks the served manifest/catalogue and the per-workflow `runnable` gate
 * (SAA-1359 D5), step 0b drives a runnable deployment job end to end, and step 0c
 * proves a route with no `runAllowed` input keeps Run enabled while an explicit
 * `?runAllowed=false` disables it (SAA-1425).
 *
 * The expected fixture set — and each fixture's terminal node(s) and expected
 * terminal state — is *derived* from the as-graph registry export (compiled to
 * CJS by the engine driver's build; see `resolveRegistryPath`) — never
 * hand-written — so a registry change flows straight into these assertions. The
 * UI stays engine-agnostic: this spec never branches on the engine id, it only
 * reads the served capability manifest + catalogue and drives whatever the
 * driver serves.
 *
 * CTO D1 compliance (SAA-779): the terminal check waits on the fixture's own
 * terminal node(s) within a >= 120s per-fixture budget and asserts the
 * registry-implied per-fixture terminal, not a universal `succeeded` on the
 * first node to turn green.
 */

const requireCjs = createRequire(__filename);

const AS_GRAPH_ROOT = process.env['AS_GRAPH_ROOT'] ?? resolve(__dirname, '../../../../../as-graph');

/**
 * Resolve the compiled as-graph fixture registry module.
 *
 * The registry source lives in as-graph — historically `tests/fixtures/workflows`
 * (compiled by the `fixtures-host` helper), now `src/workflows` after the SAA-774
 * structural redress — and is compiled to CJS by the engine driver's build.
 * `FIXTURE_REGISTRY` always wins so the lane can be pinned to an explicit build;
 * otherwise we probe the known compiled locations and fail loudly with the
 * candidates tried rather than crashing on an opaque `MODULE_NOT_FOUND`.
 */
function resolveRegistryPath(): string {
  const explicit = process.env['FIXTURE_REGISTRY'];
  if (explicit) return explicit;

  const candidates = [
    join(AS_GRAPH_ROOT, 'tests', 'helpers', 'fixtures-host', 'lib', 'tests', 'fixtures', 'workflows', 'index.js'),
    join(AS_GRAPH_ROOT, 'lib', 'cjs', 'workflows', 'index.cjs'),
    join(AS_GRAPH_ROOT, 'lib', 'cjs', 'tests', 'fixtures', 'workflows', 'index.cjs'),
    join(AS_GRAPH_ROOT, 'dist', 'fixtures', 'workflows', 'index.cjs'),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `No compiled as-graph fixture registry found. Set FIXTURE_REGISTRY. Tried:\n  ${candidates.join('\n  ')}`
    );
  }
  return found;
}

const REGISTRY_PATH = resolveRegistryPath();

interface GraphWorkflowEdge {
  id?: string;
  source?: { scope?: string; nodeId?: string; port?: string };
  target?: { scope?: string; nodeId?: string; port?: string };
}

interface GraphWorkflowFixture {
  id: string;
  document: {
    id: string;
    name?: string;
    inputs?: Array<{ id: string }>;
    outputs?: Array<{ id: string }>;
    nodes?: Array<{ id: string }>;
    edges?: GraphWorkflowEdge[];
  };
  inputs?: Record<string, unknown>;
  /** Partial expected workflow outputs — the registry's per-fixture terminal. */
  expectedOutputs?: Record<string, unknown>;
  /** Whether the real engine can execute the fixture end to end. */
  executable?: boolean;
  /** Why a non-executable fixture cannot run (production gap). */
  skipReason?: string;
}

const registry = requireCjs(REGISTRY_PATH) as {
  graphWorkflowFixtures: GraphWorkflowFixture[];
};

const FIXTURES = registry.graphWorkflowFixtures;
const FIXTURE_IDS = FIXTURES.map((fixture) => fixture.id).sort();

const ENGINE = process.env['GRAPH_BACKEND_ENGINE'] ?? 'local';
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:8110';
const BACKEND_URL = process.env['GRAPH_BACKEND_URL'] ?? 'http://localhost:3000';

/**
 * Deployment jobs an engine serves in addition to the registry fixture set
 * (D9 #2). The fixture registry only knows the fixtures this lane drives; a
 * real deployment legitimately exposes its own jobs too. Dagster's example
 * deployment always serves `__ASSET_JOB`, `asset_pipeline`, and `etl_pipeline`,
 * so the catalogue assertion allows exactly those extras for dagster while
 * local/mastra keep the previous exact-equality contract (no engine may grow
 * unexpected rows silently).
 */
const DEPLOYMENT_JOBS_BY_ENGINE: Record<string, readonly string[]> = {
  dagster: ['__ASSET_JOB', 'asset_pipeline', 'etl_pipeline'],
};

const ALLOWED_DEPLOYMENT_JOBS = DEPLOYMENT_JOBS_BY_ENGINE[ENGINE] ?? [];

/**
 * Whether the booted dagster driver was started with run execution enabled
 * (`DAGSTER_EXECUTION_ENABLED=true`). Deployment jobs become runnable only when
 * the driver both enables execution and has a live client; seeded fixtures stay
 * non-runnable either way (SAA-1359 D5).
 */
const DAGSTER_EXECUTION_ENABLED = process.env['DAGSTER_EXECUTION_ENABLED'] === 'true';

/**
 * The app's own English labels for the row Run action. Read from the shipped
 * translation bundle instead of hardcoding copy, so the gate assertion tracks the
 * product's accessible name.
 */
const EN_WORKFLOW_LABELS = (
  JSON.parse(readFileSync(join(__dirname, '../../../../src/assets/i18n/en.json'), 'utf8')) as {
    graph: {
      workflows: { run: string; runBlocked: string; runBlockedReadOnly: string };
    };
  }
).graph.workflows;

/** One row of the engine's served workflow catalogue. */
interface CatalogueRow {
  workflowId: string;
  /** Present on engines implementing the per-workflow run gate (SAA-1359 D5). */
  runnable?: boolean;
}

/** Reads the engine catalogue the booted driver serves. */
async function fetchCatalogue(request: APIRequestContext): Promise<CatalogueRow[]> {
  const response = await request.get(`${BACKEND_URL}/graph/engines/${ENGINE}/workflows`);
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as CatalogueRow[];
}

/** Served catalogue rows that are not registry fixtures and are not allowed jobs. */
function unexpectedCatalogueRows(served: string[]): string[] {
  return served.filter((row) => !FIXTURE_IDS.includes(row) && !ALLOWED_DEPLOYMENT_JOBS.includes(row));
}

const REPORT_PATH = process.env['PER_ENGINE_REPORT'] ?? join(__dirname, '.reports', `${ENGINE}.json`);

const CONSOLE_PATH = join(__dirname, '.reports', `console-${ENGINE}.json`);

/**
 * Per-fixture terminal budget (CTO D1): >= 120s. `fixture-value-templates`
 * reaches a terminal only after 60s, so the previous hard-coded 60s budget
 * scored a real success as a timeout.
 */
const TERMINAL_BUDGET_MS = 120_000;

/** Console strings that must NOT appear on the populated /workflows path (SAA-753). */
const FORBIDDEN_CONSOLE = [
  'No Id property defined for model GraphWorkflowListModel',
  'No data and source passed to infinite list',
];

type Action = 'list' | 'show' | 'replay' | 'i-o' | 'route' | 'failure' | 'deployment';
/**
 * Per-action verdict. `skip` is a first-class outcome (D9 #3): an action that
 * could not be evaluated because its run legitimately failed as expected, or
 * because a prerequisite never reached a state worth inspecting, is *not* a
 * product failure and must not be reported as one.
 */
type OutcomeStatus = 'pass' | 'fail' | 'skip';
type Outcome = {
  engine: string;
  fixture: string;
  action: Action;
  status: OutcomeStatus;
  /** Kept for report consumers that predate `status`; true only for `pass`. */
  pass: boolean;
  detail?: string;
};

const outcomes: Outcome[] = [];

function record(fixture: string, action: Action, status: OutcomeStatus, detail?: string): void {
  outcomes.push({ engine: ENGINE, fixture, action, status, pass: status === 'pass', detail });
}

function writeReport(): void {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  // Merge rather than overwrite: Playwright restarts the worker after a test
  // failure, and each worker's afterAll would otherwise clobber the rows an
  // earlier worker already recorded. Key by engine|fixture|action.
  let existing: Outcome[] = [];
  try {
    existing = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as Outcome[];
  } catch {
    existing = [];
  }
  const merged = new Map(existing.map((row) => [`${row.engine}|${row.fixture}|${row.action}`, row]));
  for (const row of outcomes) merged.set(`${row.engine}|${row.fixture}|${row.action}`, row);
  writeFileSync(REPORT_PATH, JSON.stringify([...merged.values()], null, 2));
}

test.afterAll(() => {
  writeReport();
});

/** Served summary name is the document name when present, else the id. */
function fixtureName(fixture: GraphWorkflowFixture): string {
  return fixture.document.name ?? fixture.document.id ?? fixture.id;
}

/** Member node ids the detail canvas must project for a fixture document. */
function fixtureNodeIds(fixture: GraphWorkflowFixture): string[] {
  return (fixture.document.nodes ?? []).map((node) => node.id);
}

/** Navigates to a fixture's detail canvas through the real catalogue. */
async function openCanvas(page: Page, fixture: GraphWorkflowFixture): Promise<void> {
  await page.goto(`${FRONTEND_URL}/graph/read/${encodeURIComponent(fixture.id)}?engine=${encodeURIComponent(ENGINE)}`);
  await page.locator('.ng-diagram-node').first().waitFor({ state: 'visible', timeout: 30_000 });
}

/**
 * The `/workflows` row button for one fixture. The row body is the button
 * (SAA-1361 requirement 4), so its accessible text carries the workflow name
 * the fixture serves — never a per-engine branch.
 */
function workflowRowButton(page: Page, fixture: GraphWorkflowFixture): Locator {
  return page
    .locator('.graph-workflow-item__open')
    .filter({ hasText: fixtureName(fixture) })
    .first();
}

/**
 * Asserts the app is on `/workflows/<workflowId>` with the active engine still
 * selected. A bare `/` (the pre-SAA-1361 fallback) or a missing `engine` query
 * param fails here.
 */
async function expectWorkflowUrl(page: Page, workflowId: string): Promise<void> {
  await expect
    .poll(
      () => {
        const url = new URL(page.url());
        return `${url.pathname}?engine=${url.searchParams.get('engine') ?? ''}`;
      },
      { timeout: 30_000, message: `URL should be /workflows/${workflowId}?engine=${ENGINE}` }
    )
    .toBe(`/workflows/${workflowId}?engine=${ENGINE}`);
}

/**
 * Asserts the workflow detail canvas is rendered: at least one diagram node, the
 * workflow-inputs panel (Start control's sibling surface), and the Start control
 * itself. Used by both the row-click and the direct-deep-link legs so the two
 * entry points prove the same editor surface.
 */
async function expectWorkflowCanvas(page: Page): Promise<void> {
  await page.locator('.ng-diagram-node').first().waitFor({ state: 'visible', timeout: 30_000 });
  await expect(page.locator('#graph-inputs-body')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('button.graph-float-btn--run')).toBeVisible({ timeout: 15_000 });
}

function resolvePath(values: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, values);
}

/**
 * Fills the workflow-input form from the fixture's declared `inputs`, best
 * effort, and reports which declared keys the form actually exposed.
 *
 * The run form currently renders generic `count`/`text` fields instead of the
 * document's declared input ports (tracked as the for-angular gap SAA-720), so
 * for every input-dependent fixture `applied` stays empty. Once that surface
 * exists this function drives it without further change; until then the caller
 * records the gap so a failing input-dependent fixture is attributed correctly
 * rather than silently treated as an engine failure.
 */
async function fillInputs(
  page: Page,
  fixture: GraphWorkflowFixture
): Promise<{ declared: string[]; applied: string[] }> {
  const values = fixture.inputs ?? {};
  const declared = Object.keys(values);
  const applied: string[] = [];
  if (!declared.length) return { declared, applied };

  const fields = page.locator('.graph-renderer__field');
  const count = await fields.count();
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index);
    const meta =
      (await field
        .locator('.graph-renderer__field-meta')
        .innerText()
        .catch(() => '')) || '';
    const path = meta.split('·')[0]?.trim() ?? '';
    const key = declared.find((candidate) => path === candidate || path.startsWith(`${candidate}.`));
    if (!key) continue;

    const value = path.includes('.') ? resolvePath(values, path) : values[key];
    if (value === undefined) continue;

    const checkbox = field.locator('input[type="checkbox"]');
    if (await checkbox.count()) {
      if (Boolean(value)) await checkbox.check();
      else await checkbox.uncheck();
      applied.push(key);
      continue;
    }
    const control = field.locator('input, textarea').first();
    if (!(await control.count())) continue;
    const serialized = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
    await control.fill(serialized);
    applied.push(key);
  }
  return { declared, applied };
}

/**
 * Registry-implied expected terminal state for a fixture (CTO D1). Derived from
 * the fixture's own registry entry, never a universal constant: an executable
 * fixture that declares `expectedOutputs` must reach a successful terminal,
 * while a fixture the registry marks non-executable (with a `skipReason`) must
 * not. This is what lets the lane assert the *per-fixture* terminal instead of
 * a blanket `terminal === 'succeeded'`.
 */
function expectedTerminal(fixture: GraphWorkflowFixture): 'succeeded' | 'failed' {
  if (fixture.executable === false || fixture.skipReason) return 'failed';
  return 'succeeded';
}

/**
 * The fixture's terminal node(s): nodes whose output feeds a workflow output
 * port the registry expects (`expectedOutputs` keys), falling back to every
 * declared workflow output port, then to nodes with no outgoing node edge.
 *
 * Waiting on these — never on "the first node to turn green" — is what makes
 * the terminal check truthful for multi-terminal fixtures such as
 * `fixture-loops-while-until`, where `whileLoop` succeeds before `untilLoop`.
 */
function terminalNodeIds(fixture: GraphWorkflowFixture): string[] {
  const edges = fixture.document.edges ?? [];
  const outputs = fixture.document.outputs ?? [];
  const expectedPorts = fixture.expectedOutputs ? Object.keys(fixture.expectedOutputs) : [];
  const targetPorts = expectedPorts.length ? expectedPorts : outputs.map((port) => port.id);

  const terminal = new Set<string>();
  for (const edge of edges) {
    const source = edge.source;
    const target = edge.target;
    if (
      target?.scope === 'workflow' &&
      source?.scope === 'node' &&
      source.nodeId &&
      (!target.port || targetPorts.includes(target.port))
    ) {
      terminal.add(source.nodeId);
    }
  }
  if (terminal.size) return [...terminal];

  const hasOutgoing = new Set(
    edges
      .filter((edge) => edge.source?.scope === 'node' && edge.source.nodeId)
      .map((edge) => edge.source?.nodeId as string)
  );
  return (fixture.document.nodes ?? []).map((node) => node.id).filter((id) => !hasOutgoing.has(id));
}

/** Visual status states the node/badge templates project as CSS classes. */
type NodeVisualState = 'succeeded' | 'failed' | 'skipped' | 'running' | 'pending';

/** Status-class selector for one node's rendered element (node or badge). */
function nodeStateSelector(nodeId: string, state: NodeVisualState): string {
  if (state === 'pending') return `[data-node-id="${nodeId}"]`;
  return `[data-node-id="${nodeId}"] article.graph-node--${state}, [data-node-id="${nodeId}"] article.graph-badge--${state}`;
}

/** Reads the rendered visual state of one member node/badge. */
async function nodeVisualState(page: Page, nodeId: string): Promise<NodeVisualState> {
  for (const state of ['succeeded', 'failed', 'skipped', 'running'] as const) {
    if (await page.locator(nodeStateSelector(nodeId, state)).count()) return state;
  }
  return 'pending';
}

/**
 * Evidence string for the fixture's terminal nodes at the moment the run is
 * classified, so a failure records *why* rather than a bare `timeout`.
 */
async function terminalStateEvidence(page: Page, terminals: string[]): Promise<string> {
  if (!terminals.length) return 'no terminal nodes';
  const states = await Promise.all(terminals.map((nodeId) => nodeVisualState(page, nodeId)));
  return terminals.map((nodeId, index) => `${nodeId}=${states[index]}`).join(', ');
}

/**
 * Run-level failure banner rendered by F1/SAA-1361 (`runFailed`/`runError` on
 * the graph renderer). Verified in the working tree before wiring — this
 * selector is not inferred. The `skipped`-terminal fallback below keeps the
 * harness truthful on a tree where F1 has not landed yet.
 */
const RUN_FAILURE_SELECTOR = '.graph-renderer__run-failure';

/**
 * The run-level failure text the current UI exposes, if any. Prefers F1's
 * failed-run banner; falls back to error/lifecycle lines the existing run
 * console carries. Returns an empty string when neither surface has text.
 */
async function runLevelErrorText(page: Page): Promise<string> {
  const banner = await page
    .locator(RUN_FAILURE_SELECTOR)
    .allInnerTexts()
    .catch(() => [] as string[]);
  const bannerText = banner.join(' ').replace(/\s+/g, ' ').trim();
  if (bannerText) return bannerText.slice(0, 300);

  const lines = await page
    .locator('.graph-logs__message')
    .allInnerTexts()
    .catch(() => [] as string[]);
  const candidates = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => /\b(fail|failed|failure|error|cancel)/i.test(line));
  return candidates.join(' | ').slice(0, 300);
}

/**
 * Waits for the fixture's terminal node(s) to resolve, within the D1 >= 120s
 * per-fixture budget. A run is terminal when:
 *   - the run-level failure banner appears (F1/SAA-1361), or
 *   - any node has failed, or
 *   - every one of the fixture's terminal nodes has succeeded, or
 *   - every one of the fixture's terminal nodes is `skipped` with none
 *     succeeded (pre-F1 fallback, D9 #1).
 *
 * The last two failure cases are the run-level `workflow.failed` signature: no
 * node itself failed, and the execution-state mapper marks every unexecuted
 * element `skipped` when the workflow fails. `skipped` is only assigned after a
 * terminal decision, so an all-terminal-skipped fixture is a failed run — not
 * an unfinished one — and returns promptly instead of consuming the 120s
 * budget. A fixture whose terminal mix is still working keeps waiting.
 */
async function waitForTerminal(
  page: Page,
  fixture: GraphWorkflowFixture,
  timeoutMs = TERMINAL_BUDGET_MS
): Promise<'succeeded' | 'failed' | 'timeout'> {
  const terminals = terminalNodeIds(fixture);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.locator(RUN_FAILURE_SELECTOR).count()) return 'failed';
    if (await page.locator('article.graph-node--failed, article.graph-badge--failed').count()) {
      return 'failed';
    }
    if (terminals.length) {
      const states = await Promise.all(terminals.map((nodeId) => nodeVisualState(page, nodeId)));
      if (states.every((state) => state === 'succeeded')) return 'succeeded';
      if (states.every((state) => state === 'skipped')) return 'failed';
    } else if (await page.locator('article.graph-node--succeeded, article.graph-badge--succeeded').count()) {
      return 'succeeded';
    }
    await page.waitForTimeout(250);
  }
  return 'timeout';
}

/**
 * Waits for a deployment job (not a registry fixture) to reach a terminal state.
 *
 * Deployment jobs have no registry document to derive terminal nodes from, so
 * this uses the generic node/badge state projection: fail on the failure banner
 * or any failed node, succeed once at least one node succeeded and no node is
 * still running. Pending nodes are ignored because a deployment's asset graph
 * may not project every asset.
 */
async function waitForDeploymentTerminal(
  page: Page,
  timeoutMs = TERMINAL_BUDGET_MS,
  run?: { request: APIRequestContext; runId: string }
): Promise<'succeeded' | 'failed' | 'timeout'> {
  const deadline = Date.now() + timeoutMs;
  let nextApiPoll = 0;
  while (Date.now() < deadline) {
    // The deployment document's `dagster.op` nodes are a projection the editor
    // does not colour, so the run's authoritative terminal comes from the run
    // API; the visual checks below remain for documents the canvas does render.
    if (run && Date.now() >= nextApiPoll) {
      nextApiPoll = Date.now() + 1000;
      const fetched = await run.request.get(`${BACKEND_URL}/graph/runs/${run.runId}`);
      if (fetched.ok()) {
        const status = ((await fetched.json()) as { status?: string }).status;
        if (status === 'succeeded') return 'succeeded';
        if (status === 'failed' || status === 'cancelled') return 'failed';
      }
    }
    if (await page.locator(RUN_FAILURE_SELECTOR).count()) return 'failed';
    if (await page.locator('article.graph-node--failed, article.graph-badge--failed').count()) {
      return 'failed';
    }
    const running = await page.locator('article.graph-node--running, article.graph-badge--running').count();
    if (!running) {
      const succeeded = await page.locator('article.graph-node--succeeded, article.graph-badge--succeeded').count();
      if (succeeded) return 'succeeded';
    }
    await page.waitForTimeout(250);
  }
  return 'timeout';
}

/**
 * Polls the Run button until it is enabled, within a bounded wait. A backend
 * that cannot execute the workflow (for example the dagster runnable gate)
 * leaves the button disabled; returning `false` after the budget lets the
 * caller record that as "run not started" evidence instead of letting a
 * Playwright action timeout produce an opaque stack.
 */
async function waitForRunEnabled(page: Page, timeoutMs = 30_000): Promise<boolean> {
  const run = page.locator('button.graph-float-btn--run');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await run.count()) && (await run.isEnabled().catch(() => false))) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

/** Polls for the split view's RUN INPUTS + RUN OUTPUTS panes on the open node. */
async function inspectionExposesRunPanes(page: Page): Promise<boolean> {
  // The I/O panes hydrate asynchronously after the inspection panel mounts —
  // for the slow fixtures, well after the terminal node turns green. Poll for
  // the titles rather than reading once, or the row is flaky.
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const titles: Locator = page.locator('.graph-io__title');
    const texts = await titles.allInnerTexts().catch(() => [] as string[]);
    const hasInputs = texts.some((text) => /input/i.test(text));
    const hasOutputs = texts.some((text) => /output/i.test(text));
    if (hasInputs && hasOutputs) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

/**
 * Opens a node's split view after the run and reports whether it exposes the
 * RUN INPUTS + RUN OUTPUTS panes.
 *
 * Member nodes render as `article.graph-node`; boundary-only fixtures render
 * none and project their members as `article.graph-badge` instead (e.g.
 * `fixture-boundary-value`, whose `value`/`result` nodes are badges and whose
 * workflow-output boundary `output-out` is a badge with no run payload). So
 * prefer the `article.graph-node` list and fall back to `article.graph-badge`,
 * mirroring the selector list used by the shared `openNodeEditor` helper. The
 * first candidate is not guaranteed to carry a run payload, so try each until
 * one actually surfaces the run I/O panes.
 */
async function openFirstNodeIo(page: Page): Promise<boolean> {
  const nodeTargets = page.locator('article.graph-node');
  const targets = (await nodeTargets.count()) ? nodeTargets : page.locator('article.graph-badge');
  const count = await targets.count();

  for (let index = 0; index < count; index += 1) {
    const target = targets.nth(index);
    // The diagram intercepts synthetic pointer events, so a Playwright `.dblclick()`
    // does not open the inspection; dispatch the bubbling dblclick directly on the
    // node/badge article, the same way the shared `openNodeEditor` helper does.
    await target.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    });
    const inspection = page.locator('.graph-node-inspection');
    await inspection
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => undefined);
    if (!(await inspection.count())) continue;
    if (await inspectionExposesRunPanes(page)) return true;
    // A candidate without a run payload (or whose payload has not hydrated)
    // renders the empty/CRUD view instead of the panes; try the next one.
  }
  return false;
}

test.describe(`per-engine UI fixture validation — ${ENGINE}`, () => {
  // Deliberately NOT `mode: 'serial'`: a failing step must not skip the later
  // steps, or the required fixture x {list,show,replay,i-o} matrix comes back
  // empty when one step breaks. The config pins `workers: 1`, so the steps still
  // run in declaration order.

  test('0. the booted driver serves the registry fixture set (manifest + catalogue)', async ({ request }) => {
    const manifest = await request.get(`${BACKEND_URL}/graph/engines`);
    expect(manifest.ok(), await manifest.text()).toBeTruthy();
    const body = (await manifest.json()) as {
      engines: Array<{ engineId: string }>;
      defaultEngineId: string;
    };
    expect(body.defaultEngineId).toBe(ENGINE);
    expect(body.engines.map((engine) => engine.engineId)).toContain(ENGINE);

    const catalogue = await request.get(`${BACKEND_URL}/graph/engines/${ENGINE}/workflows`);
    expect(catalogue.ok(), await catalogue.text()).toBeTruthy();
    const rows = (await catalogue.json()) as CatalogueRow[];
    const served = rows.map((row) => row.workflowId).sort();

    // D9 #2: the fixture set must be a subset of what the engine serves. A
    // deployment may add its own known jobs (dagster's example deployment adds
    // three); anything outside both sets is still a hard failure. Engines with
    // no allowed extras keep the original exact-equality contract.
    const missing = FIXTURE_IDS.filter((id) => !served.includes(id));
    expect(missing, `catalogue serves every registry fixture; missing: ${JSON.stringify(missing)}`).toEqual([]);
    const unexpected = unexpectedCatalogueRows(served);
    expect(unexpected, `catalogue serves no unknown rows; unexpected: ${JSON.stringify(unexpected)}`).toEqual([]);
    if (!ALLOWED_DEPLOYMENT_JOBS.length) {
      expect(served).toEqual(FIXTURE_IDS);
    }

    // SAA-1359 D5: the served gate flags seeded fixtures as non-runnable so the
    // UI never offers a Run the engine cannot honour. Deployment jobs are
    // non-runnable whenever execution is disabled; when it is enabled their gate
    // is asserted against the row itself by test 0b (a live client is required
    // for the true branch, so it cannot be inferred from the env alone).
    if (ENGINE === 'dagster') {
      const fixtureIds = new Set(FIXTURE_IDS);
      for (const row of rows) {
        if (fixtureIds.has(row.workflowId)) {
          expect.soft(row.runnable, `seeded fixture ${row.workflowId} is runnable:false (SAA-1359 D5)`).toBe(false);
        } else if (!DAGSTER_EXECUTION_ENABLED && ALLOWED_DEPLOYMENT_JOBS.includes(row.workflowId)) {
          expect
            .soft(row.runnable, `deployment job ${row.workflowId} is runnable:false while execution is disabled`)
            .toBe(false);
        }
      }
    }
  });

  // SAA-1359 D5: deployment jobs are the rows the engine can actually run, so
  // their gate must flip with DAGSTER_EXECUTION_ENABLED while seeded fixtures
  // never do. The etl_pipeline job is driven end to end when it is runnable, to
  // prove the gate is not merely cosmetic.
  test('0b. deployment jobs honour the per-workflow runnable gate (SAA-1359 D5)', async ({ page, request }) => {
    test.skip(!ALLOWED_DEPLOYMENT_JOBS.length, `no deployment jobs for engine=${ENGINE}`);
    const catalogue = await fetchCatalogue(request);
    const byId = new Map(catalogue.map((row) => [row.workflowId, row]));

    for (const jobId of ALLOWED_DEPLOYMENT_JOBS) {
      const row = byId.get(jobId);
      if (!row) {
        // Without execution (and therefore without a configured Dagster client)
        // the driver serves no deployment jobs at all; that is a skip, not a
        // product failure. With execution enabled the jobs must be served.
        record(
          jobId,
          'deployment',
          DAGSTER_EXECUTION_ENABLED ? 'fail' : 'skip',
          DAGSTER_EXECUTION_ENABLED
            ? `${jobId} is missing from the served catalogue while execution is enabled`
            : `${jobId} is not served: execution disabled (no Dagster client configured)`
        );
        if (DAGSTER_EXECUTION_ENABLED) {
          expect.soft(false, `${jobId} is served while execution is enabled`).toBe(true);
        }
        continue;
      }
      if (!DAGSTER_EXECUTION_ENABLED) {
        expect.soft(row.runnable, `${jobId} is runnable:false while execution is disabled`).toBe(false);
      }

      // SAA-1359 D5 is a *row* affordance: the row's Run action is gated by the
      // served `runnable` flag. Assert it on `/workflows` rather than the editor
      // toolbar, whose separate graph-validity gate rejects deployment documents
      // with Dagster op kinds the node catalogue does not publish.
      await page.goto(`${FRONTEND_URL}/workflows`);
      const workflowRow = page.locator('.graph-workflow-item').filter({ hasText: jobId }).first();
      await expect(workflowRow, `${jobId} row is listed`).toBeVisible({ timeout: 30_000 });
      const runButton = workflowRow.locator('.graph-workflow-item__actions ion-button').nth(1);
      const rowLabel = (await runButton.getAttribute('aria-label')) ?? '';
      const rowRunEnabled = await runButton.isEnabled();

      if (row.runnable !== true) {
        record(
          jobId,
          'deployment',
          'skip',
          `runnable:false (${
            DAGSTER_EXECUTION_ENABLED ? 'execution enabled but no executable client/job' : 'execution disabled'
          }); row Run label="${rowLabel}" enabled=${rowRunEnabled}`
        );
        expect.soft(!rowRunEnabled, `${jobId} row Run is blocked for a runnable:false row`).toBe(true);
        continue;
      }

      if (!rowRunEnabled) {
        record(
          jobId,
          'deployment',
          'fail',
          `runnable:true but the row Run affordance stayed disabled (label="${rowLabel}")`
        );
        expect.soft(false, `${jobId} row Run is enabled for a runnable:true row`).toBe(true);
        continue;
      }

      if (jobId !== 'etl_pipeline') {
        record(
          jobId,
          'deployment',
          'pass',
          `runnable:true and row Run enabled (label="${rowLabel}"); not driven — etl_pipeline is the execution leg`
        );
        continue;
      }

      try {
        const createRun = page.waitForResponse(
          (response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/graph/runs'
        );
        await runButton.click();
        const created = await createRun;
        expect(created.status(), `${jobId} run request accepted`).toBe(202);
        const runId = ((await created.json()) as { runId?: string }).runId;
        expect(runId, `${jobId} run request returns a run id`).toBeTruthy();
        await expect
          .poll(() => new URL(page.url()).searchParams.get('autorun'), {
            timeout: 30_000,
            message: `row Run opens ${jobId} with autorun=1`,
          })
          .toBe('1');
        const terminal = await waitForDeploymentTerminal(page, TERMINAL_BUDGET_MS, {
          request,
          runId: runId as string,
        });
        // The D5 acceptance is that a runnable deployed job can be exercised to
        // *a* terminal; whether the engine run itself succeeds is a separate
        // engine-contract concern, recorded verbatim rather than asserted here.
        if (terminal === 'succeeded') {
          record(jobId, 'deployment', 'pass', 'runnable:true; row Run enabled; autorun reached succeeded');
        } else {
          const errorText = await runLevelErrorText(page);
          record(
            jobId,
            'deployment',
            'fail',
            `runnable:true; row Run enabled; autorun reached terminal ${terminal}${errorText ? `: ${errorText}` : ''}`
          );
        }
        expect.soft(terminal !== 'timeout', `${jobId} row Run reaches a terminal (got ${terminal})`).toBe(true);
      } catch (error) {
        record(jobId, 'deployment', 'fail', `run failed: ${String(error).slice(0, 200)}`);
        expect.soft(false, `${jobId} deployment run completed`).toBe(true);
      }
    }
  });

  // SAA-1425 regression: `withComponentInputBinding()` sets every component
  // input from the merged route data/params/query params, including inputs the
  // URL does not carry. A plain `@Input() runAllowed = true` was therefore
  // overwritten with `undefined` on every normal graph route and disabled Run
  // (SAA-1423). A route with no `runAllowed` param must keep Run enabled, and
  // an explicit `?runAllowed=false` must still disable it.
  test('0c. route-bound runAllowed defaults to true and honours an explicit false (SAA-1425)', async ({
    page,
  }) => {
    test.skip(
      ENGINE === 'dagster',
      `seeded fixtures are runnable:false on dagster (engine=${ENGINE})`
    );

    await page.goto(
      `${FRONTEND_URL}/graph/read/fixture-manual-log?engine=${encodeURIComponent(ENGINE)}`
    );
    const run = page.locator('button.graph-float-btn--run');
    await expect(run, 'Run control on a route with no runAllowed input').toBeVisible({
      timeout: 30_000,
    });
    await expect(run, 'Run stays enabled when the route supplies no runAllowed').toBeEnabled();
    expect(await run.getAttribute('aria-disabled'), 'Run is not aria-disabled').not.toBe('true');

    await page.goto(
      `${FRONTEND_URL}/graph/read/fixture-manual-log?engine=${encodeURIComponent(ENGINE)}&runAllowed=false`
    );
    const disabledRun = page.locator('button.graph-float-btn--run');
    await expect(disabledRun, 'Run control with ?runAllowed=false').toBeVisible({
      timeout: 30_000,
    });
    await expect(disabledRun, 'explicit ?runAllowed=false keeps Run disabled').toBeDisabled();
    expect(await disabledRun.getAttribute('aria-disabled'), 'Run advertises aria-disabled=true').toBe(
      'true'
    );
  });

  test('1. every fixture is listed at /workflows', async ({ page }) => {
    // SAA-753 criterion 3: capture the browser console on the populated
    // /workflows path and prove neither the GraphWorkflowListModel identity
    // warning nor the empty-source INFO is emitted.
    const consoleMessages: string[] = [];
    page.on('console', (message) => consoleMessages.push(`[${message.type()}] ${message.text()}`));
    page.on('pageerror', (error) => consoleMessages.push(`[pageerror] ${error.message}`));

    await page.goto(`${FRONTEND_URL}/workflows`);
    // Give the app a bounded window to render the rows from the real engine
    // catalogue, then record whatever is present per fixture instead of aborting
    // the serial suite on a timeout: a missing row is itself the result, and the
    // show/replay/i-o steps must still run so the matrix is itemized.
    await page
      .locator('.graph-workflow-item__name')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => undefined);

    // The row name is an inline `<span>`; `innerText` keeps the source
    // template's surrounding whitespace/newline, so trim before comparing the
    // rendered text against the engine's workflow ids.
    const names = (await page.locator('.graph-workflow-item__name').allInnerTexts()).map((name) => name.trim());
    for (const fixture of FIXTURES) {
      const listed = names.includes(fixtureName(fixture));
      record(
        fixture.id,
        'list',
        listed ? 'pass' : 'fail',
        listed ? undefined : `served names: ${JSON.stringify(names)}`
      );
      expect.soft(listed, `fixture ${fixture.id} listed at /workflows`).toBe(true);
    }
    // D9 #2: dagster's deployment adds known jobs to the same list, so the row
    // count is bounded by fixture count + that engine's allowed extras. Every
    // other engine keeps the exact-count assertion.
    const allowedNames = new Set([...FIXTURES.map((fixture) => fixtureName(fixture)), ...ALLOWED_DEPLOYMENT_JOBS]);
    const unexpectedNames = names.filter((name) => !allowedNames.has(name));
    expect.soft(unexpectedNames, `no unexpected rows at /workflows: ${JSON.stringify(unexpectedNames)}`).toEqual([]);
    if (ALLOWED_DEPLOYMENT_JOBS.length) {
      expect
        .soft(
          names.length,
          `listed row count is fixtures + allowed deployment jobs (${ALLOWED_DEPLOYMENT_JOBS.length})`
        )
        .toBeGreaterThanOrEqual(FIXTURES.length);
      expect
        .soft(names.length, 'listed row count does not exceed fixtures + allowed deployment jobs')
        .toBeLessThanOrEqual(FIXTURES.length + ALLOWED_DEPLOYMENT_JOBS.length);
    } else {
      expect.soft(names.length, 'listed row count matches the registry').toBe(FIXTURES.length);
    }

    const forbiddenHits = consoleMessages.filter((message) =>
      FORBIDDEN_CONSOLE.some((needle) => message.includes(needle))
    );
    mkdirSync(dirname(CONSOLE_PATH), { recursive: true });
    writeFileSync(
      CONSOLE_PATH,
      JSON.stringify({ engine: ENGINE, path: '/workflows', forbiddenHits, messages: consoleMessages }, null, 2)
    );
    expect
      .soft(forbiddenHits, `no forbidden console output on /workflows: ${JSON.stringify(forbiddenHits)}`)
      .toEqual([]);
  });

  // SAA-1359 D5: the seeded fixture rows are never runnable, so their row Run
  // affordance must be disabled and carry the explaining accessible name. The
  // deployment rows' enabled state is asserted against their own served row by
  // test 0b.
  test('1b. seeded fixture rows keep the Run gate disabled (SAA-1359 D5)', async ({ page }) => {
    test.skip(ENGINE !== 'dagster', `per-workflow run gate is served by dagster only (engine=${ENGINE})`);

    await page.goto(`${FRONTEND_URL}/workflows`);
    await page.locator('.graph-workflow-item__name').first().waitFor({ state: 'visible', timeout: 30_000 });

    for (const fixture of FIXTURES) {
      const row = page
        .locator('.graph-workflow-item')
        .filter({ hasText: fixtureName(fixture) })
        .first();
      await expect.soft(row, `fixture ${fixture.id} row is listed`).toBeVisible({ timeout: 30_000 });

      const runButton = row.locator('.graph-workflow-item__actions ion-button').nth(1);
      const label = (await runButton.getAttribute('aria-label')) ?? '';
      const ariaDisabled = await runButton.getAttribute('aria-disabled');
      const disabled = await runButton.evaluate((element) => (element as { disabled?: boolean }).disabled === true);

      expect.soft(ariaDisabled, `fixture ${fixture.id} row Run advertises aria-disabled`).toBe('true');
      expect.soft(disabled, `fixture ${fixture.id} row Run is disabled`).toBe(true);
      expect
        .soft(label, `fixture ${fixture.id} row Run explains the block instead of "${EN_WORKFLOW_LABELS.run}"`)
        .toBe(EN_WORKFLOW_LABELS.runBlockedReadOnly);
      expect.soft(label, `fixture ${fixture.id} row Run is not the engine-level block`).not.toBe(
        EN_WORKFLOW_LABELS.runBlocked
      );
      expect.soft(label, `fixture ${fixture.id} row Run is not the enabled label`).not.toBe(EN_WORKFLOW_LABELS.run);
    }
  });

  test('2. every fixture opens to its detail canvas', async ({ page }) => {
    for (const fixture of FIXTURES) {
      try {
        await openCanvas(page, fixture);
        const expected = fixtureNodeIds(fixture);
        const missing: string[] = [];
        for (const nodeId of expected) {
          const present = await page.locator(`[data-node-id="${nodeId}"]`).count();
          if (!present) missing.push(nodeId);
        }
        const pass = missing.length === 0;
        record(fixture.id, 'show', pass ? 'pass' : 'fail', pass ? undefined : `missing nodes: ${missing.join(', ')}`);
        expect.soft(pass, `fixture ${fixture.id} canvas projects nodes ${expected.join(', ')}`).toBe(true);
      } catch (error) {
        record(fixture.id, 'show', 'fail', `open failed: ${String(error).slice(0, 200)}`);
        expect.soft(false, `fixture ${fixture.id} opened to its canvas`).toBe(true);
      }
    }
  });

  test('3. every fixture runs and exposes node inputs/outputs (replay + I-O)', async ({ page, request }) => {
    const catalogue = await fetchCatalogue(request);
    const runnableById = new Map(catalogue.map((row) => [row.workflowId, row.runnable]));

    for (const fixture of FIXTURES) {
      // SAA-1359 D5: a row the engine marks runnable:false is legitimately not
      // runnable through the UI (dagster's seeded fixtures). Assert the Run
      // affordance really is disabled, then record the run legs as skips — not
      // as run failures the product cannot fix.
      if (ENGINE === 'dagster' && runnableById.get(fixture.id) === false) {
        let affordanceProblem: string | undefined;
        try {
          await openCanvas(page, fixture);
          await expect(
            page.locator('button.graph-float-btn--run'),
            `fixture ${fixture.id} Run button for a runnable:false row`
          ).toBeDisabled({ timeout: 5_000 });
        } catch (error) {
          affordanceProblem = String(error).slice(0, 200);
        }
        record(
          fixture.id,
          'replay',
          affordanceProblem ? 'fail' : 'skip',
          affordanceProblem
            ? `runnable:false row did not keep Run disabled: ${affordanceProblem}`
            : 'row is runnable:false (SAA-1359 D5): engine cannot execute this seeded workflow; run not evaluated'
        );
        record(fixture.id, 'i-o', 'skip', 'I/O not evaluated: row is runnable:false (SAA-1359 D5)');
        expect.soft(!affordanceProblem, `fixture ${fixture.id} keeps Run disabled for a runnable:false row`).toBe(true);
        continue;
      }

      const expected = expectedTerminal(fixture);
      const terminals = terminalNodeIds(fixture);
      let terminal: 'succeeded' | 'failed' | 'timeout' = 'timeout';
      let declared: string[] = [];
      let applied: string[] = [];
      let replayError: string | undefined;

      // Replay phase: open, fill, run, classify. An error here is a replay
      // error and is recorded as such — never attributed to I/O (D9 #3).
      try {
        await openCanvas(page, fixture);
        ({ declared, applied } = await fillInputs(page, fixture));

        if (!(await waitForRunEnabled(page, 30_000))) {
          // The engine refuses to run this workflow (runnable gate); the run
          // never started, so there is no terminal state or run-level error.
          replayError =
            'run not started: Run button stayed disabled for 30s (engine runnable gate; no terminal reached)';
        } else {
          await page.locator('button.graph-float-btn--run').click();
          terminal = await waitForTerminal(page, fixture);
        }
      } catch (error) {
        replayError = `run failed: ${String(error).slice(0, 200)}`;
      }

      if (replayError) {
        record(fixture.id, 'replay', 'fail', replayError);
        record(fixture.id, 'i-o', 'skip', 'I/O not evaluated: replay did not reach a terminal state');
        expect.soft(false, `fixture ${fixture.id} replay completed`).toBe(true);
        continue;
      }

      const replayPass = terminal === expected;
      const inputGap =
        declared.length > 0 && applied.length === 0
          ? `; declared inputs [${declared.join(', ')}] not exposed by the run form (SAA-720 UI gap)`
          : '';
      let replayDetail: string | undefined;
      if (!replayPass) {
        const states = await terminalStateEvidence(page, terminals);
        const errorText = await runLevelErrorText(page);
        const runEvidence = errorText ? `; UI error: ${errorText}` : '; UI exposes no run-level error text';
        replayDetail = `terminal ${terminal} != expected ${expected} (terminal states: ${states})${runEvidence}${inputGap}`;
      }
      record(fixture.id, 'replay', replayPass ? 'pass' : 'fail', replayDetail);
      expect.soft(replayPass, `fixture ${fixture.id} replay reaches ${expected} (got ${terminal})`).toBe(true);
      if (!replayPass) {
        // I/O is only meaningful once the run reached its expected terminal.
        // A failed/timeout replay is not evidence that I/O is broken.
        record(fixture.id, 'i-o', 'skip', `I/O not evaluated: run terminal ${terminal} != expected ${expected}`);
        continue;
      }

      // I/O phase: separate catch so an inspection error is an I/O error and
      // never overwrites the (passing) replay verdict. For an expected-failure
      // fixture, I/O panes are inspected where available and otherwise
      // recorded as skipped — a legitimately failed run is not broken I/O.
      try {
        const ioVisible = await openFirstNodeIo(page);
        if (expected === 'failed') {
          record(
            fixture.id,
            'i-o',
            ioVisible ? 'pass' : 'skip',
            ioVisible ? undefined : 'expected-failure run; no node exposed run I/O panes'
          );
        } else {
          record(
            fixture.id,
            'i-o',
            ioVisible ? 'pass' : 'fail',
            ioVisible ? undefined : 'node inspection I/O panes not visible'
          );
          expect.soft(ioVisible, `fixture ${fixture.id} exposes node I/O after the run`).toBe(true);
        }
      } catch (error) {
        const ioError = `I/O inspection failed: ${String(error).slice(0, 200)}`;
        record(fixture.id, 'i-o', expected === 'failed' ? 'skip' : 'fail', ioError);
        if (expected !== 'failed') {
          expect.soft(false, `fixture ${fixture.id} I/O inspection completed`).toBe(true);
        }
      }
    }
  });

  // SAA-1361 requirement 4: a workflow row opens `/workflows/<id>?engine=<id>`
  // and a direct deep link renders the same canvas instead of falling back to
  // `/`. Engine-independent: the fixture id comes from the registry and the
  // engine id from the harness, so this asserts the same contract on local,
  // mastra and dagster.
  test('4. workflow rows and deep links open /workflows/:workflowId on the selected engine', async ({ page }) => {
    for (const fixture of FIXTURES) {
      const problems: string[] = [];

      try {
        await page.goto(`${FRONTEND_URL}/workflows`);
        const row = workflowRowButton(page, fixture);
        await expect(row, `row button for ${fixture.id} is rendered`).toBeVisible({ timeout: 30_000 });
        await row.click();
        await expectWorkflowUrl(page, fixture.id);
        await expectWorkflowCanvas(page);
      } catch (error) {
        problems.push(`row click: ${String(error).slice(0, 200)}`);
      }

      try {
        await page.goto(
          `${FRONTEND_URL}/workflows/${encodeURIComponent(fixture.id)}?engine=${encodeURIComponent(ENGINE)}`
        );
        // Render first, then re-read the URL: a fallback redirect is only
        // observable after the page has had a chance to settle.
        await expectWorkflowCanvas(page);
        await expectWorkflowUrl(page, fixture.id);
      } catch (error) {
        problems.push(`deep link: ${String(error).slice(0, 200)}`);
      }

      const pass = problems.length === 0;
      record(
        fixture.id,
        'route',
        pass ? 'pass' : 'fail',
        pass ? `row click + deep link on engine=${ENGINE}` : problems.join('; ')
      );
      expect.soft(pass, `fixture ${fixture.id} routes via row click and deep link`).toBe(true);
    }
  });

  // SAA-1361 D8: a run-level failure must surface on the canvas — the failure
  // banner, a failed node (anchored by GraphExecutionStateMapper when the engine
  // reports no nodeId), and no misleading "retry result fetch" affordance.
  // Task minimum is the local engine; other engines record an explicit skip
  // instead of an unverified pass.
  test('5. a failed run surfaces the failure banner and a failed node (D8)', async ({ page, request }) => {
    const fixtureId = 'fixture-foreach-break';

    if (ENGINE !== 'local') {
      record(
        fixtureId,
        'failure',
        'skip',
        `D8 failure surface evaluated on the local engine (task minimum); engine=${ENGINE} not evaluated`
      );
      test.skip(true, `D8 failure surface is scoped to the local engine; engine=${ENGINE}`);
    }

    const created = await request.post(`${BACKEND_URL}/graph/runs`, {
      data: { workflowId: fixtureId, inputs: {} },
      timeout: 30_000,
    });
    if (!created.ok()) {
      record(
        fixtureId,
        'failure',
        'fail',
        `POST /graph/runs -> ${created.status()}: ${(await created.text()).slice(0, 200)}`
      );
      expect.soft(created.ok(), 'the failing run is created through POST /graph/runs').toBe(true);
      return;
    }

    const { runId } = (await created.json()) as { runId: string };

    // The replay reads only recorded events, so wait for the run to reach a
    // terminal state before opening the UI; the bounded poll keeps a stuck
    // backend from consuming the fixture budget.
    let status = 'queued';
    let runError = '';
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const read = await request.get(`${BACKEND_URL}/graph/runs/${encodeURIComponent(runId)}`, {
        timeout: 15_000,
      });
      if (read.ok()) {
        const body = (await read.json()) as {
          status?: string;
          error?: { message?: string };
        };
        status = body.status ?? status;
        runError = body.error?.message ?? runError;
        if (status === 'failed' || status === 'succeeded' || status === 'cancelled') break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const runFailed = status === 'failed';
    const expectedError = /foreach input 'items' must be an array/i.test(runError);
    if (!runFailed || !expectedError) {
      record(
        fixtureId,
        'failure',
        'fail',
        `run ${runId} status=${status}; expected failed with "foreach input 'items' must be an array"; backend error: ${
          runError || '<none>'
        }`
      );
      expect.soft(runFailed && expectedError, 'the fixture run fails before replay').toBe(true);
      return;
    }

    const problems: string[] = [];
    try {
      await page.goto(
        `${FRONTEND_URL}/graph/read/${encodeURIComponent(fixtureId)}?engine=${encodeURIComponent(
          ENGINE
        )}&replayRun=${encodeURIComponent(runId)}`
      );

      const banner = page.locator(RUN_FAILURE_SELECTOR);
      await expect(banner, 'the run-failure banner is visible').toBeVisible({ timeout: 60_000 });
      const bannerText = (await banner.innerText()).replace(/\s+/g, ' ').trim();
      if (!bannerText) problems.push('run-failure banner has no text');

      const failedNode = page.locator('article.graph-node--failed');
      await expect(failedNode.first(), 'a failed node is projected on the canvas').toBeVisible({
        timeout: 15_000,
      });

      const retry = page.getByRole('button', { name: /retry result fetch/i });
      if ((await retry.count()) > 0) problems.push('retry result fetch button is offered for a failed run');

      if (!problems.length) {
        record(
          fixtureId,
          'failure',
          'pass',
          `run ${runId}: banner + failed node surfaced; error: ${bannerText.slice(0, 160)}`
        );
      }
    } catch (error) {
      problems.push(String(error).slice(0, 300));
    }

    if (problems.length) {
      record(fixtureId, 'failure', 'fail', `run ${runId}: ${problems.join('; ')}`);
    }
    expect.soft(problems, `failed run ${runId} surfaces on the canvas`).toEqual([]);
  });
});
