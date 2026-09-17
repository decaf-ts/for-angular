/**
 * G4-R6 — node add list search field (DECAF-50 §4.22).
 *
 * The palette (the node add list, also reused by the R5 drag-to-empty-canvas
 * popup) gains a search field that filters the catalogue entries as the user
 * types. The unit contract lives in
 * `src/graph/components/graph-renderer/graph-renderer-palette-search.spec.ts`.
 *
 * RUN REQUIREMENTS: `npm run start` (dev server on :8110); backend mocked.
 */
import { test, expect } from '@playwright/test';
import { gotoGraph } from './helpers';

test.describe('Graph — palette search (G4-R6)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGraph(page);
    await page.locator('button.graph-renderer__palette-btn').click();
    await expect(page.locator('.graph-renderer__palette-list')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('renders a search field on the node add list', async ({ page }) => {
    await expect(page.locator('.graph-renderer__palette-search-input')).toBeVisible();
    expect(await page.locator('.graph-renderer__palette-item').count()).toBeGreaterThan(0);
  });

  test('filters the catalogue by title as the user types', async ({ page }) => {
    await page.locator('.graph-renderer__palette-search-input').fill('foreach');
    await expect(page.locator('.graph-renderer__palette-item')).toHaveCount(1);
    await expect(page.locator('.graph-renderer__palette-item').first()).toContainText(
      'GraphForeachLoopNode'
    );
  });

  test('shows the no-results message for a query that matches nothing', async ({ page }) => {
    await page.locator('.graph-renderer__palette-search-input').fill('zzzz-no-such-node');
    await expect(page.locator('.graph-renderer__palette-item')).toHaveCount(0);
    await expect(
      page.locator('.graph-renderer__palette-status--empty').last()
    ).toContainText('No nodes match');
  });

  test('clears the query and restores the full catalogue', async ({ page }) => {
    const search = page.locator('.graph-renderer__palette-search-input');
    const total = await page.locator('.graph-renderer__palette-item').count();

    await search.fill('foreach');
    await expect(page.locator('.graph-renderer__palette-item')).toHaveCount(1);

    await page.locator('.graph-renderer__palette-search-clear').click();
    await expect(page.locator('.graph-renderer__palette-item')).toHaveCount(total);
  });
});
