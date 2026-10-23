/**
 * @module tests/playwright/graph/a11y.spec
 * @summary axe-core accessibility gate for the graph editor and mastra UI (SAA-894).
 * @description WCAG 2.x AA gate (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
 * `wcag22aa`) run with `AxeBuilder` (`@axe-core/playwright`) over every surface
 * SAA-846 U2 names:
 *
 *   1. the graph editor page (`/graph`) — canvas, toolbar, palette side panel;
 *   2. the node inspection split view and its inline editor (un-ran node);
 *   3. the controller-presented node edit modal and switch edit modal;
 *   4. the mastra UI model-builder surface (structured-output form);
 *   5. the first-save workflow-create modal;
 *   6. the workflow list page and the workflow executions page;
 *   7. the editor page again under forced dark-mode emulation (the editor now
 *      ships a dark palette — `src/diagrams/components/graph/styles/graph-theme.scss` — so dark
 *      contrast is part of this gate).
 *
 * The gate FAILS the test on any axe violation (no silent passes): every scan
 * asserts an empty violation list, and the assertion message carries the full
 * violation summary (rule, impact, offending targets) so the parent owner
 * (SAA-846) can act on it. Rule exclusions, where present, are narrowly scoped
 * per-selector AND per-rule with a written justification inline — blanket
 * disables are not accepted.
 *
 * RUN REQUIREMENTS: the Playwright `webServer` boots the frontend (:8110) and
 * the graph backend (:3000); no manual infra.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { getNodeArticle, gotoGraph, openNodeEditor } from './helpers';

/** Demo workflow identity used by the run-mock below (mirrors graph-node-inspection.spec). */
const WORKFLOW_ID = 'text-pipeline-workflow';
const RUN_ID = 'run-a11y-1';
const SPLIT_NODE = 'SplitTextCodeNode';

/** Real graph backend the Playwright `webServer` boots on :3000 (same base the specs use). */
const GRAPH_BACKEND_URL = process.env['GRAPH_BACKEND_URL'] ?? 'http://127.0.0.1:3000';
/**
 * Seeded, executable fixture workflow the executions-page guard runs (SAA-906):
 * `fixture-manual-log` carries no inputs, so a bare `POST /graph/runs` against
 * it succeeds deterministically on every backend boot with demo seeding.
 */
const SEEDED_RUN_WORKFLOW_ID = 'fixture-manual-log';

/** One SSE frame carrying a canonical run event envelope (§4.15 wire shape). */
function sseEvent(type: string, sequence: number, extra: Record<string, unknown> = {}): string {
  return `data: ${JSON.stringify({
    id: `ev-${sequence}`,
    sequence,
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    type,
    path: [],
    timestamp: '2026-09-16T10:00:00.000Z',
    ...extra,
  })}\n\n`;
}

/** Completed demo run: Split succeeds, then the terminal event. */
function completedRunBody(): string {
  return (
    sseEvent('workflow.started', 1) +
    sseEvent('node.stateChanged', 2, { nodeId: SPLIT_NODE, payload: { state: 'running' } }) +
    sseEvent('node.stateChanged', 3, { nodeId: SPLIT_NODE, payload: { state: 'succeeded' } }) +
    sseEvent('workflow.completed', 4, { status: 'succeeded' })
  );
}

/** Stored run result with the Split node's inspection payloads (§4.16 shape). */
function storedResultBody(): Record<string, unknown> {
  return {
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    status: 'succeeded',
    result: {
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      status: 'succeeded',
      nodeResults: {
        [SPLIT_NODE]: {
          nodeId: SPLIT_NODE,
          status: 'succeeded',
          inputs: { count: 1, text: 'Hello\nWorld' },
          outputs: { result: 5 },
        },
      },
    },
  };
}

/**
 * Installs the mocked run backend (same wire contract as
 * graph-node-inspection.spec): run create 202, SSE completed stream, stored
 * result served. Makes the Split node `hasRan` so its double-click opens the
 * three-pane inspection split view (R4-8) instead of the edit modal.
 */
async function mockRanNodeBackend(page: Page): Promise<void> {
  await page.route('**/graph/results/__health__', (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.route(`**/graph/workflows/${WORKFLOW_ID}`, (route) =>
    route.fulfill({ status: 404, body: '' }),
  );
  await page.route('**/graph/runs', (route) =>
    route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'running',
        eventsUrl: `/graph/runs/${RUN_ID}/events`,
        resultUrl: `/graph/runs/${RUN_ID}`,
      }),
    }),
  );
  await page.route(`**/graph/runs/${RUN_ID}/events*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache' },
      body: completedRunBody(),
    }),
  );
  await page.route(`**/graph/runs/${RUN_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(storedResultBody()),
    }),
  );
}

/** WCAG 2.x AA ruleset: A + AA for 2.0, 2.1 and 2.2. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Narrowly-scoped exclusions for canvas-rendered diagram internals.
 *
 * JUSTIFICATION (kept deliberately empty until a rule is proven unactionable):
 * each entry must name the exact selector subtree of the diagram canvas and the
 * single rule it silences, with the reason the rule cannot be acted on there.
 * Blanket disables are not accepted (SAA-894). Entries added after observing
 * real axe output on the live editor.
 */
