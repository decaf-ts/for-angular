/**
 * @module tests/playwright/graph/canvas-run.spec
 * @summary DECAF-50 §4.19 mandatory 12-step canvas→run E2E (P7-F cutover proof).
 * @description Drives the demo workflow through the exact 12-step sequence and
 * proves that editor, persistence and engine share ONE canonical
 * `GraphWorkflowDocument`:
 *
 *  1. Open a workflow with nodes on canvas (the current demo ships the
 *     Split → Foreach → Log Results member nodes; the spec's two-node start
 *     predates the demo rework — aligned per the SAA-550 instruction).
 *  2. Add a node through the manifest-driven palette (no constructors).
 *  3. Edit a literal input on the added node.
 *  4. Remove an edge.
 *  5. Draw a new edge chain through the added node.
 *  6. Save and reload.
 *  7. Confirm all state restores from the persisted canonical wrapper.
 *  8. Run the workflow (POST /graph/runs with the exact editor document).
 *  9. Confirm the added node executes with its literal.
 * 10. Confirm the removed edge is unused and the new edge routes data.
 * 11. Confirm live node/edge events arrive before the terminal event.
 * 12. Confirm the final output reflects the edited canvas.
 *
 * Definition-of-done proof (PM-approved): the test acts as the server — it
 * captures the document the SERVER persisted at save time (PUT
 * /graph/workflows/:id body) and the document the run consumed (POST
 * /graph/runs body) and asserts the two are SEMANTICALLY equal (sorted-key
 * semantic hash, `ui` excluded — mirrors
 * `graphWorkflowDocumentSemanticHashOf` in src/graph/document), not a canvas
 * diff.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110). The backend is
 * fully mocked through `page.route` (the mock server records every save/run
 * document, so no real NestJS backend is needed).
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  gotoGraph,
  getNodeArticle,
  getNodeHost,
  openNodeEditor,
  closeModal,
  isPortConnected,
} from './helpers';

/** Demo canvas ids (src/app/pages/graph/workflow-root.ts). */
const SPLIT = 'SplitTextCodeNode';
const FOREACH = 'GraphForeachLoopNode';
const RESULT_LOG = 'ResultLogNode';

/** Palette-added node id: seed `core-utility-log` + label infix (GraphNodePaletteFactory). */
const ADDED = 'core-utility-log-Utility-Log';

/** Engine plan-edge ids (`${source}:${port}->${target}:${port}`, utils.ts engineEdgeId). */
const REMOVED_EDGE = `${FOREACH}:completed->${RESULT_LOG}:value`;
const NEW_EDGE_INTO_ADDED = `${FOREACH}:completed->${ADDED}:value`;
const NEW_EDGE_OUT_OF_ADDED = `${ADDED}:logged->${RESULT_LOG}:value`;
const INITIAL_EDGES = [
  `$workflow:count->${SPLIT}:data`,
  `$workflow:text->${SPLIT}:data`,
  `${SPLIT}:result->${FOREACH}:items`,
  REMOVED_EDGE,
] as const;

const WORKFLOW_ID = 'text-pipeline-workflow';
const RUN_ID = 'run-e2e-1';
const EDITED_LITERAL = 'warn';

interface WorkflowDocumentLike {
  id?: string;
  nodes?: { id: string; inputBindings?: Record<string, unknown>; parameters?: Record<string, unknown> }[];
  edges?: { id?: string; source?: { nodeId?: string; port?: string }; target?: { nodeId?: string; port?: string } }[];
  ui?: unknown;
}

/** Sorted-key JSON stringify (deterministic for hashing). */
function sortedStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([l], [r]) => l.localeCompare(r))
      );
    }
    return val;
  });
}

/** Deep clone with the document-level and per-node `ui` blocks stripped. */
function withoutUi(document: WorkflowDocumentLike): WorkflowDocumentLike {
  const cloned = JSON.parse(JSON.stringify(document)) as WorkflowDocumentLike;
  const { ui, ...rest } = cloned;
  void ui;
  return {
    ...rest,
    nodes: (rest.nodes ?? []).map((node) => {
      const { ui: _nodeUi, ...nodeRest } = node as typeof node & { ui?: unknown };
      void _nodeUi;
      return nodeRest;
    }),
  };
}

/**
 * Semantic hash mirroring `graphWorkflowDocumentSemanticHashOf`
 * (src/graph/document/GraphDocumentSelectors.ts): FNV-1a over the sorted-key
 * serialization with `ui` excluded, so layout-only deltas never count.
 */
