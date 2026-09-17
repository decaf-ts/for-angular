/**
 * @module tests/playwright/graph/graph-node-inspection.spec
 * @summary DECAF-50 §4.22 D3 / §4.24 P0 #3 gate-2 E2E contract.
 * @description Pins the D3 ruling (PR-C) on the live demo:
 *
 *  1. Double-click ALWAYS opens CRUD — pre-run opens the edit modal, post-run
 *     opens the three-pane split view whose CENTER pane is the CRUD form, and the
 *     modal must NOT open for a ran node (regression pin for the `hasRan`
 *     takeover, G3-10).
 *  2. A ran node shows run inputs LEFT / CRUD CENTER / run outputs RIGHT with
 *     all three populated — the "NOTHING APPEARS" regression pin (G3-11/G3-12).
 *  3. A run-result fetch miss renders an explicit empty/failed state with a retry
 *     affordance, never a blank panel, and the retry recovers once the backend
 *     serves the stored result (G3-12/G3-33).
 *  4. Workflow-boundary double-click CRUD: the input boundary opens the
 *     editable workflow-input form bound to the renderer's own run-input form, the
 *     output boundary renders its value read-only (G3-10/G3-13).
 *
 * Scenario isolation (gate-2 infra requirement): `graphInspection` is a
 * module-level singleton, so every `beforeEach` re-navigates to the graph route
 * (`gotoGraph`), which reloads the app and resets the inspection/run-result
 * state. No scenario inherits a payload or open node from another.
 *
 * RUN REQUIREMENTS: the Playwright `webServer` boots the frontend (:8110) and the
 * backend (:3000). The backend is fully mocked through `page.route` (run creation,
 * SSE transport, stored-result read), so the assertions are deterministic.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  gotoGraph,
  getNodeArticle,
  openNodeEditor,
  closeModal,
} from './helpers';

const RUN_ID = 'run-d3-1';
const WORKFLOW_ID = 'text-pipeline-workflow';

const SPLIT = 'SplitTextCodeNode';
const FOREACH = 'GraphForeachLoopNode';
const RESULT_LOG = 'ResultLogNode';

const INPUT_COUNT = 'input-count';
const INPUT_TEXT = 'input-text';
const OUTPUT_RESULT = 'output-result';

interface D3Backend {
  /** Whether `GET /graph/runs/:runId` serves a stored result (G3-12). */
  serveResult: boolean;
  /** Run-create bodies captured from `POST /graph/runs` (wire contract). */
  runCreateBodies: Record<string, unknown>[];
  /** SSE stream URLs the frontend connected to. */
  eventStreamUrls: string[];
}

/** One SSE frame carrying a canonical run event envelope (§4.15 wire shape). */
function sseEvent(
  type: string,
  sequence: number,
  extra: Record<string, unknown> = {}
): string {
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

/**
 * Run body: Split succeeds, then the terminal event. The ran node carries run
 * status from the live `node.stateChanged` event, exactly like the board's
 * "NOTHING APPEARS" reproduction where `hasRan()` is true from run status alone.
 */
function completedRunBody(): string {
  return (
    sseEvent('workflow.started', 1) +
    sseEvent('node.stateChanged', 2, {
      nodeId: SPLIT,
      payload: { state: 'running' },
    }) +
    sseEvent('node.stateChanged', 3, {
      nodeId: SPLIT,
      payload: { state: 'succeeded' },
    }) +
    sseEvent('workflow.completed', 4, { status: 'succeeded' })
  );
}

/** Stored run result with per-node inspection payloads (§4.16 shape). */
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
        [SPLIT]: {
          nodeId: SPLIT,
          status: 'succeeded',
          inputs: { count: 1, text: 'Hello\nWorld' },
          outputs: { result: 5 },
        },
        [FOREACH]: {
          nodeId: FOREACH,
          status: 'succeeded',
          inputs: { items: ['Hello', 'World'] },
          outputs: { processed: 2 },
        },
        [RESULT_LOG]: {
          nodeId: RESULT_LOG,
          status: 'succeeded',
          inputs: { value: true },
          outputs: { logged: 5 },
        },
      },
    },
  };
}

