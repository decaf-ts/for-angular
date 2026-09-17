/**
 * @module tests/playwright/graph/base-node.spec
 * @summary Base node behaviours (shared by all demo nodes).
 * @description T7 (DECAF-50 §4.24): the port-id and connected-class checks are
 * kept, and default-port visibility plus required-input visibility assertions are
 * added for the D2 visibility rule. Stale pre-manifest demo node ids
 * (`ShortLogNode`/`LongLogNode`/`LineLengthSwitchNode`) are re-anchored to the
 * current demo nodes.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  DEMO_NODES,
  DEMO_NODE_IDS,
  DEMO_EDGE_COUNT,
  getAllNodeIds,
  getEdgeCount,
  getPortCount,
  getNodeArticle,
  getNodeAccentColor,
  getRenderedPorts,
  selectNode,
  isNodeSelected,
  deleteNode,
  pinNode,
  isNodePinned,
  getNodeIdByTitle,
  isBoundaryNode,
} from './helpers';

test.describe('Graph — Base Node Behaviours (shared by all nodes)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('all demo workflow nodes render on the canvas', async ({ page }) => {
    const ids = await getAllNodeIds(page);
    for (const node of DEMO_NODES) {
      expect(ids, `node "${node.id}" should be in ${ids}`).toContain(node.id);
    }
    for (const id of DEMO_NODE_IDS) {
      expect(ids, `canvas node "${id}" should be in ${ids}`).toContain(id);
    }
    expect(ids.length).toBe(DEMO_NODE_IDS.length);
  });

  test('each node renders an article element with name', async ({ page }) => {
    for (const node of DEMO_NODES) {
      const article = getNodeArticle(page, node.id);
      await expect(article, `article for ${node.id}`).toBeVisible();
      const nameSelector = isBoundaryNode(node.id) ? '.graph-badge__name' : '.graph-node__name';
      const name = await article.locator(nameSelector).textContent();
      expect(name?.trim(), `name for ${node.id}`).toBe(node.title);
    }
  });

  test('each non-boundary node has pin and delete action buttons', async ({ page }) => {
    for (const node of DEMO_NODES) {
      if (node.isBoundary) continue;
      const article = getNodeArticle(page, node.id);
      await expect(article.locator('button.graph-node__btn--pin')).toBeVisible();
      await expect(article.locator('button.graph-node__btn--delete')).toBeVisible();
    }
  });

  test('boundary nodes have delete but no pin button', async ({ page }) => {
    for (const node of DEMO_NODES) {
      if (!node.isBoundary) continue;
      const article = getNodeArticle(page, node.id);
      await expect(article.locator('button.graph-badge__btn--delete')).toBeVisible();
      expect(await article.locator('button.graph-node__btn--pin').count()).toBe(0);
    }
  });

  test('clicking a node selects it', async ({ page }) => {
    const nodeId = 'SplitTextCodeNode';
    await selectNode(page, nodeId);
    expect(await isNodeSelected(page, nodeId)).toBe(true);
  });

  test('selecting another node deselects the previous', async ({ page }) => {
    await selectNode(page, 'SplitTextCodeNode');
    expect(await isNodeSelected(page, 'SplitTextCodeNode')).toBe(true);
    await selectNode(page, 'ResultLogNode');
    expect(await isNodeSelected(page, 'ResultLogNode')).toBe(true);
    expect(await isNodeSelected(page, 'SplitTextCodeNode')).toBe(false);
  });

  test('deleting a node removes it from the canvas', async ({ page }) => {
    const idsBefore = await getAllNodeIds(page);
    expect(idsBefore).toContain('ResultLogNode');
    await deleteNode(page, 'ResultLogNode');
    const idsAfter = await getAllNodeIds(page);
    expect(idsAfter).not.toContain('ResultLogNode');
  });

  test('edges are rendered as SVG paths', async ({ page }) => {
    const edges = await getEdgeCount(page);
    expect(edges).toBe(DEMO_EDGE_COUNT);
  });

  test('ports are rendered with data-port-id attributes', async ({ page }) => {
    const ports = await getPortCount(page);
    expect(ports).toBeGreaterThan(0);
  });

  test('node accent colour is set via CSS variable', async ({ page }) => {
    const splitColor = await getNodeAccentColor(page, 'SplitTextCodeNode');
    expect(splitColor).not.toBe('');
    expect(splitColor).not.toBe('#5b21b6');
  });

  test('boundary input nodes have value output ports', async ({ page }) => {
    for (const boundaryId of ['input-count', 'input-text']) {
      const article = getNodeArticle(page, boundaryId);
      const outPorts = await article.locator('div.graph-badge__port--out [data-port-id]').evaluateAll(els =>
        els.map(e => e.getAttribute('data-port-id'))
      );
      expect(outPorts, `boundary ${boundaryId} should have a value output port`).toContain('value');
    }
  });

  test('workflow output boundary badge has a real value input port (D2/G3-09)', async ({ page }) => {
    const article = getNodeArticle(page, 'output-result');
    await expect(article).toBeVisible();
    const inPorts = await article.locator('div.graph-badge__port--in [data-port-id]').evaluateAll(els =>
      els.map(e => e.getAttribute('data-port-id'))
    );
    expect(inPorts).toContain('value');
  });

  test('default port is visible even when unconnected (D2/G3-05)', async ({ page }) => {
    const logValue = await getRenderedPorts(page, 'ResultLogNode', 'in');
    const value = logValue.find(p => p.id === 'value');
    expect(value, 'default value input port').toBeDefined();
    expect(value?.classes).toContain('graph-node__port--default');
  });

  test('required input port is visible even when unconnected (D2/G3-06, refined by G4-R1)', async ({ page }) => {
    // G4-R1: the code node ships prefilled code, so its `code` input port is a
    // value-provided port and is not rendered (G4-R3 refinement of D2).
    const codeInputs = await getRenderedPorts(page, 'SplitTextCodeNode', 'in');
    expect(codeInputs.find(p => p.id === 'code'), 'value-provided code input port').toBeUndefined();

    // A genuinely required input port with no direct value stays visible while
    // unconnected (D2/G3-06).
    const foreachInputs = await getRenderedPorts(page, 'GraphForeachLoopNode', 'in');
    const slice = foreachInputs.find(p => p.id === 'slice');
    expect(slice, 'required slice input port').toBeDefined();
    expect(slice?.classes).toContain('graph-node__port--required');
    expect(slice?.classes).not.toContain('graph-node__port--connected');
  });

  test('getNodeByTitle resolves the correct node id', async ({ page }) => {
    const id = await getNodeIdByTitle(page, 'Split');
    expect(id).toBe('SplitTextCodeNode');
  });
});

/**
 * T4 (DECAF-50 §4.24) — pinning is DATA pinning, not a CSS toggle.
 *
 * The pin writes the node's frozen parameters into the canonical document
 * (`node.pinned`), the write survives a save/load round-trip, and the frozen
 * values are what a downstream run submits. The button's `--pinned` class is an
 * incidental visual reflection, never the contract.
 */
