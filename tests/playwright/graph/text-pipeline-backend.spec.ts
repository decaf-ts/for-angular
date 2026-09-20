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

const INPUT_TEXT = 'Hello\nWorld\nFoo\nBar\nBaz';
const INPUT_ITEMS = ['Hello', 'World', 'Foo', 'Bar', 'Baz'];

/**
 * Current engine contract for the body result array, positionally aligned with the
 * input items: even indices carry the even-branch Code node's result for that
 * input item; odd indices are `null`. The engine executes BOTH switch branch
 * nodes and the even-branch Code node routes `result: undefined` last on odd
 * iterations, overwriting the odd-branch Log node's forwarded value. Reported as
 * a follow-up finding on SAA-1640 (backend engine behavior, out of this task's
 * `for-angular` test scope).
 */
const EXPECTED_COMPLETED = ['Hello', null, 'Foo', null, 'Baz'];

const TERMINAL_STATUSES = ['succeeded', 'failed', 'cancelled'];

interface GraphRunDocument {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface GraphRunNodeResult {
  status?: string;
  outputs?: Record<string, unknown>;
}

interface GraphRunResult {
  status?: string;
  outputs?: Record<string, unknown>;
  nodeResults?: Record<string, GraphRunNodeResult>;
  error?: unknown;
}

function loadDocument(): GraphRunDocument {
  return JSON.parse(readFileSync(DOCUMENT_PATH, 'utf8')) as GraphRunDocument;
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

    // One foreach iteration per input item, with a positionally aligned result
    // array: `completed[i]` corresponds to input item `i`.
    expect(foreach['iterations']).toBe(INPUT_ITEMS.length);
    expect(completed).toHaveLength(INPUT_ITEMS.length);
    expect(completed).toEqual(EXPECTED_COMPLETED);
    INPUT_ITEMS.forEach((item, index) => {
      if (index % 2 === 0) expect(completed[index]).toBe(item);
    });

    // Board item 8: the workflow output carries the foreach `completed` results
    // and the ResultLog node logs those results rather than a hardcoded payload.
    expect(run.result?.outputs?.result).toEqual(completed);
    expect(logged).toEqual(completed);
  });
});
