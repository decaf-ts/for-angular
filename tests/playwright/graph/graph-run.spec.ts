import { expect, test, type Page } from '@playwright/test';
import { gotoGraph, getNodeArticle } from './helpers';

const RUN_ID = 'run-1234';
const WORKFLOW_ID = 'text-pipeline-workflow';

const ENGINE_EDGE_COUNT = '$workflow:count->SplitTextCodeNode:data';

function sseEvent(
  type: string,
  sequence: number,
  extra: Record<string, unknown> = {}
): string {
  const payload = {
    id: `ev-${sequence}`,
    sequence,
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    type,
    path: [],
    timestamp: '2026-08-20T10:00:00.000Z',
    ...extra,
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Full run (§4.19 order): every live node/edge/log event precedes the
 * terminal event — started → split running → one data edge succeeded →
 * 4 logs → split succeeded → completed strictly last.
 */
function fullRunBody(): string {
  return (
    sseEvent('workflow.started', 1) +
    sseEvent('node.stateChanged', 2, { nodeId: 'SplitTextCodeNode', payload: { state: 'running' } }) +
    sseEvent('edge.stateChanged', 3, { edgeId: ENGINE_EDGE_COUNT, payload: { state: 'succeeded', value: 1 } }) +
    sseEvent('graph.run.log', 4, { nodeId: 'SplitTextCodeNode', payload: { level: 'debug', message: 'parsing input text', runId: RUN_ID, workflowId: WORKFLOW_ID, nodeId: 'SplitTextCodeNode', timestamp: '2026-08-20T10:00:00.100Z' } }) +
    sseEvent('graph.run.log', 5, { nodeId: 'SplitTextCodeNode', payload: { level: 'info', message: 'split complete', runId: RUN_ID, workflowId: WORKFLOW_ID, nodeId: 'SplitTextCodeNode', timestamp: '2026-08-20T10:00:00.200Z' } }) +
    sseEvent('graph.run.log', 6, { payload: { level: 'warn', message: 'line too long, truncated', runId: RUN_ID, workflowId: WORKFLOW_ID, nodeId: 'GraphForeachLoopNode', timestamp: '2026-08-20T10:00:00.300Z' } }) +
    sseEvent('graph.run.log', 7, { payload: { level: 'error', message: 'failed to parse input', runId: RUN_ID, workflowId: WORKFLOW_ID, nodeId: 'ResultLogNode', timestamp: '2026-08-20T10:00:00.400Z' } }) +
    sseEvent('node.stateChanged', 8, { nodeId: 'SplitTextCodeNode', payload: { state: 'succeeded' } }) +
    sseEvent('workflow.completed', 9, { status: 'succeeded' })
  );
}

/** Run that shows a stable `running` node + one succeeded edge (no terminal events). */
function visualStateBody(): string {
  return (
    sseEvent('workflow.started', 1) +
    sseEvent('node.stateChanged', 2, { nodeId: 'SplitTextCodeNode', payload: { state: 'running' } }) +
    sseEvent('edge.stateChanged', 3, { edgeId: ENGINE_EDGE_COUNT, payload: { state: 'succeeded', value: 1 } })
  );
}

interface WorkflowDocumentLike {
  nodes?: { id: string }[];
  edges?: { source?: { nodeId?: string; port?: string }; target?: { nodeId?: string; port?: string } }[];
}

/** Wire-level recorder for the canonical run trio (POST /graph/runs + SSE). */
interface RunWireRecorder {
  runCreateBodies: Record<string, unknown>[];
  eventStreamUrls: string[];
}

interface MockBackendOptions {
  /** SSE body served on the run's event stream (defaults to `fullRunBody()`). */
  body?: string;
  /**
   * `eventsUrl` returned by the `202`. Defaults to the canonical
   * `/graph/runs/{runId}/events`; a distinctive path proves the flow follows
   * the created run's reference instead of building the URL client-side.
   */
  eventsUrl?: string;
  /** Omits `resultUrl` from the `202` (wire-contract violation probe). */
  omitResultUrl?: boolean;
}

const CANONICAL_EVENTS_URL = `/graph/runs/${RUN_ID}/events`;

/** Engine plan-edge id of a document edge (`${source}:${port}->${target}:${port}`). */
function engineEdgeIdOf(edge: NonNullable<WorkflowDocumentLike['edges']>[number]): string {
  return `${edge.source?.nodeId ?? '$workflow'}:${edge.source?.port}->${edge.target?.nodeId ?? '$workflow'}:${edge.target?.port}`;
}

async function mockBackend(
  page: Page,
  options: MockBackendOptions = {}
): Promise<RunWireRecorder> {
  const recorder: RunWireRecorder = { runCreateBodies: [], eventStreamUrls: [] };
  const eventsUrl = options.eventsUrl ?? CANONICAL_EVENTS_URL;
  await page.route('**/graph/results/__health__', (route) => route.fulfill({ status: 404, body: '' }));
  // Canonical run lifecycle (DECAF-50 §4.14/§4.15): the run action always goes
  // through `202` run creation + the run-scoped SSE transport, so the mock
  // speaks the run-side wire contract.
  await page.route('**/graph/runs', (route) => {
    recorder.runCreateBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const created: Record<string, unknown> = {
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      status: 'running',
      eventsUrl,
    };
    if (!options.omitResultUrl) {
      created['resultUrl'] = `/graph/runs/${RUN_ID}`;
    }
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify(created),
    });
  });
  await page.route(`**${eventsUrl}*`, (route) => {
    recorder.eventStreamUrls.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'Cache-Control': 'no-cache' }, body: options.body ?? fullRunBody() });
  });
  await page.route(`**/graph/runs/${RUN_ID}`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        result: {
          runId: RUN_ID,
          workflowId: WORKFLOW_ID,
          status: 'succeeded',
          nodeResults: {
            SplitTextCodeNode: {
              nodeId: 'SplitTextCodeNode',
              status: 'succeeded',
              inputs: { count: 1, text: 'Hello\\nWorld' },
              outputs: { result: 5 },
            },
            GraphForeachLoopNode: {
              nodeId: 'GraphForeachLoopNode',
              status: 'succeeded',
              inputs: { items: ['Hello', 'World'] },
              outputs: { processed: 2 },
            },
            ResultLogNode: {
              nodeId: 'ResultLogNode',
              status: 'succeeded',
              inputs: { value: true },
              outputs: { logged: 5 },
            },
          },
        },
      }),
    })
  );
  return recorder;
}