/** Installs the D3 mock backend on the page. */
async function mockBackend(page: Page, backend: D3Backend): Promise<void> {
  // checkBackend(): any response counts as "server up" (run stays enabled).
  await page.route('**/graph/results/__health__', (route) =>
    route.fulfill({ status: 404, body: '' })
  );
  // No persisted workflow: the canvas-derived seed is used.
  await page.route(`**/graph/workflows/${WORKFLOW_ID}`, (route) =>
    route.fulfill({ status: 404, body: '' })
  );
  await page.route('**/graph/runs', (route) => {
    backend.runCreateBodies.push(
      route.request().postDataJSON() as Record<string, unknown>
    );
    return route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'running',
        eventsUrl: `/graph/runs/${RUN_ID}/events`,
        resultUrl: `/graph/runs/${RUN_ID}`,
      }),
    });
  });
  await page.route(`**/graph/runs/${RUN_ID}/events*`, (route) => {
    backend.eventStreamUrls.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache' },
      body: completedRunBody(),
    });
  });
  await page.route(`**/graph/runs/${RUN_ID}`, (route) => {
    if (!backend.serveResult) {
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(storedResultBody()),
    });
  });
}

async function startRun(page: Page): Promise<void> {
  const run = page.locator('button.graph-float-btn--run');
  await expect(run).toBeVisible();
  await expect(run).toBeEnabled();
  await run.click();
}

/** The split view's three panes, by the D3 LEFT/CENTER/RIGHT contract. */
function panes(page: Page) {
  const inspection = page.locator('.graph-node-inspection');
  return {
    inspection,
    inputs: inspection.locator('.graph-node-inspection__pane--inputs'),
    crud: inspection.locator('.graph-node-inspection__pane--crud'),
    outputs: inspection.locator('.graph-node-inspection__pane--outputs'),
  };
}

