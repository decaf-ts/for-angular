import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Real-backend proof for the hydrated demo workflow (DECAF-50 R2 / board item 8).
 *
 * Unlike every other spec under `tests/playwright/graph` — which route-mocks
 * `POST /graph/runs` and `GET /graph/runs/:runId` — this suite talks to the
 * REAL nest graph module the Playwright `webServer` boots on :3000
 * (`npm run start:backend`, `GRAPH_BACKEND_URL`). It feeds the exact serialized
 * document the frontend produces (`graphDecoratedWorkflowCompiler` +
 * `hydrateGraphWorkflowDocumentValues`, captured under
 * `tests/fixtures/graph/text-pipeline.document.json`) through the real
 * `POST /graph/workflows/validate` and `POST /graph/runs` surfaces, then reads
 * the stored run result.
 *
 * The fixture is the SAA-1635 frontend deliverable: node instance property
 * values (`parameters.code`, `inputBindings.value`) live in the document, so the
 * backend never reads a frontend class.
 *
 * SAA-1659: the Code/Map kinds are reclassified to `core.utility.*` (DECAF-50 R2).
 * The main run only publishes the top-level member nodes — the engine filters the
 * nested loop-body node results out of `result.nodeResults` — so the in-loop
 * `LoopItemLogNode` is proven by executing the foreach body document standalone
 * once per split item, which surfaces its `logged` output.
 */

const BACKEND_URL = process.env['GRAPH_BACKEND_URL'] ?? 'http://127.0.0.1:3000';

const DOCUMENT_PATH = join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'graph',
  'text-pipeline.document.json'
);

const WORKFLOW_ID = 'graph-workflow-root';
const FOREACH_NODE_ID = 'GraphForeachLoopNode';
const SPLIT_NODE_ID = 'SplitTextCodeNode';
const LOG_NODE_ID = 'ResultLogNode';
const BODY_LOG_NODE_ID = 'LoopItemLogNode';

const INPUT_TEXT = 'Hello\nWorld\nFoo\nBar\nBaz';
const INPUT_ITEMS = ['Hello', 'World', 'Foo', 'Bar', 'Baz'];

const TERMINAL_STATUSES = ['succeeded', 'failed', 'cancelled'];

interface GraphRunDocument {
  id: string;
  name: string;
  nodes?: Array<{ id: string; kind: string; loop?: { body?: GraphRunDocument } }>;
  [key: string]: unknown;
}

interface GraphRunNodeResult {
  status?: string;
  outputs?: Record<string, unknown>;
}

interface GraphRunEvent {
  type?: string;
  payload?: Record<string, unknown>;
}

interface GraphRunResultBody {
  status?: string;
  outputs?: Record<string, unknown>;
  nodeResults?: Record<string, GraphRunNodeResult>;
  events?: GraphRunEvent[];
}

interface GraphRunResult {
  status?: string;
  result?: GraphRunResultBody;
  events?: GraphRunEvent[];
  error?: unknown;
}

function loadDocument(): GraphRunDocument {
  return JSON.parse(readFileSync(DOCUMENT_PATH, 'utf8')) as GraphRunDocument;
}

/** The foreach node's embedded body workflow (the per-item sub-document). */
function loadForeachBody(): GraphRunDocument {
  const foreach = loadDocument().nodes?.find((node) => node.id === FOREACH_NODE_ID);
  const body = foreach?.loop?.body;
  if (!body) throw new Error(`foreach node ${FOREACH_NODE_ID} carries no loop body`);
  return body;
}

/** Polls the stored run until the engine reaches a terminal status. */
async function waitForTerminalRun(
  request: APIRequestContext,
  runId: string,
  timeoutMs = 30_000
): Promise<GraphRunResult> {
  const deadline = Date.now() + timeoutMs;
  let last: GraphRunResult = {};
  while (Date.now() < deadline) {
    const response = await request.get(`${BACKEND_URL}/graph/runs/${runId}`);
    expect(response.ok(), await response.text()).toBeTruthy();
    last = (await response.json()) as GraphRunResult;
    if (last.status && TERMINAL_STATUSES.includes(last.status)) return last;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `run ${runId} did not reach a terminal status within ${timeoutMs}ms (last status: ${last.status})`
  );
}

/** Submits a workflow document and returns the terminal run result. */
async function runDocument(
  request: APIRequestContext,
  workflow: GraphRunDocument,
  inputs: Record<string, unknown>
): Promise<GraphRunResult> {
  const createResponse = await request.post(`${BACKEND_URL}/graph/runs`, {
    data: { workflow, inputs },
  });
  expect(createResponse.status(), await createResponse.text()).toBe(202);
  const created = (await createResponse.json()) as { runId: string };
  expect(created.runId).toBeTruthy();
  return waitForTerminalRun(request, created.runId);
}

