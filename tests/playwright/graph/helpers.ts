import { Page, Locator, expect } from '@playwright/test';

export const GRAPH_URL = 'http://localhost:8110/graph';

export interface NodeInfo {
  id: string;
  title: string;
  kind: string;
  isBoundary?: boolean;
}

export const DEMO_NODES: NodeInfo[] = [
  { id: 'input-count', title: 'count', kind: 'value', isBoundary: true },
  { id: 'input-text', title: 'text', kind: 'value', isBoundary: true },
  { id: 'SplitTextCodeNode', title: 'Split', kind: 'core.flow.code' },
  { id: 'GraphForeachLoopNode', title: 'Foreach', kind: 'core.loop.foreach' },
  { id: 'ResultLogNode', title: 'Log Results', kind: 'core.flow.log' },
  { id: 'output-result', title: 'result', kind: 'value', isBoundary: true },
];

/**
 * Every canvas node the demo document projects (D2/G3-09): the two workflow
 * input badges, the three member nodes, the workflow output badge, and the
 * canvas-only foreach containment ghost.
 */
export const DEMO_NODE_IDS = [
  'input-count',
  'input-text',
  'SplitTextCodeNode',
  'GraphForeachLoopNode',
  'ResultLogNode',
  'output-result',
  'ghost-GraphForeachLoopNode',
];

/** Demo canvas edge count after the workflow-output edge projects (D2/G3-09). */
export const DEMO_EDGE_COUNT = 7;

/** Demo canvas edge labels after the workflow-output edge projects. */
export const DEMO_EDGE_LABELS = [
  'count',
  'text',
  'lines',
  'results',
  'final-result',
  'item',
  'loop',
];


export async function gotoGraph(page: Page): Promise<void> {
  await page.goto(GRAPH_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('ng-diagram', { timeout: 30000 });
  await page.waitForSelector('.ng-diagram-node', { timeout: 15000 });
  await page.waitForTimeout(3000);
}

export function getNodeHost(page: Page, nodeId: string): Locator {
  return page.locator(`[data-node-id="${nodeId}"]`);
}

export function getNodeArticle(page: Page, nodeId: string): Locator {
  return page.locator(`[data-node-id="${nodeId}"] article.graph-node, [data-node-id="${nodeId}"] article.graph-badge`);
}

export function isBoundaryNode(nodeId: string): boolean {
  return nodeId.startsWith('input-') || nodeId.startsWith('output-');
}

export async function getNodePorts(page: Page, nodeId: string, direction: 'in' | 'out'): Promise<string[]> {
  const isBoundary = isBoundaryNode(nodeId);
  const portClass = isBoundary
    ? `graph-badge__port--${direction}`
    : `graph-node__port--${direction}`;
  const host = getNodeHost(page, nodeId);
  return host.locator(`div.${portClass} [data-port-id]`).evaluateAll(els =>
    els.map(e => e.getAttribute('data-port-id') || '')
  );
}

export async function getAllNodeIds(page: Page): Promise<string[]> {
  return page.locator('[data-node-id]').evaluateAll(els =>
    els.map(e => e.getAttribute('data-node-id') || '')
  );
}

export async function getEdgeCount(page: Page): Promise<number> {
  return page.locator('svg path.ng-diagram-edge__path').count();
}

export async function getPortCount(page: Page): Promise<number> {
  return page.locator('[data-port-id]').count();
}

export async function getPortLabels(page: Page, nodeId: string, direction: 'in' | 'out'): Promise<string[]> {
  const isBoundary = isBoundaryNode(nodeId);
  const portClass = isBoundary
    ? `graph-badge__port--${direction}`
    : `graph-node__port--${direction}`;
  const host = getNodeHost(page, nodeId);
  return host
    .locator(`div.${portClass} .graph-node__port-label, div.${portClass} .graph-badge__port-label`)
    .allTextContents();
}

export interface RenderedPort {
  id: string;
  classes: string;
  top: number;
}

/**
 * Rendered port handles of a node (D2): each port's `data-port-id`, class list,
 * and viewport `top` — the basis for visibility and vertical-distribution
 * assertions on the running demo.
 */
export async function getRenderedPorts(
  page: Page,
  nodeId: string,
  direction: 'in' | 'out'
): Promise<RenderedPort[]> {
  const isBoundary = isBoundaryNode(nodeId);
  const portClass = isBoundary
    ? `graph-badge__port--${direction}`
    : `graph-node__port--${direction}`;
  const host = getNodeHost(page, nodeId);
  return host.locator(`div.${portClass}`).evaluateAll((els) =>
    els
      .map((el) => {
        const idEl = el.querySelector('[data-port-id]');
        const rect = el.getBoundingClientRect();
        return {
          id: idEl?.getAttribute('data-port-id') || '',
          classes: el.className,
          top: rect.top,
        };
      })
      .filter((port) => !!port.id)
  );
}

export async function getNodeAccentColor(page: Page, nodeId: string): Promise<string> {
  return getNodeArticle(page, nodeId).evaluate(el =>
    getComputedStyle(el).getPropertyValue('--graph-accent').trim()
  );
}

export async function isNodeSelected(page: Page, nodeId: string): Promise<boolean> {
  return getNodeArticle(page, nodeId).evaluate(el =>
    el.classList.contains('graph-node--selected') || el.classList.contains('graph-badge--selected')
  );
}

export async function isPortConnected(page: Page, nodeId: string, portId: string): Promise<boolean> {
  const isBoundary = isBoundaryNode(nodeId);
  const portClass = isBoundary
    ? 'graph-badge__port'
    : 'graph-node__port';
  const host = getNodeHost(page, nodeId);
  return host.locator(`div.${portClass}`).evaluateAll((els, pid) => {
    const el = els.find(e => e.querySelector(`[data-port-id="${pid}"]`));
    if (!el) return false;
    return el.classList.contains('graph-node__port--connected') || el.classList.contains('graph-badge__port--connected');
  }, portId);
}

export async function openNodeEditor(page: Page, nodeId: string): Promise<void> {
  const article = getNodeArticle(page, nodeId);
  await article.evaluate((el: HTMLElement) => {
    const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  });
  await page.waitForTimeout(1500);
}

export async function closeModal(page: Page, action: 'save' | 'cancel' = 'cancel'): Promise<void> {
  const btnText = action === 'save' ? 'Save' : 'Cancel';
  const btn = page.locator('ion-modal ion-button').filter({ hasText: btnText });
  await btn.click();
  await page.waitForTimeout(1000);
}

export async function getModalTitle(page: Page): Promise<string> {
  return (await page.locator('ion-modal ion-title').textContent()) || '';
}

export async function selectNode(page: Page, nodeId: string): Promise<void> {
  const article = getNodeArticle(page, nodeId);
  await article.evaluate((el: HTMLElement) => {
    const pointerdown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true });
    el.dispatchEvent(pointerdown);
    const pointerup = new PointerEvent('pointerup', { bubbles: true, cancelable: true, isPrimary: true });
    el.dispatchEvent(pointerup);
  });
  await page.waitForTimeout(500);
}

