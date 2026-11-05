/**
 * SAA-1473 — route non-regression and menu-entry smoke.
 *
 * Proves the append-only `app.routes.ts` additions load without replacing any
 * existing route, that the existing feature routes still mount, and that the
 * app menu advertises the new pages.
 */
import { expect, test, type Page } from '@playwright/test';
import { openRoute } from './helpers';

test.setTimeout(180_000);

const ROUTES = [
  { name: 'dashboard', path: '/dashboard', ready: 'ngx-decaf-layout' },
  { name: 'dashboard-builder', path: '/dashboard-builder', ready: 'main.dashboard-builder' },
  { name: 'graph', path: '/graph', ready: '.graph-page' },
  { name: 'kanban', path: '/kanban', ready: '[data-testid="kanban-board"]' },
  { name: 'scrum', path: '/scrum', ready: '[data-testid="scrum-backlog"]' },
  { name: 'gantt', path: '/gantt', ready: '[data-testid="gantt-timeline"]' },
  { name: 'barcode', path: '/barcode', ready: 'main.barcode-page' },
  { name: 'charts', path: '/charts', ready: 'main.charts-page' },
  { name: 'code-editor', path: '/code-editor', ready: 'main.code-editor-page' },
  { name: 'math', path: '/math', ready: 'main.math-page' },
  { name: 'storyboard', path: '/storyboard', ready: 'main.storyboard-page' },
  { name: 'diagrams', path: '/diagrams', ready: 'main.diagrams-page' },
  { name: 'calendar', path: '/calendar', ready: '[data-testid="calendar-grid"]' },
] as const;

const MENU_ITEMS = [
  'kanban',
  'scrum',
  'gantt',
  'barcode',
  'charts',
  'code_editor',
  'math',
  'storyboard',
  'diagrams',
  'calendar',
] as const;

/**
 * Page-error collector only: the graph route talks to the local backend, whose
 * CORS headers are absent in this sandbox, so console resource failures are not
 * route regressions. A thrown page error still fails the smoke.
 */
function recordErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

test.describe('all demo routes load', () => {
  for (const route of ROUTES) {
    test(`${route.path} mounts without a page error`, async ({ page }) => {
      const errors = recordErrors(page);
      await openRoute(page, route.path, route.ready);
      await expect(page.locator(route.ready).first()).toBeVisible();
      expect(
        errors,
        `page errors on ${route.path}: ${errors.join('\n')}`
      ).toEqual([]);
    });
  }
});

test('the app menu exposes every feature-demo entry', async ({ page }) => {
  await openRoute(page, '/barcode', 'main.barcode-page');

  for (const item of MENU_ITEMS) {
    await expect(page.locator(`.dcf-menu-${item}`)).toHaveCount(1);
  }
});