test.describe('real backend text pipeline (DECAF-50 R2)', () => {
  test('validates and executes the hydrated demo document', async ({ request }) => {
    const document = loadDocument();

    const validationResponse = await request.post(
      `${BACKEND_URL}/graph/workflows/validate`,
      { data: document }
    );
    expect(validationResponse.ok(), await validationResponse.text()).toBeTruthy();
    const validation = (await validationResponse.json()) as {
      valid?: boolean;
      issues?: unknown[];
    };
    expect(validation.valid, JSON.stringify(validation.issues)).toBe(true);
    expect(validation.issues).toEqual([]);

    const createResponse = await request.post(`${BACKEND_URL}/graph/runs`, {
      data: { workflow: document, inputs: { count: 1, text: INPUT_TEXT } },
    });
    expect(createResponse.status(), await createResponse.text()).toBe(202);
    const created = (await createResponse.json()) as {
      runId: string;
      workflowId: string;
      status: string;
      resultUrl: string;
    };
    expect(created.status).toBe('queued');
    expect(created.workflowId).toBe(WORKFLOW_ID);
    expect(created.resultUrl).toBe(`/graph/runs/${created.runId}`);

    const run = await waitForTerminalRun(request, created.runId);
    expect(run.status).toBe('succeeded');

    const nodeResults = run.result?.nodeResults ?? {};
    const split = nodeResults[SPLIT_NODE_ID]?.outputs?.result;
    const foreach = nodeResults[FOREACH_NODE_ID]?.outputs ?? {};
    const completed = foreach['completed'] as unknown[];
    const logged = nodeResults[LOG_NODE_ID]?.outputs?.logged;

    // The Code node split the raw input into one chunk per line.
    expect(split).toEqual(INPUT_ITEMS);

    // One foreach iteration per input item; `completed` is positionally aligned
    // with the input items and forwards each item unchanged (SAA-1659: the engine
    // no longer emits `null` at odd indices).
    expect(foreach['iterations']).toBe(INPUT_ITEMS.length);
    expect(completed).toHaveLength(INPUT_ITEMS.length);
    expect(completed).toEqual(INPUT_ITEMS);
    INPUT_ITEMS.forEach((item, index) => {
      expect(completed[index]).toBe(item);
    });

    // Board item 8: the workflow output carries the foreach `completed` results
    // and the ResultLog node logs those results rather than a hardcoded payload.
    expect(run.result?.outputs?.result).toEqual(completed);
    expect(logged).toEqual(completed);
  });

  test('logs every split item through the in-loop Log node (foreach body)', async ({
    request,
  }) => {
    // The main run's `result.nodeResults` only publishes the top-level member
    // nodes (Split / Foreach / ResultLog); the nested loop-body nodes are filtered
    // out of the run stream. Execute the foreach body document standalone once
    // per split item to observe the in-loop `LoopItemLogNode` output directly.
    const body = loadForeachBody();

    for (const item of INPUT_ITEMS) {
      const run = await runDocument(request, body, { item });
      expect(run.status, JSON.stringify(run.error)).toBe('succeeded');

      const logged = run.result?.nodeResults?.[BODY_LOG_NODE_ID]?.outputs?.logged;
      expect(logged).toBe(item);
    }
  });

  test('streams graph.run.log records and terminal ran states (R4-2)', async ({
    request,
  }) => {
    // R4-2 regression pin: the engine must stream `graph.run.log` records for a
    // user-authored document (the frontend console renders these) and every member
    // node must reach a terminal ran state (drives the ran-node visuals, R4-5).
    const document = loadDocument();
    const run = await runDocument(request, document, { count: 1, text: INPUT_TEXT });
    expect(run.status, JSON.stringify(run.error)).toBe('succeeded');

    const nodeResults = run.result?.nodeResults ?? {};
    for (const nodeId of [SPLIT_NODE_ID, FOREACH_NODE_ID, LOG_NODE_ID]) {
      expect(nodeResults[nodeId]?.status, `${nodeId} ran`).toBe('succeeded');
    }

    const events = run.result?.events ?? run.events ?? [];
    const logEvents = events.filter((event) => event.type === 'graph.run.log');
    expect(logEvents.length).toBeGreaterThan(0);
    expect(
      logEvents.some((event) => event.payload?.['nodeId'] === LOG_NODE_ID),
      'the ResultLog node must emit a graph.run.log record'
    ).toBe(true);
    // Every streamed run-log record carries a message and a severity the console
    // can render (R4-2: no record may be dropped by an unmodelled level).
    for (const event of logEvents) {
      expect(typeof event.payload?.['message'], 'log message').toBe('string');
      expect(typeof event.payload?.['level'], 'log level').toBe('string');
    }
  });
});