export async function deleteNode(page: Page, nodeId: string): Promise<void> {
  const isBoundary = isBoundaryNode(nodeId);
  const btnClass = isBoundary ? 'graph-badge__btn--delete' : 'graph-node__btn--delete';
  const btn = getNodeHost(page, nodeId).locator(`button.${btnClass}`);
  await btn.evaluate((el: HTMLElement) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  });
  await page.waitForTimeout(1000);
}

export async function pinNode(page: Page, nodeId: string): Promise<void> {
  const btn = getNodeHost(page, nodeId).locator('button.graph-node__btn--pin');
  await btn.evaluate((el: HTMLElement) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  });
  await page.waitForTimeout(500);
}

/**
 * Whether a node is pinned (D4 data pinning). The document is the authority;
 * the pin button's `--pinned` class is the incidental visual reflection of the
 * canonical document's `pinned` field (the CSS `graph-node--pinned` class is no
 * longer the contract — see T4/DECAF-50 §4.24).
 */
export async function isNodePinned(page: Page, nodeId: string): Promise<boolean> {
  const btn = getNodeHost(page, nodeId).locator('button.graph-node__btn--pin');
  if ((await btn.count()) === 0) return false;
  return btn.evaluate(el => el.classList.contains('graph-node__btn--pinned'));
}

export async function getNodeIdByTitle(page: Page, title: string): Promise<string | null> {
  return page.locator('article.graph-node, article.graph-badge').filter({ hasText: title })
    .evaluate((el, _t) => {
      const host = el.closest('[data-node-id]');
      return host?.getAttribute('data-node-id') ?? null;
    }, title);
}

/**
 * Manifest-authoritative geometry for the demo member nodes (D1/G3-03). These are
 * the `display.width`/`display.height` values the shared manifests declare; the
 * canvas host must render at exactly these sizes.
 */
export const DEMO_MANIFEST_DISPLAY: { id: string; width: number; height: number }[] = [
  { id: 'SplitTextCodeNode', width: 96, height: 96 },
  { id: 'GraphForeachLoopNode', width: 120, height: 140 },
  { id: 'ResultLogNode', width: 96, height: 96 },
];

/** Computed rendered size (CSS px) of the node's canvas host element. */
export async function getNodeComputedSize(
  page: Page,
  nodeId: string
): Promise<{ width: number; height: number }> {
  return getNodeHost(page, nodeId).evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: parseFloat(style.width), height: parseFloat(style.height) };
  });
}

export interface NodeFace {
  name: string;
  accent: string;
  shape: string | null;
  spriteHref: string | null;
  imageSrc: string | null;
  fallback: string | null;
  descriptionCount: number;
}

/** Rendered node-face facts: title, accent, icon representation, description. */
export async function getNodeFace(page: Page, nodeId: string): Promise<NodeFace> {
  return getNodeArticle(page, nodeId).evaluate((el) => {
    const article = el as HTMLElement;
    const use = article.querySelector('svg.graph-node__icon-svg use');
    const img = article.querySelector('img.graph-node__icon-img') as HTMLImageElement | null;
    return {
      name: article.querySelector('.graph-node__name')?.textContent?.trim() ?? '',
      accent: getComputedStyle(article).getPropertyValue('--graph-accent').trim(),
      shape: article.getAttribute('data-node-shape'),
      spriteHref: use?.getAttribute('href') ?? null,
      imageSrc: img?.getAttribute('src') ?? null,
      fallback: article.querySelector('.graph-node__icon-fallback')?.textContent?.trim() ?? null,
      descriptionCount: article.querySelectorAll('.graph-node__description').length,
    };
  });
}

/**
 * Adds a node through the manifest-driven palette (the P7 cutover's only
 * node-creation path) and returns once its canvas host is visible.
 */
export async function addPaletteNode(page: Page, title: string): Promise<void> {
  await page.locator('button.graph-renderer__palette-btn').click();
  const entry = page.locator('.graph-renderer__palette-item').filter({ hasText: title }).first();
  await expect(entry).toBeVisible();
  await entry.click();
  await page.waitForTimeout(1000);
}