const CANVAS_EXCLUSIONS: { selector: string; ruleIds: string[]; reason: string }[] = [];

interface ScanOptions {
  /** Axe `include` scoping (surface isolation, NOT rule exclusion). */
  include?: string[];
}

/** Runs one axe analysis with the WCAG 2.x AA tag set. */
async function scan(page: Page, options: ScanOptions = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (options.include) builder = builder.include(options.include);
  return builder.analyze();
}

/** Human-readable violation summary used as the assertion payload. */
function violationSummary(
  result: Awaited<ReturnType<typeof scan>>,
): string[] {
  return result.violations.map(
    (v) =>
      `${v.id} [${v.impact ?? 'unknown impact'}] on ${v.nodes.length} node(s): ` +
      v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 6)
        .join(' | '),
  );
}

/** Fails the test when the scan found any WCAG 2.x AA violation. */
function expectNoViolations(
  result: Awaited<ReturnType<typeof scan>>,
  surface: string,
): void {
  const summary = violationSummary(result);
  expect(
    summary,
    `${surface}: axe WCAG 2.x AA violations found — fix in product source, not here`,
  ).toEqual([]);
  // Evidence for the completion report: incomplete checks are not violations,
  // but they are recorded so a silent drop of coverage is visible in the log.
  console.log(
    `[a11y] ${surface}: violations=${result.violations.length} ` +
      `passes=${result.passes.length} incomplete=${result.incomplete.length} ` +
      `inapplicable=${result.inapplicable.length}`,
  );
}

/** Applies the narrowly-scoped canvas exclusions (see CANVAS_EXCLUSIONS). */
function withCanvasExclusions(builder: AxeBuilder): AxeBuilder {
  for (const { selector, ruleIds } of CANVAS_EXCLUSIONS) {
    builder = builder.exclude(selector).disableRules(ruleIds);
  }
  return builder;
}

