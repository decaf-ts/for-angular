import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

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
 *   3. every fixture runs/replays with each node's inputs/outputs visible (replay + I-O).
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

const AS_GRAPH_ROOT =
  process.env['AS_GRAPH_ROOT'] ?? resolve(__dirname, '../../../../../as-graph');

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

const REPORT_PATH =
  process.env['PER_ENGINE_REPORT'] ??
  join(__dirname, '.reports', `${ENGINE}.json`);

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

type Action = 'list' | 'show' | 'replay' | 'i-o';
type Outcome = { engine: string; fixture: string; action: Action; pass: boolean; detail?: string };

const outcomes: Outcome[] = [];

function record(fixture: string, action: Action, pass: boolean, detail?: string): void {
  outcomes.push({ engine: ENGINE, fixture, action, pass, detail });
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
  await page.goto(
    `${FRONTEND_URL}/graph/read/${encodeURIComponent(fixture.id)}?engine=${encodeURIComponent(ENGINE)}`
  );
  await page.locator('.ng-diagram-node').first().waitFor({ state: 'visible', timeout: 30_000 });
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
    const meta = (await field.locator('.graph-renderer__field-meta').innerText().catch(() => '')) || '';
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

/** Status-class selector for one node's rendered element (node or badge). */
function nodeStateSelector(nodeId: string, state: 'succeeded' | 'failed'): string {
  return `[data-node-id="${nodeId}"] article.graph-node--${state}, [data-node-id="${nodeId}"] article.graph-badge--${state}`;
}

/**
 * Waits for the fixture's terminal node(s) to resolve, within the D1 >= 120s
 * per-fixture budget. A run is terminal when either any node has failed, or
 * every one of the fixture's terminal nodes has succeeded. It is deliberately
 * NOT satisfied by a non-terminal node turning green (the previous false
 * positive).
 */
async function waitForTerminal(
  page: Page,
  fixture: GraphWorkflowFixture,
  timeoutMs = TERMINAL_BUDGET_MS
): Promise<'succeeded' | 'failed' | 'timeout'> {
  const terminals = terminalNodeIds(fixture);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.locator('article.graph-node--failed, article.graph-badge--failed').count()) {
      return 'failed';
    }
    if (terminals.length) {
      let green = 0;
      for (const nodeId of terminals) {
        if (await page.locator(nodeStateSelector(nodeId, 'succeeded')).count()) green += 1;
      }
      if (green === terminals.length) return 'succeeded';
    } else if (await page.locator('article.graph-node--succeeded, article.graph-badge--succeeded').count()) {
      return 'succeeded';
    }
    await page.waitForTimeout(250);
  }
  return 'timeout';
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
    await inspection.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
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
    const rows = (await catalogue.json()) as Array<{ workflowId: string }>;
    expect(rows.map((row) => row.workflowId).sort()).toEqual(FIXTURE_IDS);
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

    const names = await page.locator('.graph-workflow-item__name').allInnerTexts();
    for (const fixture of FIXTURES) {
      const listed = names.includes(fixtureName(fixture));
      record(fixture.id, 'list', listed, listed ? undefined : `served names: ${JSON.stringify(names)}`);
      expect.soft(listed, `fixture ${fixture.id} listed at /workflows`).toBe(true);
    }
    expect.soft(names.length, 'listed row count matches the registry').toBe(FIXTURES.length);

    const forbiddenHits = consoleMessages.filter((message) =>
      FORBIDDEN_CONSOLE.some((needle) => message.includes(needle))
    );
    mkdirSync(dirname(CONSOLE_PATH), { recursive: true });
    writeFileSync(
      CONSOLE_PATH,
      JSON.stringify({ engine: ENGINE, path: '/workflows', forbiddenHits, messages: consoleMessages }, null, 2)
    );
    expect.soft(forbiddenHits, `no forbidden console output on /workflows: ${JSON.stringify(forbiddenHits)}`).toEqual([]);
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
        record(fixture.id, 'show', pass, pass ? undefined : `missing nodes: ${missing.join(', ')}`);
        expect.soft(pass, `fixture ${fixture.id} canvas projects nodes ${expected.join(', ')}`).toBe(true);
      } catch (error) {
        record(fixture.id, 'show', false, `open failed: ${String(error).slice(0, 200)}`);
        expect.soft(false, `fixture ${fixture.id} opened to its canvas`).toBe(true);
      }
    }
  });

  test('3. every fixture runs and exposes node inputs/outputs (replay + I-O)', async ({ page }) => {
    for (const fixture of FIXTURES) {
      const expected = expectedTerminal(fixture);
      const terminals = terminalNodeIds(fixture);
      try {
        await openCanvas(page, fixture);
        const { declared, applied } = await fillInputs(page, fixture);

        const run = page.locator('button.graph-float-btn--run');
        await expect(run).toBeEnabled({ timeout: 30_000 });
        await run.click();

        const terminal = await waitForTerminal(page, fixture);
        const replayPass = terminal === expected;
        const inputGap =
          declared.length > 0 && applied.length === 0
            ? `; declared inputs [${declared.join(', ')}] not exposed by the run form (SAA-720 UI gap)`
            : '';
        record(
          fixture.id,
          'replay',
          replayPass,
          replayPass
            ? undefined
            : `terminal ${terminal} != expected ${expected} (terminals: ${terminals.join(', ') || 'none'})${inputGap}`
        );
        expect.soft(replayPass, `fixture ${fixture.id} replay reaches ${expected} (got ${terminal})`).toBe(true);
        if (!replayPass) {
          record(fixture.id, 'i-o', false, `no ${expected} run to inspect`);
          continue;
        }

        const ioVisible = await openFirstNodeIo(page);
        record(fixture.id, 'i-o', ioVisible, ioVisible ? undefined : 'node inspection I/O panes not visible');
        expect.soft(ioVisible, `fixture ${fixture.id} exposes node I/O after the run`).toBe(true);
      } catch (error) {
        record(fixture.id, 'replay', false, `run failed: ${String(error).slice(0, 200)}`);
        record(fixture.id, 'i-o', false, `run failed: ${String(error).slice(0, 200)}`);
        expect.soft(false, `fixture ${fixture.id} replay + I-O completed`).toBe(true);
      }
    }
  });
});
