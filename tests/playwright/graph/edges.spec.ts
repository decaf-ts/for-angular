/**
 * @module tests/playwright/graph/edges.spec
 * @summary Graph edge & connection behaviours against the CURRENT demo.
 * @description Re-derived for the D2 boundary decision (DECAF-50 §4.22, G3-09):
 * the workflow boundary now renders as a real trigger/result badge, so the
 * workflow-output edge (`ResultLogNode:logged -> $workflow:result`) is projected
 * instead of dropped. The demo therefore renders 7 edges (5 document edges plus
 * the foreach containment ghost's 2 mandatory edges) and 7 edge labels.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getEdgeCount,
  getPortCount,
  getAllNodeIds,
  getRenderedPorts,
  DEMO_EDGE_COUNT,
  DEMO_EDGE_LABELS,
} from './helpers';

test.describe('Graph — Edge & Connection Behaviours', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('exactly 7 edges are rendered (workflow-output edge now projects)', async ({ page }) => {
    expect(await getEdgeCount(page)).toBe(DEMO_EDGE_COUNT);
  });

  test('each edge has a valid SVG path with a d attribute', async ({ page }) => {
    const paths = await page.locator('svg path.ng-diagram-edge__path').evaluateAll(els =>
      els.map(e => ({ d: e.getAttribute('d'), class: e.getAttribute('class') }))
    );
    expect(paths.length).toBe(DEMO_EDGE_COUNT);
    for (const p of paths) {
      expect(p.d, 'edge path must have d attribute').toBeTruthy();
      expect(p.d!.startsWith('M '), 'edge path must start with M').toBe(true);
      expect(p.class).toContain('ng-diagram-edge__path');
    }
  });

  test('each edge has a label element', async ({ page }) => {
    const labels = await page.locator('.ng-diagram-default-edge-label').count();
    expect(labels).toBe(DEMO_EDGE_COUNT);
  });

  test('edge labels contain every demo relation', async ({ page }) => {
    const labelTexts = await page.locator('.ng-diagram-default-edge-label').allTextContents();
    const allLabels = labelTexts.map(l => l.trim()).join('|');
    for (const label of DEMO_EDGE_LABELS) {
      expect(allLabels, `edge label '${label}'`).toContain(label);
    }
  });

  test('ports are not deleted when edges are projected (port-guard)', async ({ page }) => {
    const portsBefore = await getPortCount(page);
    const edgesBefore = await getEdgeCount(page);

    const ids = await getAllNodeIds(page);
    expect(ids).toContain('SplitTextCodeNode');
    expect(ids).toContain('output-result');
    expect(portsBefore).toBeGreaterThan(0);
    expect(edgesBefore).toBe(DEMO_EDGE_COUNT);
  });

  test('connected member output ports carry the connected class', async ({ page }) => {
    const codeResult = await getRenderedPorts(page, 'SplitTextCodeNode', 'out');
    expect(codeResult.find(p => p.id === 'result')?.classes).toContain('graph-node__port--connected');

    const foreachItems = await getRenderedPorts(page, 'GraphForeachLoopNode', 'in');
    expect(foreachItems.find(p => p.id === 'items')?.classes).toContain('graph-node__port--connected');

    const logValue = await getRenderedPorts(page, 'ResultLogNode', 'in');
    expect(logValue.find(p => p.id === 'value')?.classes).toContain('graph-node__port--connected');
  });

  test('workflow-boundary output badge value port is connected (D2/G3-09)', async ({ page }) => {
    const outputPorts = await getRenderedPorts(page, 'output-result', 'in');
    expect(outputPorts.find(p => p.id === 'value')?.classes).toContain('graph-badge__port--connected');
  });

  test('default port on the log node carries the connected class', async ({ page }) => {
    const logValue = await getRenderedPorts(page, 'ResultLogNode', 'in');
    const value = logValue.find(p => p.id === 'value');
    expect(value?.classes).toContain('graph-node__port--default');
    expect(value?.classes).toContain('graph-node__port--connected');
  });
});
