/**
 * @module for-angular/app/pages/graph/list/workflow-list.page.spec
 * @summary SAA-68 D1 workflow list page contract.
 * @description Proves the workflow list page loads `GET /graph/workflows` through
 * `GraphListService`, exposes the rows to the list through the `workflows` signal
 * and the display mapper, and routes the create action to `/graph/create`.
 */
import type { Router } from '@angular/router';
import type {
  GraphListService,
  GraphWorkflowSummary,
} from 'src/app/services/graph-list/graph-list.service';
import { WorkflowListPage } from './workflow-list.page';

const rows: GraphWorkflowSummary[] = [
  { workflowId: 'wf-1', name: 'Text Pipeline', updatedAt: '2026-01-02T00:00:00.000Z' },
  { workflowId: 'wf-2', updatedAt: '2026-01-01T00:00:00.000Z' },
];

/** Builds the page with mocked list service and router. */
function createPage(
  listWorkflows: jest.Mock = jest.fn().mockResolvedValue(rows)
): {
  page: WorkflowListPage;
  service: { listWorkflows: jest.Mock };
  router: { navigate: jest.Mock };
} {
  const service = { listWorkflows };
  const router = { navigate: jest.fn().mockResolvedValue(true) };
  const page = new WorkflowListPage(
    service as unknown as GraphListService,
    router as unknown as Router
  );
  return { page, service, router };
}

describe('WorkflowListPage — workflow list (SAA-68 D1)', () => {
  it('loads the workflow rows through GraphListService on init', async () => {
    const { page, service } = createPage();

    await page.ngOnInit();

    expect(service.listWorkflows).toHaveBeenCalledTimes(1);
    expect(page.workflows()).toEqual(rows);
  });

  it('refreshes the workflow rows on page entry', async () => {
    const { page, service } = createPage();

    await page.ionViewWillEnter();

    expect(service.listWorkflows).toHaveBeenCalledTimes(1);
    expect(page.workflows()).toEqual(rows);
  });

  it('maps the workflow name to the list text and the update time to the value', () => {
    const { page } = createPage();

    expect(page.mapper(rows[0])).toEqual({
      ...rows[0],
      text: 'Text Pipeline',
      value: '2026-01-02T00:00:00.000Z',
    });
  });

  it('falls back to the workflow id when the row has no name', () => {
    const { page } = createPage();

    expect(page.mapper(rows[1])['text']).toBe('wf-2');
  });

  it('routes the create action to the create canvas', async () => {
    const { page, router } = createPage();

    await page.onCreate();

    expect(router.navigate).toHaveBeenCalledWith(['/graph/create']);
  });

  it('binds the loaded rows to the list as custom-source data', async () => {
    const { page } = createPage();

    await page.ngOnInit();

    const list = { data: undefined as unknown, refresh: jest.fn() };
    page.list = list as unknown as typeof page.list;
    await page.ngAfterViewInit();

    expect(list.refresh).toHaveBeenCalledWith(true);
    expect(page.workflows()).toBe(rows);
  });
});