interface PinBackend {
  saved: { document: PinDocument } | null;
  savePutCount: number;
  runRequest: { workflow: PinDocument; inputs: Record<string, unknown> } | null;
}

interface PinNode {
  id: string;
  kind: string;
  parameters?: Record<string, unknown>;
  pinned?: { parameters: Record<string, unknown>; pinnedAt?: string };
}

interface PinDocument {
  id?: string;
  nodes: PinNode[];
  edges?: unknown[];
}

async function installPinBackend(page: import('@playwright/test').Page): Promise<PinBackend> {
  const server: PinBackend = { saved: null, savePutCount: 0, runRequest: null };
  await page.route('**/graph/results/__health__', route =>
    route.fulfill({ status: 404, body: '' })
  );
  await page.route('**/graph/workflows/*', route => {
    if (route.request().method() === 'PUT') {
      server.saved = route.request().postDataJSON() as { document: PinDocument };
      server.savePutCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflowId: 'text-pipeline-workflow',
          savedAt: '2026-09-16T10:00:00.000Z',
        }),
      });
    }
    if (server.saved) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(server.saved),
      });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await page.route('**/graph/runs**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/graph/runs') {
      server.runRequest = route.request().postDataJSON() as {
        workflow: PinDocument;
        inputs: Record<string, unknown>;
      };
      return route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          runId: 'run-pin-1',
          workflowId: 'text-pipeline-workflow',
          status: 'running',
          eventsUrl: '/graph/runs/run-pin-1/events',
          resultUrl: '/graph/runs/run-pin-1/result',
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: 'run-pin-1',
        workflowId: 'text-pipeline-workflow',
        status: 'succeeded',
        document: server.runRequest?.workflow ?? null,
        inputs: {},
        outputs: {},
        nodeResults: {},
        events: [],
      }),
    });
  });
  return server;
}

test.describe('Graph — Base Node pinning is data pinning (D4)', () => {
  let server: PinBackend;

  test.beforeEach(async ({ page }) => {
    server = await installPinBackend(page);
    await gotoGraph(page);
  });

  test('pin writes the canonical document, survives save/load and freezes downstream run values', async ({
    page,
  }) => {
    const nodeId = 'ResultLogNode';
    expect(await isNodePinned(page, nodeId)).toBe(false);

    await pinNode(page, nodeId);
    expect(await isNodePinned(page, nodeId)).toBe(true);

    // The pin is a document write: the save PUT body carries `node.pinned`.
    await page.locator('button.graph-float-btn--save').click();
    await expect.poll(() => server.savePutCount).toBeGreaterThanOrEqual(1);
    const savedNode = server.saved!.document.nodes.find(node => node.id === nodeId)!;
    expect(savedNode.pinned, 'save body should carry the pin state').toBeDefined();
    expect(savedNode.pinned!.parameters).toEqual(savedNode.parameters);

    // The pin survives a save/load round-trip (reload restores the document).
    await gotoGraph(page);
    expect(await isNodePinned(page, nodeId)).toBe(true);
    await page.locator('button.graph-float-btn--save').click();
    await expect.poll(() => server.savePutCount).toBeGreaterThanOrEqual(2);
    const reloadedNode = server.saved!.document.nodes.find(node => node.id === nodeId)!;
    expect(reloadedNode.pinned).toEqual(savedNode.pinned);

    // A downstream run consumes the frozen pinned document.
    const runButton = page.locator('button.graph-float-btn--run');
    await expect(runButton).toBeEnabled();
    await runButton.click();
    await expect.poll(() => (server.runRequest ? 1 : 0)).toBe(1);
    const runNode = server.runRequest!.workflow.nodes.find(node => node.id === nodeId)!;
    expect(runNode.pinned).toEqual(savedNode.pinned);
    expect(runNode.parameters).toEqual(
      expect.objectContaining(savedNode.pinned!.parameters)
    );
  });

  test('unpinning removes the pin from the saved document', async ({ page }) => {
    const nodeId = 'ResultLogNode';

    await pinNode(page, nodeId);
    await pinNode(page, nodeId);
    expect(await isNodePinned(page, nodeId)).toBe(false);

    await page.locator('button.graph-float-btn--save').click();
    await expect.poll(() => server.savePutCount).toBeGreaterThanOrEqual(1);
    const savedNode = server.saved!.document.nodes.find(node => node.id === nodeId)!;
    expect(savedNode.pinned).toBeUndefined();
  });
});
