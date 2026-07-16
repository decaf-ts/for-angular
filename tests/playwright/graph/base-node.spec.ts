import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  DEMO_NODES,
  getAllNodeIds,
  getEdgeCount,
  getPortCount,
  getNodeArticle,
  getNodeAccentColor,
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
    expect(ids.length).toBe(DEMO_NODES.length);
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
    await selectNode(page, 'ShortLogNode');
    expect(await isNodeSelected(page, 'ShortLogNode')).toBe(true);
    expect(await isNodeSelected(page, 'SplitTextCodeNode')).toBe(false);
  });

  test('pinning a node toggles the pinned class', async ({ page }) => {
    const nodeId = 'LongLogNode';
    expect(await isNodePinned(page, nodeId)).toBe(false);
    await pinNode(page, nodeId);
    expect(await isNodePinned(page, nodeId)).toBe(true);
    await pinNode(page, nodeId);
    expect(await isNodePinned(page, nodeId)).toBe(false);
  });

  test('deleting a node removes it from the canvas', async ({ page }) => {
    const idsBefore = await getAllNodeIds(page);
    expect(idsBefore).toContain('LongLogNode');
    await deleteNode(page, 'LongLogNode');
    const idsAfter = await getAllNodeIds(page);
    expect(idsAfter).not.toContain('LongLogNode');
  });

  test('edges are rendered as SVG paths', async ({ page }) => {
    const edges = await getEdgeCount(page);
    expect(edges).toBe(6);
  });

  test('ports are rendered with data-port-id attributes', async ({ page }) => {
    const ports = await getPortCount(page);
    expect(ports).toBeGreaterThan(0);
  });

  test('node accent colour is set via CSS variable', async ({ page }) => {
    const switchColor = await getNodeAccentColor(page, 'LineLengthSwitchNode');
    expect(switchColor).not.toBe('');
    expect(switchColor).not.toBe('#5b21b6');
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

  test('getNodeByTitle resolves the correct node id', async ({ page }) => {
    const id = await getNodeIdByTitle(page, 'Split');
    expect(id).toBe('SplitTextCodeNode');
  });
});
