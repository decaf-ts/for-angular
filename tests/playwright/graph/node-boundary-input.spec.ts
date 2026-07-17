import { test, expect } from '@playwright/test';
import {
  gotoGraph,
  getNodePorts,
  getNodeArticle,
  getAllNodeIds,
} from './helpers';

const BOUNDARY_NODES = [
  { id: 'input-count', title: 'count' },
  { id: 'input-text', title: 'text' },
];

for (const node of BOUNDARY_NODES) {
  test.describe(`Boundary Input Node — ${node.id} (value)`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoGraph(page);
    });

    test('renders with correct title (property name)', async ({ page }) => {
      const article = getNodeArticle(page, node.id);
      await expect(article).toBeVisible();
      await expect(article.locator('.graph-badge__name')).toHaveText(node.title);
    });

    test('has a value output port (no input ports)', async ({ page }) => {
      const inputs = await getNodePorts(page, node.id, 'in');
      const outputs = await getNodePorts(page, node.id, 'out');
      expect(outputs).toContain('value');
      expect(inputs.length).toBe(0);
    });

    test('value port is connected to downstream node', async ({ page }) => {
      const article = getNodeArticle(page, node.id);
      const connected = await article.locator('div.graph-badge__port--out').evaluateAll(els => {
        const el = els.find(e => e.querySelector('[data-port-id="value"]'));
        return el ? el.classList.contains('graph-badge__port--connected') : false;
      });
      expect(connected).toBe(true);
    });

    test('has delete button but no pin button', async ({ page }) => {
      const article = getNodeArticle(page, node.id);
      await expect(article.locator('button.graph-badge__btn--delete')).toBeVisible();
      expect(await article.locator('button.graph-node__btn--pin').count()).toBe(0);
    });

    test('does not have action buttons from graph-node template', async ({ page }) => {
      const article = getNodeArticle(page, node.id);
      expect(await article.locator('button.graph-node__btn--pin').count()).toBe(0);
      expect(await article.locator('button.graph-node__btn--delete').count()).toBe(0);
    });
  });
}

test.describe('Boundary Input Nodes — collective behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
  });

  test('both boundary nodes exist on canvas', async ({ page }) => {
    const ids = await getAllNodeIds(page);
    expect(ids).toContain('input-count');
    expect(ids).toContain('input-text');
  });

  test('boundary nodes are positioned on the left side of the canvas', async ({ page }) => {
    for (const id of ['input-count', 'input-text']) {
      const article = getNodeArticle(page, id);
      const x = await article.evaluate(el => el.getBoundingClientRect().x);
      const canvasWidth = await page.locator('.graph-renderer__canvas').evaluate(el => el.getBoundingClientRect().width);
      expect(x).toBeLessThan(canvasWidth / 3);
    }
  });

  test('boundary nodes use the graph-badge class, not graph-node', async ({ page }) => {
    for (const id of ['input-count', 'input-text']) {
      const article = getNodeArticle(page, id);
      const className = await article.evaluate(el => el.className);
      expect(className).toContain('graph-badge');
      expect(className).not.toContain('graph-node');
    }
  });
});