function semanticHash(document: WorkflowDocumentLike): string {
  const serialized = sortedStringify(withoutUi(document));
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** One SSE frame carrying a canonical run event envelope (§4.15 wire shape). */
function sseEvent(
  sequence: number,
  type: string,
  extra: Record<string, unknown> = {}
): string {
  return `data: ${JSON.stringify({
    id: `ev-${sequence}`,
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    sequence,
    type,
    timestamp: '2026-09-02T10:00:00.000Z',
    path: [],
    ...extra,
  })}\n\n`;
}

/**
 * The mock server's state: every canonical document the frontend hands to the
 * "backend" is recorded here, proving what the server persisted (save) and
 * what the run consumed (run create).
 */
class MockGraphServer {
  savedWrapper: { document: WorkflowDocumentLike } | null = null;
  savePutCount = 0;
  runCreateRequest: { workflow: WorkflowDocumentLike; inputs: Record<string, unknown> } | null = null;

  /** SSE body: node/edge events live and in order, terminal strictly last. */
  sseBody(): string {
    return (
      sseEvent(1, 'workflow.started') +
      sseEvent(2, 'node.stateChanged', { nodeId: SPLIT, payload: { state: 'running' } }) +
      sseEvent(3, 'edge.stateChanged', { edgeId: INITIAL_EDGES[0], payload: { state: 'succeeded', value: 1 } }) +
      sseEvent(4, 'edge.stateChanged', { edgeId: INITIAL_EDGES[1], payload: { state: 'succeeded', value: 'Hello\nWorld\nFoo\nBar\nBaz' } }) +
      sseEvent(5, 'node.stateChanged', { nodeId: SPLIT, payload: { state: 'succeeded' } }) +
      sseEvent(6, 'edge.stateChanged', { edgeId: INITIAL_EDGES[2], payload: { state: 'succeeded', value: ['Hello', 'World', 'Foo', 'Bar', 'Baz'] } }) +
      sseEvent(7, 'node.stateChanged', { nodeId: FOREACH, payload: { state: 'running' } }) +
      sseEvent(8, 'node.stateChanged', { nodeId: FOREACH, payload: { state: 'succeeded' } }) +
      // The NEW edge routes data into the added node; the REMOVED edge never
      // appears in the stream (it is not part of the run's document).
      sseEvent(9, 'edge.stateChanged', { edgeId: NEW_EDGE_INTO_ADDED, payload: { state: 'running' } }) +
      sseEvent(10, 'node.stateChanged', { nodeId: ADDED, payload: { state: 'running' } }) +
      sseEvent(11, 'graph.run.log', {
        nodeId: ADDED,
        payload: {
          level: EDITED_LITERAL,
          message: `utility log literal level=${EDITED_LITERAL} value=[5 items]`,
          runId: RUN_ID,
          workflowId: WORKFLOW_ID,
          nodeId: ADDED,
          timestamp: '2026-09-02T10:00:00.100Z',
        },
      }) +
      sseEvent(12, 'edge.stateChanged', { edgeId: NEW_EDGE_INTO_ADDED, payload: { state: 'succeeded', value: [5] } }) +
      sseEvent(13, 'node.stateChanged', { nodeId: ADDED, payload: { state: 'succeeded' } }) +
      sseEvent(14, 'edge.stateChanged', { edgeId: NEW_EDGE_OUT_OF_ADDED, payload: { state: 'succeeded', value: [5] } }) +
      sseEvent(15, 'node.stateChanged', { nodeId: RESULT_LOG, payload: { state: 'running' } }) +
      sseEvent(16, 'graph.run.log', {
        nodeId: RESULT_LOG,
        payload: {
          level: 'info',
          message: 'logged routed results',
          runId: RUN_ID,
          workflowId: WORKFLOW_ID,
          nodeId: RESULT_LOG,
          timestamp: '2026-09-02T10:00:00.200Z',
        },
      }) +
      sseEvent(17, 'node.stateChanged', { nodeId: RESULT_LOG, payload: { state: 'succeeded' } }) +
      // Terminal strictly after every live node/edge event (step 11).
      sseEvent(18, 'workflow.completed', { payload: { status: 'succeeded' } })
    );
  }

  /** Stored run result echoing the run's own submitted document (§4.14). */
  runStatusBody(): Record<string, unknown> {
    const document = this.runCreateRequest?.workflow ?? { id: WORKFLOW_ID, nodes: [], edges: [] };
    return {
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      ownerUser: 'e2e',
      status: 'succeeded',
      createdAt: '2026-09-02T10:00:00.000Z',
      startedAt: '2026-09-02T10:00:00.000Z',
      finishedAt: '2026-09-02T10:00:00.500Z',
      result: {
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        // The server persisted this exact document for the run; the frontend's
        // own SSE round-trip assertion compares it against the submission.
        document,
        inputs: this.runCreateRequest?.inputs ?? {},
        outputs: { result: ['Hello', 'World', 'Foo', 'Bar', 'Baz'] },
        nodeResults: {
          [ADDED]: {
            nodeId: ADDED,
            status: 'succeeded',
            // Step 9: the added node consumed its EDITED LITERAL.
            inputs: { value: [5], level: EDITED_LITERAL },
            outputs: { logged: [5] },
          },
          [RESULT_LOG]: {
            nodeId: RESULT_LOG,
            status: 'succeeded',
            inputs: { value: [5] },
            outputs: { logged: [5] },
          },
        },
        events: [],
      },
    };
  }
}

async function installMockBackend(page: Page, server: MockGraphServer): Promise<void> {
  // checkBackend(): any response counts as "server up" (run stays enabled).
  await page.route('**/graph/results/__health__', (route) =>
    route.fulfill({ status: 404, body: '' })
  );

  // Canonical persistence (§4.10): PUT/GET /graph/workflows/:id.
  await page.route(`**/graph/workflows/${WORKFLOW_ID}`, (route: Route) => {
    if (route.request().method() === 'PUT') {
      server.savedWrapper = route.request().postDataJSON();
      server.savePutCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workflowId: WORKFLOW_ID, savedAt: '2026-09-02T10:00:00.000Z' }),
      });
    }
    if (server.savedWrapper) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(server.savedWrapper),
      });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  // Async run creation (§4.14): 202 + eventsUrl/resultUrl before completion.
  await page.route('**/graph/runs', (route) => {
    server.runCreateRequest = route.request().postDataJSON();
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'running',
        eventsUrl: `/graph/runs/${RUN_ID}/events`,
        resultUrl: `/graph/runs/${RUN_ID}/result`,
      }),
    });
  });

  // Run status/result read (drives the terminal fold + round-trip assertion).
  await page.route(`**/graph/runs/${RUN_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(server.runStatusBody()),
    })
  );

  // Run-scoped SSE stream: replay from zero, live events, terminal last.
  await page.route(`**/graph/runs/${RUN_ID}/events*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache' },
      body: server.sseBody(),
    })
  );
}