async function startRun(page: Page): Promise<void> {
  const run = page.locator('button.graph-float-btn--run');
  await expect(run).toBeVisible();
  await expect(run).toBeEnabled();
  await run.click();
}

test.describe('graph run console & node I/O (DECAF-48)', () => {
  test('streams the engine run log into the on-canvas console and filters it', async ({ page }) => {
    await mockBackend(page);
    await gotoGraph(page);
    await startRun(page);

    const logs = page.locator('.graph-logs');
    await expect(logs).toBeVisible();

    const entries = logs.locator('.graph-logs__entry');
    await expect(entries).toHaveCount(4);
    await expect(entries.nth(0)).toContainText('DEBUG');
    await expect(entries.nth(0)).toContainText('parsing input text');
    await expect(entries.nth(1)).toContainText('INFO');
    await expect(entries.nth(1)).toContainText('split complete');
    await expect(entries.nth(2)).toContainText('WARN');
    await expect(entries.nth(2)).toContainText('line too long, truncated');
    await expect(entries.nth(3)).toContainText('ERROR');
    await expect(entries.nth(3)).toContainText('failed to parse input');
    await expect(entries.nth(3)).toContainText('ResultLogNode');
    // Warnings count includes warn(5)+ and above (Chrome-console semantics).
    await expect(logs.locator('.graph-logs__count')).toContainText('2 W');
    await expect(logs.locator('.graph-logs__count')).toContainText('1 E');

    // Wait for the async inspection fetch to settle before perfiltering counts
    // (only the log widget is asserted here, so no explicit wait is required).

    async function clickFilter(label: string) {
      const filter = logs.locator('.graph-logs__filter').filter({ hasText: label });
      // The output pane overlays the widget header, so force the click in JS.
      await filter.evaluate((el) => (el as HTMLElement).click());
      await expect(filter).toHaveClass(/graph-logs__filter--active/);
    }

    await clickFilter('Warnings');
    await expect(logs.locator('.graph-logs__entry')).toHaveCount(2);
    await expect(logs.locator('.graph-logs__entry').nth(0)).toContainText('line too long, truncated');
    await expect(logs.locator('.graph-logs__entry').nth(1)).toContainText('failed to parse input');

    await clickFilter('Errors');
    await expect(logs.locator('.graph-logs__entry')).toHaveCount(1);
    await expect(logs.locator('.graph-logs__entry').first()).toContainText('ERROR');

    await clickFilter('Verbose');
    await expect(logs.locator('.graph-logs__entry')).toHaveCount(4);
  });

  test('applies run visual state to nodes and edges (running green, blocked neighbours, succeeded edge)', async ({ page }) => {
    await mockBackend(page, { body: visualStateBody() });
    await gotoGraph(page);
    await startRun(page);

    // The executing node turns green (DECAF-48 §4.5).
    const split = getNodeArticle(page, 'SplitTextCodeNode');
    await expect(split).toHaveClass(/graph-node--running/);
    await expect(split).toHaveCSS('border-color', 'rgb(34, 197, 94)');

    // Nodes awaiting upstream completion are yellow (marked blocked at run start).
    await expect(getNodeArticle(page, 'GraphForeachLoopNode')).toHaveClass(/graph-node--blocked/);
    await expect(getNodeArticle(page, 'ResultLogNode')).toHaveClass(/graph-node--blocked/);

    // An edge carrying its value is highlighted (edge.stateChanged → succeeded).
    const routedEdge = page.locator('ngx-decaf-graph-edge-template').first().locator('ng-diagram-base-edge');
    await expect(routedEdge).toHaveClass(/graph-edge--succeeded/);
  });

  test('seeds every canvas edge as blocked at run start', async ({ page }) => {
    // graph.page maps each canvas edge's `data.engineEdgeId` into the store's
    // top-level shape before markAllBlocked, so both the canvas id and the
    // engine plan-edge id are seeded blocked at run start (DECAF-48 §4.4;
    // defect originally reported on SAA-114, fixed on SAA-60).
    await mockBackend(page);
    await gotoGraph(page);
    await startRun(page);

    await expect(page.locator('ng-diagram-base-edge.graph-edge--blocked')).toHaveCount(4);
  });

  test('opens the node I/O inspection panel for a completed node (JSON/table/raw)', async ({ page }) => {
    await mockBackend(page);
    await gotoGraph(page);
    await startRun(page);

    // Double-click a node that has run: opens inspection instead of the editor.
    const splitArticle = getNodeArticle(page, 'SplitTextCodeNode');
    await expect(splitArticle).toHaveClass(/graph-node--succeeded/);
    await splitArticle.dblclick({ force: true });

    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible();
    await expect(inspection.locator('.graph-node-inspection__identity')).toContainText('Split');

    // Two io-viewer panes: outputs and inputs, both defaulting to JSON.
    const viewers = inspection.locator('app-graph-io-viewer');
    await expect(viewers).toHaveCount(2);
    await expect(viewers.nth(0).locator('.graph-io__title')).toContainText('Outputs');
    await expect(viewers.nth(1).locator('.graph-io__title')).toContainText('Inputs');
    await expect(viewers.nth(0).locator('.graph-io__json')).toContainText('5');
    await expect(viewers.nth(1).locator('.graph-io__json')).toContainText('Hello');

    // Outputs viewer can switch to table and raw rendering.
    const modes = viewers.nth(0).locator('.graph-io__modes button.graph-io__mode');
    await expect(modes.nth(0)).toHaveText('json');
    await modes.filter({ hasText: 'table' }).click({ force: true });
    await expect(viewers.nth(0).locator('.graph-io__table tbody tr')).toHaveCount(1);
    await expect(viewers.nth(0).locator('.graph-io__table')).toContainText('5');

    await modes.filter({ hasText: 'raw' }).click({ force: true });
    await expect(viewers.nth(0).locator('.graph-io__raw')).toContainText('"result"');
  });
});

