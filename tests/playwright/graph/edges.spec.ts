import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getEdgeCount,
  getPortCount,
  getAllNodeIds,
  getNodeArticle,
} from './helpers';

test.describe('Graph — Edge & Connection Behaviours', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('exactly 6 edges are rendered (3 workflow-output edges are dropped)', async ({ page }) => {
    expect(await getEdgeCount(page)).toBe(6);
  });

  test('each edge has a valid SVG path with a d attribute', async ({ page }) => {
    const paths = await page.locator('svg path.ng-diagram-edge__path').evaluateAll(els =>
      els.map(e => ({ d: e.getAttribute('d'), class: e.getAttribute('class') }))
    );
    expect(paths.length).toBe(6);
    for (const p of paths) {
      expect(p.d, 'edge path must have d attribute').toBeTruthy();
      expect(p.d!.startsWith('M '), 'edge path must start with M').toBe(true);
      expect(p.class).toContain('ng-diagram-edge__path');
    }
  });

  test('each edge has a label element', async ({ page }) => {
    const labels = await page.locator('.ng-diagram-default-edge-label').count();
    expect(labels).toBe(6);
  });

  test('edge labels contain the expected text', async ({ page }) => {
    const labelTexts = await page.locator('.ng-diagram-default-edge-label').allTextContents();
    const allLabels = labelTexts.map(l => l.trim()).join('|');
    expect(allLabels).toContain('count');
    expect(allLabels).toContain('text');
    expect(allLabels).toContain('lines');
    expect(allLabels).toContain('short');
    expect(allLabels).toContain('long');
  });

  test('ports are not deleted when an edge is removed (port-guard)', async ({ page }) => {
    const portsBefore = await getPortCount(page);
    const edgesBefore = await getEdgeCount(page);

    const ids = await getAllNodeIds(page);
    expect(ids).toContain('ShortLogNode');
    expect(portsBefore).toBeGreaterThan(0);
    expect(edgesBefore).toBe(6);
  });

  test('connected ports have the graph-node__port--connected class', async ({ page }) => {
    const switchArticle = getNodeArticle(page, 'LineLengthSwitchNode');
    const shortConnected = await switchArticle.locator('div.graph-node__port--out').evaluateAll(els => {
      const el = els.find(e => e.querySelector('[data-port-id="short"]'));
      return el ? el.classList.contains('graph-node__port--connected') : false;
    });
    expect(shortConnected).toBe(true);

    const codeArticle = getNodeArticle(page, 'SplitTextCodeNode');
    const resultConnected = await codeArticle.locator('div.graph-node__port--out').evaluateAll(els => {
      const el = els.find(e => e.querySelector('[data-port-id="result"]'));
      return el ? el.classList.contains('graph-node__port--connected') : false;
    });
    expect(resultConnected).toBe(true);
  });

  test('default port on switch has the connected class', async ({ page }) => {
    const switchArticle = getNodeArticle(page, 'LineLengthSwitchNode');
    const defaultConnected = await switchArticle.locator('div.graph-node__port--out').evaluateAll(els => {
      const el = els.find(e => e.querySelector('[data-port-id="default"]'));
      return el ? el.classList.contains('graph-node__port--connected') : false;
    });
    expect(defaultConnected).toBe(true);
  });
});