test.describe('D3 split-view node CRUD (DECAF-50 §4.22 D3 / §4.24 P0 #3)', () => {
  // Scenario isolation: `graphInspection` is a module-level singleton, so each
  // scenario installs its mock routes first and then performs a full navigation
  // (`gotoGraph`), which reloads the app and resets the inspection store
  // (open node + run payloads). No scenario inherits another's state.

  test('double-click always opens CRUD: pre-run modal, post-run split view with CRUD center', async ({
    page,
  }) => {
    const backend: D3Backend = {
      serveResult: true,
      runCreateBodies: [],
      eventStreamUrls: [],
    };
    await mockBackend(page, backend);
    await gotoGraph(page);

    // ── Pre-run: double-click opens the edit modal (the CRUD form). ────────
    await openNodeEditor(page, SPLIT);
    await expect(page.locator('ion-modal app-graph-node-edit-modal')).toBeVisible({
      timeout: 10_000,
    });
    // The split view is not the pre-run path.
    await expect(page.locator('.graph-node-inspection')).toBeHidden();
    await closeModal(page, 'cancel');
    await expect(page.locator('ion-modal')).toBeHidden({ timeout: 10_000 });

    // ── Post-run: double-click opens the split view, never the modal. ───────
    await startRun(page);
    const split = getNodeArticle(page, SPLIT);
    await expect(split).toHaveClass(/graph-node--succeeded/);
    await split.dblclick({ force: true });

    const { inspection, crud } = panes(page);
    await expect(inspection).toBeVisible();
    // The CRUD is never removed by the run: the modal must NOT open.
    await expect(page.locator('ion-modal')).toBeHidden();
    // CENTER pane carries the editable inline CRUD form.
    await expect(crud.locator('app-graph-node-inline-editor')).toBeVisible();
  });

  test('ran node split view populates all three panes (NOTHING APPEARS pin)', async ({
    page,
  }) => {
    const backend: D3Backend = {
      serveResult: true,
      runCreateBodies: [],
      eventStreamUrls: [],
    };
    await mockBackend(page, backend);
    await gotoGraph(page);

    await startRun(page);
    const split = getNodeArticle(page, SPLIT);
    await expect(split).toHaveClass(/graph-node--succeeded/);
    await split.dblclick({ force: true });

    const { inspection, inputs, crud, outputs } = panes(page);
    await expect(inspection).toBeVisible();
    await expect(inspection.locator('.graph-node-inspection__identity')).toContainText(
      'Split'
    );

    // CENTER: the inline CRUD form.
    await expect(crud.locator('app-graph-node-inline-editor')).toBeVisible();

    // LEFT: the populated "Run inputs" viewer.
    const inputsViewer = inputs.locator('app-graph-io-viewer');
    await expect(inputsViewer).toBeVisible();
    await expect(inputsViewer.locator('.graph-io__title')).toHaveText('Run inputs');
    await expect(inputsViewer.locator('.graph-io__json')).toContainText('Hello');
    expect(
      (await inputsViewer.locator('.graph-io__json').textContent())?.trim().length
    ).toBeGreaterThan(0);

    // RIGHT: the populated "Run outputs" viewer.
    const outputsViewer = outputs.locator('app-graph-io-viewer');
    await expect(outputsViewer).toBeVisible();
    await expect(outputsViewer.locator('.graph-io__title')).toHaveText('Run outputs');
    await expect(outputsViewer.locator('.graph-io__json')).toContainText('5');
    expect(
      (await outputsViewer.locator('.graph-io__json').textContent())?.trim().length
    ).toBeGreaterThan(0);

    // No pane renders the explicit empty state.
    await expect(inspection.locator('.graph-node-inspection__empty')).toHaveCount(0);
  });

  test('failed run-result fetch renders an explicit state with retry and recovers', async ({
    page,
  }) => {
    const backend: D3Backend = {
      serveResult: false,
      runCreateBodies: [],
      eventStreamUrls: [],
    };
    await mockBackend(page, backend);
    await gotoGraph(page);

    await startRun(page);
    const split = getNodeArticle(page, SPLIT);
    await expect(split).toHaveClass(/graph-node--succeeded/);
    await split.dblclick({ force: true });

    const { inspection, inputs, crud, outputs } = panes(page);
    await expect(inspection).toBeVisible();

    // The failed state is explicit: never a blank panel.
    const retry = inspection.locator('.graph-node-inspection__retry');
    await expect(retry.first()).toBeVisible({ timeout: 15_000 });
    await expect(
      inputs.locator('.graph-node-inspection__empty')
    ).toContainText('The run result could not be fetched.');
    await expect(
      outputs.locator('.graph-node-inspection__empty')
    ).toContainText('The run result could not be fetched.');
    // The CRUD center pane survives the failed fetch.
    await expect(crud.locator('app-graph-node-inline-editor')).toBeVisible();

    // The backend now serves the stored result; retry populates the panes.
    backend.serveResult = true;
    await retry.first().click();
    await expect(inputs.locator('.graph-io__json')).toContainText('Hello');
    await expect(outputs.locator('.graph-io__json')).toContainText('5');
    await expect(inspection.locator('.graph-node-inspection__empty')).toHaveCount(0);
  });

  test('workflow-input boundary double-click opens editable CRUD bound to the run form (G3-13)', async ({
    page,
  }) => {
    const backend: D3Backend = {
      serveResult: true,
      runCreateBodies: [],
      eventStreamUrls: [],
    };
    await mockBackend(page, backend);
    await gotoGraph(page);

    // ── Input boundary: editable workflow-input CRUD in the CENTER pane. ─────
    await openNodeEditor(page, INPUT_COUNT);
    const { inspection, crud } = panes(page);
    await expect(inspection).toBeVisible();

    const editor = crud.locator('app-graph-workflow-input-editor');
    await expect(editor).toBeVisible();
    const control = editor.locator('.graph-workflow-input-editor__control');
    await expect(control).toBeVisible();
    await expect(control).toHaveValue('1');

    // Edit the boundary's own form control, then run: the run submits the
    // renderer's edited workflow-input value, never a hardcoded demo input.
    await control.fill('7');
    await inspection.locator('.graph-node-inspection__close').click();
    await expect(inspection).toBeHidden();

    await startRun(page);
    await expect.poll(() => backend.runCreateBodies.length).toBe(1);
    const submitted = backend.runCreateBodies[0]['inputs'] as Record<string, unknown>;
    expect(String(submitted['count'])).toBe('7');
  });

  test('workflow-output boundary double-click renders its value read-only', async ({
    page,
  }) => {
    const backend: D3Backend = {
      serveResult: true,
      runCreateBodies: [],
      eventStreamUrls: [],
    };
    await mockBackend(page, backend);
    await gotoGraph(page);

    await openNodeEditor(page, OUTPUT_RESULT);
    const { inspection, crud } = panes(page);
    await expect(inspection).toBeVisible();
    await expect(inspection.locator('.graph-node-inspection__identity')).toContainText(
      'Results'
    );

    // Output boundaries render the read-only run value, never an editable form.
    await expect(
      crud.locator('.graph-workflow-input-editor__field--readonly')
    ).toBeVisible();
    await expect(
      crud.locator('.graph-workflow-input-editor__control')
    ).toHaveCount(0);

    // The other demo input boundary stays editable.
    await inspection.locator('.graph-node-inspection__close').click();
    await openNodeEditor(page, INPUT_TEXT);
    await expect(
      panes(page).crud.locator('app-graph-workflow-input-editor')
    ).toBeVisible();
    await expect(
      panes(page).crud.locator('.graph-workflow-input-editor__control')
    ).toBeVisible();
  });
});
