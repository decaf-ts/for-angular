/**
 * @module tests/playwright/graph/port-visibility.spec
 * @summary Gate-2 P0 #2 (D2) E2E — port visibility & workflow-boundary rendering.
 * @description Asserts the D2 rendering contract (DECAF-50 §4.22, G3-05..G3-09) on
 * the running demo: default and connected ports are visible, required input ports
 * stay visible while unconnected, multi-output ports distribute vertically, edges
 * bind real ports, and the workflow-boundary decision renders real trigger/result
 * ports (the workflow-output edge is no longer dropped).
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getRenderedPorts,
  isPortConnected,
  addPaletteNode,
} from './helpers';

const UNTIL = 'core-loop-until-GraphUntilLoopNode';

test.describe('Graph — port visibility & boundary rendering (D2/G3-05..09)', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('default port on the log node is visible and connected', async ({ page }) => {
    const inputs = await getNodePorts(page, 'ResultLogNode', 'in');
    expect(inputs).toContain('value');
    await expect.poll(() => isPortConnected(page, 'ResultLogNode', 'value')).toBe(true);
  });

  test('every connected demo port is visible', async ({ page }) => {
    const connected: [string, 'in' | 'out', string][] = [
      ['SplitTextCodeNode', 'in', 'data'],
      ['SplitTextCodeNode', 'out', 'result'],
      ['GraphForeachLoopNode', 'in', 'items'],
      ['GraphForeachLoopNode', 'out', 'item'],
      ['GraphForeachLoopNode', 'out', 'completed'],
      ['ResultLogNode', 'in', 'value'],
      ['ResultLogNode', 'out', 'logged'],
      ['input-count', 'out', 'value'],
      ['input-text', 'out', 'value'],
    ];
    for (const [nodeId, direction, portId] of connected) {
      const ports = await getNodePorts(page, nodeId, direction);
      expect(ports, `${nodeId}:${portId} visible`).toContain(portId);
    }
  });

  test('required input port stays visible while unconnected (G3-06)', async ({ page }) => {
    await addPaletteNode(page, 'GraphUntilLoopNode');
    await expect.poll(() => getNodePorts(page, UNTIL, 'in')).toContain('state');
    expect(await isPortConnected(page, UNTIL, 'state')).toBe(false);

    const state = (await getRenderedPorts(page, UNTIL, 'in')).find(p => p.id === 'state');
    expect(state?.classes).toContain('graph-node__port--required');
  });

  test('multi-output ports distribute vertically (D2)', async ({ page }) => {
    const outputs = await getRenderedPorts(page, 'GraphForeachLoopNode', 'out');
    const item = outputs.find(p => p.id === 'item');
    const completed = outputs.find(p => p.id === 'completed');
    expect(item, 'item output port').toBeDefined();
    expect(completed, 'completed output port').toBeDefined();
    expect(item!.top).not.toBe(completed!.top);
    expect(completed!.top).toBeLessThan(item!.top);
  });

  test('workflow-output edge binds the output badge value port (D2/G3-09)', async ({ page }) => {
    const inPorts = await getNodePorts(page, 'output-result', 'in');
    expect(inPorts).toContain('value');
    await expect.poll(() => isPortConnected(page, 'output-result', 'value')).toBe(true);

    const labels = await page.locator('.ng-diagram-default-edge-label').allTextContents();
    expect(labels.map(l => l.trim())).toContain('final-result');
  });

  test('the output badge is a graph-badge, not a synthesized graph-node', async ({ page }) => {
    const className = await page
      .locator('[data-node-id="output-result"] article')
      .evaluate(el => el.className);
    expect(className).toContain('graph-badge');
    expect(className).toContain('graph-badge--output');
  });
});