test.describe('canonical run trio wire contract (DECAF-50 §4.19)', () => {
  const SPLIT = 'SplitTextCodeNode';
  const FOREACH = 'GraphForeachLoopNode';
  const RESULT_LOG = 'ResultLogNode';
  const EDITOR_EDGE_IDS = [
    `$workflow:count->${SPLIT}:data`,
    `$workflow:text->${SPLIT}:data`,
    `${SPLIT}:result->${FOREACH}:items`,
    `${FOREACH}:completed->${RESULT_LOG}:value`,
    // The document also carries the workflow output boundary edge.
    `${RESULT_LOG}:logged->$workflow:result`,
  ];

  test('run action posts the exact editor document and follows the 202 eventsUrl from sequence zero', async ({ page }) => {
    // A distinctive eventsUrl proves the flow consumes the created run's
    // reference instead of building the stream URL client-side.
    const wire = await mockBackend(page, { eventsUrl: `/graph/runs/${RUN_ID}/stream` });
    await gotoGraph(page);
    await startRun(page);

    await expect.poll(() => wire.runCreateBodies.length).toBe(1);
    const createBody = wire.runCreateBodies[0];
    // Document mode: the workflow is submitted inline, never by workflowId.
    expect(createBody['workflowId']).toBeUndefined();
    expect(createBody['inputs']).toMatchObject({ count: 1 });
    const workflow = createBody['workflow'] as WorkflowDocumentLike;
    const nodeIds = (workflow.nodes ?? []).map((node) => node.id);
    for (const nodeId of [SPLIT, FOREACH, RESULT_LOG]) {
      expect(nodeIds).toContain(nodeId);
    }
    // The exact editor document: the run consumes the demo canvas's own
    // plan-edge set (boundaries anchored on `$workflow`).
    const runEdgeIds = (workflow.edges ?? []).map(engineEdgeIdOf).sort();
    expect(runEdgeIds).toEqual([...EDITOR_EDGE_IDS].sort());

    // The SSE connect went to the 202's eventsUrl, replaying from zero (§4.15).
    await expect.poll(() => wire.eventStreamUrls.length).toBeGreaterThan(0);
    expect(wire.eventStreamUrls[0]).toContain(`/graph/runs/${RUN_ID}/stream`);
    expect(wire.eventStreamUrls[0]).toContain('afterSequence=0');

    // The referenced stream actually drove the run to completion.
    await expect(getNodeArticle(page, SPLIT)).toHaveClass(/graph-node--succeeded/);
  });

  test('applies every live node/edge event before the terminal event closes the stream (§4.19 step 11)', async ({ page }) => {
    await mockBackend(page);
    await gotoGraph(page);
    await startRun(page);

    // All pre-terminal live events are applied by the time the terminal
    // event folds the run: the live node event (seq 8) marks the node
    // succeeded, the live edge event (seq 3) marks the edge succeeded, and
    // every live log event (seq 4–7) is folded into the console — none are
    // dropped by the stream stopping at the terminal event (seq 9).
    await expect(getNodeArticle(page, SPLIT)).toHaveClass(/graph-node--succeeded/);
    const routedEdge = page.locator('ngx-decaf-graph-edge-template').first().locator('ng-diagram-base-edge');
    await expect(routedEdge).toHaveClass(/graph-edge--succeeded/);

    const logs = page.locator('.graph-logs');
    await expect(logs.locator('.graph-logs__entry')).toHaveCount(4);

    // Terminal fold ran strictly after the live events: the stored result is
    // reachable through the completed node's inspection panel.
    await getNodeArticle(page, SPLIT).dblclick({ force: true });
    await expect(page.locator('.graph-node-inspection')).toBeVisible();
    await expect(page.locator('.graph-node-inspection .graph-io__json').first()).toContainText('5');
  });

  test('rejects a 202 without resultUrl and never opens the event stream', async ({ page }) => {
    // The created-run response is out of contract without `resultUrl`
    // (§4.14/§4.20: run creation must return eventsUrl/resultUrl) — the flow
    // must refuse it before connecting the run's SSE transport.
    const wire = await mockBackend(page, { omitResultUrl: true });
    await gotoGraph(page);
    await startRun(page);

    await expect.poll(() => wire.runCreateBodies.length).toBe(1);
    await page.waitForTimeout(1500);
    expect(wire.eventStreamUrls).toHaveLength(0);
  });
});
