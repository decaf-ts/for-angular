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
  { id: 'LineLengthSwitchNode', title: 'Switch', kind: 'core.flow.switch' },
  { id: 'ShortLogNode', title: 'Log Short', kind: 'core.flow.log' },
  { id: 'LongLogNode', title: 'Log Long', kind: 'core.flow.log' },
  { id: 'DefaultLogNode', title: 'Log Default', kind: 'core.flow.log' },
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
  return nodeId.startsWith('input-');
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
  return host.locator(`div.${portClass} .graph-node__port-label, div.${portClass} .graph-badge__name`).allTextContents();
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

export async function isNodePinned(page: Page, nodeId: string): Promise<boolean> {
  return getNodeArticle(page, nodeId).evaluate(el =>
    el.classList.contains('graph-node--pinned')
  );
}

export async function getNodeIdByTitle(page: Page, title: string): Promise<string | null> {
  return page.locator('article.graph-node, article.graph-badge').filter({ hasText: title })
    .evaluate((el, _t) => {
      const host = el.closest('[data-node-id]');
      return host?.getAttribute('data-node-id') ?? null;
    }, title);
}