test.describe('axe-core accessibility gate (SAA-894, WCAG 2.x AA)', () => {
  // Each test boots the Angular dev app through `gotoGraph`/`page.goto` and the
  // axe analysis itself is heavyweight; the default 30s timeout is not enough.
  test.setTimeout(180_000);

  test('graph editor page: canvas, toolbar and palette side panel', async ({ page }) => {
    await gotoGraph(page);
    // Open the palette side panel so its popup (search input, palette items,
    // status region) is part of the scanned state.
    await page.locator('button.graph-renderer__palette-btn').click();
    await expect(page.locator('.graph-renderer__palette-popup')).toBeVisible();
    await page.waitForTimeout(500);
    const result = await scan(page);
    expectNoViolations(result, 'graph editor page (canvas + toolbar + palette)');
  });

  test('node inspection split view with inline editor (post-run node)', async ({ page }) => {
    // A node only opens the three-pane split view once it has run (R4-8); the
    // mock backend supplies a completed demo run so the Split node is ran and
    // its inputs/outputs panes are populated.
    await mockRanNodeBackend(page);
    await gotoGraph(page);
    const run = page.locator('button.graph-float-btn--run');
    await expect(run).toBeVisible();
    await expect(run).toBeEnabled();
    await run.click();
    // Cold-start stabilization (SAA-904): the Split node's canvas host carries
    // `graph-node--succeeded` only once the mocked run's terminal SSE event has
    // been applied. A fixed sleep cannot guarantee that on a cold backend; the
    // deterministic wait mirrors graph-node-inspection.spec.ts.
    const splitNode = getNodeArticle(page, SPLIT_NODE);
    await expect(splitNode).toHaveClass(/graph-node--succeeded/, { timeout: 30_000 });
    await openNodeEditor(page, SPLIT_NODE);
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10_000 });
    // Surface isolation, not exclusion: the underlying canvas/toolbar state is
    // already covered by the full-page editor scan above; this include scopes
    // the analysis to the split view, whose center pane is the inline editor
    // (`app-graph-node-inline-editor`).
    const result = await scan(page, { include: ['.graph-node-inspection'] });
    expectNoViolations(result, 'node inspection split view + inline editor');
  });

  test('node edit modal (controller-presented, un-ran member node)', async ({ page }) => {
    await gotoGraph(page);
    await openNodeEditor(page, 'ResultLogNode');
    const modal = page.locator('ion-modal app-graph-node-edit-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    // Full-page scan: ion-modal content renders in an overlay outside the
    // editor DOM subtree, so the modal is only covered by a page-level scan.
    const result = await withCanvasExclusions(new AxeBuilder({ page }).withTags(WCAG_TAGS)).analyze();
    expectNoViolations(result, 'node edit modal (graph-node-edit-modal)');
  });

  test('switch edit modal (controller-presented, palette-added switch)', async ({ page }) => {
    // Follows node-switch.spec.ts isolation: route-mock the workflow lookups so
    // the palette-added switch is the only state under test.
    await page.route('**/graph/results/__health__', (route) =>
      route.fulfill({ status: 404, body: '' }),
    );
    await page.route('**/graph/workflows/**', (route) =>
      route.fulfill({ status: 404, body: '' }),
    );
    await gotoGraph(page);
    await page.locator('button.graph-renderer__palette-btn').click();
    const entry = page
      .locator('.graph-renderer__palette-item')
      .filter({ hasText: 'Switch' })
      .first();
    await expect(entry).toBeVisible();
    await entry.click();
    const article = page.locator('[data-node-id="core-flow-switch-Switch"] article.graph-node');
    await expect(article).toBeVisible({ timeout: 10_000 });
    await openNodeEditor(page, 'core-flow-switch-Switch');
    const modal = page.locator('ion-modal app-graph-switch-edit-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    const result = await withCanvasExclusions(new AxeBuilder({ page }).withTags(WCAG_TAGS)).analyze();
    expectNoViolations(result, 'switch edit modal (graph-switch-edit-modal)');
  });

  test('mastra UI: model-builder surface on /model-builder', async ({ page }) => {
    await page.goto('http://localhost:8110/model-builder', { waitUntil: 'networkidle', timeout: 60_000 });
    await expect(page.locator('ngx-decaf-model-builder .model-builder')).toBeVisible({
      timeout: 30_000,
    });
    const result = await scan(page);
    expectNoViolations(result, 'model-builder surface (/model-builder)');
  });

  test('first-save workflow-create modal', async ({ page }) => {
    await page.goto('http://localhost:8110/graph/create', { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('ng-diagram', { timeout: 30_000 });
    await page.waitForSelector('.ng-diagram-node', { timeout: 15_000 });
    await page.waitForTimeout(2000);
    // First save on an unsaved draft opens the controller-presented create
    // modal (graph.page.ts §13); nothing is persisted on cancel.
    await page.locator('.graph-float-btn--save').click();
    const modal = page.locator('ion-modal.graph-workflow-create-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    const result = await withCanvasExclusions(new AxeBuilder({ page }).withTags(WCAG_TAGS)).analyze();
    expectNoViolations(result, 'workflow-create modal');
  });

  test('workflow list page', async ({ page }) => {
    await page.goto('http://localhost:8110/workflows', { waitUntil: 'networkidle', timeout: 60_000 });
    await expect(page.locator('ion-content main')).toBeVisible({ timeout: 30_000 });
    // Populated-list guard (SAA-904): the scan must never run against an empty
    // list. An empty `ion-list[role=list]` renders no interactive content, so
    // every violation class on the rows (button names, listitem ownership) is
    // silently absent and the scan false-passes — this false pass produced the
    // stale SAA-894 lane evidence. Assert at least one rendered row first.
    const rows = page.locator('ion-list .graph-workflow-item');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(2000);
    const result = await scan(page);
    expectNoViolations(result, 'workflow list page (/workflows)');
  });

  test('workflow executions page', async ({ page, request }) => {
    // Populated-list guard (SAA-906): the scan must never run against an empty
    // executions list. The mastra delta backend seeds no runs, so the un-guarded
    // scan false-passed on the same empty-list mechanism as the workflow list
    // (SAA-904): the replay row control's `button-name` class is silently
    // absent when no run rows render. Seed >=1 run through the real backend
    // (`POST /graph/runs` for a seeded, executable fixture workflow) and assert
    // at least one rendered run row before scanning.
    const seededWorkflows = await request.get(`${GRAPH_BACKEND_URL}/graph/workflows`);
    expect(seededWorkflows.ok(), await seededWorkflows.text()).toBeTruthy();
    const workflows = (await seededWorkflows.json()) as Array<{ workflowId: string }>;
    expect(
      workflows.some((workflow) => workflow.workflowId === SEEDED_RUN_WORKFLOW_ID),
      `seeded fixture workflow ${SEEDED_RUN_WORKFLOW_ID} must exist (demo seeding enabled)`,
    ).toBe(true);
    const createRun = await request.post(`${GRAPH_BACKEND_URL}/graph/runs`, {
      data: { workflowId: SEEDED_RUN_WORKFLOW_ID, inputs: {} },
    });
    expect(createRun.status(), await createRun.text()).toBe(202);
    const created = (await createRun.json()) as { runId: string };
    expect(created.runId).toBeTruthy();

    await page.goto(`http://localhost:8110/workflows/${SEEDED_RUN_WORKFLOW_ID}/runs`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });
    await expect(page.locator('ion-content main')).toBeVisible({ timeout: 30_000 });
    const rows = page.locator('ion-list .graph-run-item');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(2000);
    const result = await scan(page);
    expectNoViolations(result, 'workflow executions page (/workflows/:id/runs)');
  });

  test.describe('forced dark mode (editor dark palette, graph-theme.scss)', () => {
    test.use({ colorScheme: 'dark' });

    test('graph editor page under prefers-color-scheme: dark', async ({ page }) => {
      await gotoGraph(page);
      await page.locator('button.graph-renderer__palette-btn').click();
      await expect(page.locator('.graph-renderer__palette-popup')).toBeVisible();
      await page.waitForTimeout(500);
      const result = await scan(page);
      expectNoViolations(result, 'graph editor page (forced dark mode)');
    });
  });
});
