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
  return `data: ${JSON.stringify(['graph', type, RUN_ID, payload])}\n\n`;
}

/** Full run: started → split running → one data edge succeeded → 4 logs → completed. */
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

async function mockBackend(page: Page, body = fullRunBody()): Promise<void> {
  await page.route('**/graph/results/__health__', (route) => route.fulfill({ status: 404, body: '' }));
  await page.route('**/graph/execute', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ runId: RUN_ID, status: 'succeeded', outputs: { result: 5 } }),
    })
  );
  await page.route('**/graph/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'Cache-Control': 'no-cache' }, body })
  );
  await page.route(`**/graph/results/${RUN_ID}`, (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        nodeResults: {
          SplitTextCodeNode: {
            nodeId: 'SplitTextCodeNode',
            status: 'succeeded',
            inputs: { count: 1, text: 'Hello\nWorld' },
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
      }),
    })
  );
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
    await mockBackend(page, visualStateBody());
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