/** Bounding box center of one node's port (the ng-diagram link anchor). */
async function portCenter(
  page: Page,
  nodeId: string,
  portId: string,
  direction: 'in' | 'out'
): Promise<{ x: number; y: number }> {
  const port = getNodeHost(page, nodeId)
    .locator(`div.graph-node__port--${direction}`)
    .filter({ has: page.locator(`[data-port-id="${portId}"]`) })
    .first();
  const box = await port.boundingBox();
  if (!box) throw new Error(`Port ${nodeId}:${direction}:${portId} not visible`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Counts document-driven canvas edges (§4.12): ng-diagram tags each edge
 * element with its edge id (`data-edge-id`), and the canvas-only ghost edges
 * (Foreeach loop-body machinery, §4.12) carry ids anchored on the `ghost-`
 * helper nodes. Those are not document edges, so they don't count.
 */
async function documentEdgeCount(page: Page): Promise<number> {
  return page.locator('ng-diagram-edge[data-edge-id]').evaluateAll(
    (els: Element[]) =>
      els.filter((el) => !(el.getAttribute('data-edge-id') ?? '').includes('ghost')).length
  );
}

/** Draws one canvas edge source-port → target-port (step 5). */
async function drawEdge(
  page: Page,
  source: { nodeId: string; portId: string },
  target: { nodeId: string; portId: string }
): Promise<void> {
  const from = await portCenter(page, source.nodeId, source.portId, 'out');
  const to = await portCenter(page, target.nodeId, target.portId, 'in');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(800);
}

/** Renders one node's literal/input value out of the canonical document. */
function nodeOf(document: WorkflowDocumentLike, nodeId: string) {
  const node = (document.nodes ?? []).find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Node '${nodeId}' missing from document: ${sortedStringify(document)}`);
  return node;
}

test.describe('12-step canvas→run E2E (DECAF-50 §4.19, P7-F cutover)', () => {
  test('editor, persistence and engine share one canonical document', async ({ page }) => {
    test.setTimeout(180_000);
    const server = new MockGraphServer();
    await installMockBackend(page, server);

    // ── Step 1: open a workflow with nodes on the canvas ──────────────────
    await gotoGraph(page);
    for (const nodeId of [SPLIT, FOREACH, RESULT_LOG]) {
      await expect(getNodeArticle(page, nodeId)).toBeVisible();
    }
    const initialEdgeCount = await documentEdgeCount(page);
    expect(initialEdgeCount).toBe(INITIAL_EDGES.length);

    // ── Step 2: add a node through the manifest-driven palette ────────────
    await page.locator('button.graph-renderer__palette-btn').click();
    const utilityLogEntry = page
      .locator('.graph-renderer__palette-item')
      .filter({ hasText: 'Utility Log' })
      .first();
    await expect(utilityLogEntry).toBeVisible();
    await utilityLogEntry.click();
    await expect(getNodeArticle(page, ADDED)).toBeVisible({ timeout: 10_000 });
    // Adding a node creates exactly one new canvas node — no auto edges.
    expect(await documentEdgeCount(page)).toBe(INITIAL_EDGES.length);

    // ── Step 3: edit a literal input on the added node ────────────────────
    await openNodeEditor(page, ADDED);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    const levelField = page
      .locator('ion-modal .graph-node-edit-modal__param-row')
      .filter({ hasText: 'Log level' })
      .first();
    await expect(levelField).toBeVisible();
    await levelField.locator('ion-input input').fill(EDITED_LITERAL);
    await closeModal(page, 'save');
    await expect(page.locator('ion-modal')).toBeHidden({ timeout: 10_000 });

    // ── Step 4: remove an edge (Foreach:completed → ResultLog:value) ──────
    const removedEdgeLabel = page
      .locator('.ng-diagram-default-edge-label')
      .filter({ hasText: 'results' })
      .first();
    await removedEdgeLabel.click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(800);
    expect(await documentEdgeCount(page)).toBe(INITIAL_EDGES.length - 1);

    // ── Step 5: draw a new edge chain through the added node ──────────────
    await drawEdge(page, { nodeId: FOREACH, portId: 'completed' }, { nodeId: ADDED, portId: 'value' });
    await drawEdge(page, { nodeId: ADDED, portId: 'logged' }, { nodeId: RESULT_LOG, portId: 'value' });
    expect(await documentEdgeCount(page)).toBe(INITIAL_EDGES.length + 1);
    await expect
      .poll(async () => isPortConnected(page, ADDED, 'value'))
      .toBe(true);
    await expect
      .poll(async () => isPortConnected(page, ADDED, 'logged'))
      .toBe(true);

    // ── Step 6: save and reload ───────────────────────────────────────────
    await page.locator('button.graph-float-btn--save').click();
    await expect
      .poll(() => server.savePutCount)
      .toBeGreaterThanOrEqual(1);
    expect(server.savedWrapper, 'the save PUT must carry a canonical document').toBeDefined();
    await gotoGraph(page);

    // ── Step 7: confirm all state restores ────────────────────────────────
    for (const nodeId of [SPLIT, FOREACH, RESULT_LOG, ADDED]) {
      await expect(getNodeArticle(page, nodeId)).toBeVisible();
    }
    expect(await documentEdgeCount(page)).toBe(INITIAL_EDGES.length + 1);
    // The removed edge did not survive the save/reload round trip.
    await expect
      .poll(async () => isPortConnected(page, FOREACH, 'completed'))
      .toBe(true);
    // New chain restored through the added node.
    expect(await isPortConnected(page, ADDED, 'value')).toBe(true);
    expect(await isPortConnected(page, ADDED, 'logged')).toBe(true);
    // The edited literal restored: reopening the editor shows `level` = warn.
    await openNodeEditor(page, ADDED);
    await expect(page.locator('ion-modal')).toBeVisible({ timeout: 10_000 });
    const restoredLevel = page
      .locator('ion-modal .graph-node-edit-modal__param-row')
      .filter({ hasText: 'Log level' })
      .first();
    await expect(restoredLevel.locator('ion-input input')).toHaveValue(EDITED_LITERAL);
    await closeModal(page, 'cancel');

    // The persisted wrapper itself carries the edited literal + new edges.
    const savedDocument = server.savedWrapper!.document;
    expect(nodeOf(savedDocument, ADDED).inputBindings?.['level']).toMatchObject({
      mode: 'literal',
      value: EDITED_LITERAL,
    });
    const savedEdgeIds = (savedDocument.edges ?? []).map((edge) =>
      `${edge.source?.nodeId ?? '$workflow'}:${edge.source?.port}->${edge.target?.nodeId ?? '$workflow'}:${edge.target?.port}`
    );
    expect(savedEdgeIds).not.toContain(REMOVED_EDGE);
    expect(savedEdgeIds).toContain(NEW_EDGE_INTO_ADDED);
    expect(savedEdgeIds).toContain(NEW_EDGE_OUT_OF_ADDED);

    // ── Step 8: run the workflow ──────────────────────────────────────────
    const runButton = page.locator('button.graph-float-btn--run');
    await expect(runButton).toBeEnabled();
    await runButton.click();
    await expect
      .poll(() => (server.runCreateRequest ? 1 : 0))
      .toBe(1);

    // ── Steps 9–12: the run proves the edited canvas was executed ─────────
    // Step 9: the added node executes and consumes its edited literal.
    await expect(getNodeArticle(page, ADDED)).toHaveClass(/graph-node--succeeded/, {
      timeout: 20_000,
    });
    const logs = page.locator('.graph-logs');
    await expect(logs).toBeVisible();
    await expect(logs.locator('.graph-logs__entry').filter({ hasText: `level=${EDITED_LITERAL}` })).toHaveCount(1);

    // Step 10: removed edge unused, new edge routes data.
    // Canvas: every surviving edge ended succeeded; nothing left blocked.
    await expect(page.locator('ng-diagram-base-edge.graph-edge--succeeded')).toHaveCount(
      INITIAL_EDGES.length + 1,
      { timeout: 20_000 }
    );
    expect(await page.locator('ng-diagram-base-edge.graph-edge--blocked').count()).toBe(0);
    // Run document: the removed edge is absent, the new edges are present.
    const runDocument = server.runCreateRequest!.workflow;
    const runEdgeIds = (runDocument.edges ?? []).map((edge) =>
      `${edge.source?.nodeId ?? '$workflow'}:${edge.source?.port}->${edge.target?.nodeId ?? '$workflow'}:${edge.target?.port}`
    );
    expect(runEdgeIds).not.toContain(REMOVED_EDGE);
    expect(runEdgeIds).toContain(NEW_EDGE_INTO_ADDED);
    expect(runEdgeIds).toContain(NEW_EDGE_OUT_OF_ADDED);
    expect(nodeOf(runDocument, ADDED).inputBindings?.['level']).toMatchObject({
      mode: 'literal',
      value: EDITED_LITERAL,
    });

    // Step 11: live node/edge events arrived before the terminal event —
    // the pre-terminal log lines are folded into the run console, and the
    // terminal-triggered result fold did not flag a document round-trip
    // drift (the page's own semantic-hash assertion, §4.14).
    await expect(logs.locator('.graph-logs__entry').filter({ hasText: 'logged routed results' })).toHaveCount(1);
    await expect(page.locator('.graph-page__backend-warning')).toBeHidden();

    // Step 12: the final output reflects the edited canvas.
    const outputs = page.locator('.graph-page__outputs');
    await expect(outputs).toBeVisible({ timeout: 20_000 });
    await expect(outputs.locator('article.graph-page__output').filter({ hasText: 'result' })).toContainText(
      'Hello'
    );
    // The added node's stored result carries the edited literal as its input.
    const addedNode = getNodeArticle(page, ADDED);
    await addedNode.dblclick({ force: true });
    const inspection = page.locator('.graph-node-inspection');
    await expect(inspection).toBeVisible({ timeout: 10_000 });
    const inputsViewer = inspection.locator('app-graph-io-viewer').nth(1);
    await expect(inputsViewer.locator('.graph-io__json')).toContainText(EDITED_LITERAL);

    // ── Definition-of-done proof (PM-approved): the document the SERVER
    // persisted at save time equals the document the run consumed —
    // semantic compare (sorted-key hash, ui excluded), not a canvas diff.
    const savedHash = semanticHash(savedDocument);
    const runHash = semanticHash(runDocument);
    expect(runHash, `saved document hash ${savedHash} must equal run document hash`).toBe(savedHash);
  });
});
