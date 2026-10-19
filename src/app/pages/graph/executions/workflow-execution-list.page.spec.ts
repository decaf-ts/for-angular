/**
 * @module for-angular/app/pages/graph/executions/workflow-execution-list.page.spec
 * @summary SAA-68 D2 execution list page contract.
 * @description Proves the execution list page loads
 * `GET /graph/workflows/:workflowId/runs`, maps each run row, and replays a run
 * through mastra time travel (SAA-836 U1 AC3) by navigating to the editor with
 * the `replayRun` query param.
 */
import type { ActivatedRoute, Router } from '@angular/router';
import type {
  GraphListService,
  GraphRunRow,
} from 'src/app/services/graph-list/graph-list.service';
import { WorkflowExecutionListPage } from './workflow-execution-list.page';

const rows: GraphRunRow[] = [
  { runId: 'run-1', workflowId: 'wf-1', status: 'completed', createdAt: '2026-01-02T00:00:00.000Z' },
  { runId: 'run-2', workflowId: 'wf-1', status: 'failed' },
];

/** Builds the page with a mocked route, router, and list service. */
function createPage(options: {
  workflowId?: string;
  listRuns?: jest.Mock;
  navigate?: jest.Mock;
} = {}): {
  page: WorkflowExecutionListPage;
  service: { listRuns: jest.Mock };
  router: { navigate: jest.Mock };
} {
  const route = {
    snapshot: {
      paramMap: {
        get: jest.fn().mockReturnValue(options.workflowId ?? 'wf-1'),
      },
    },
  };
  const router = {
    navigate: options.navigate ?? jest.fn().mockResolvedValue(true),
  };
  const service = {
    listRuns: options.listRuns ?? jest.fn().mockResolvedValue(rows),
  };
  const page = new WorkflowExecutionListPage(
    route as unknown as ActivatedRoute,
    router as unknown as Router,
    service as unknown as GraphListService
  );
  return { page, service, router };
}

describe('WorkflowExecutionListPage — execution list (SAA-68 D2)', () => {
  it('loads the workflow runs on init using the route workflow id', async () => {
    const { page, service } = createPage({ workflowId: 'wf-1' });

    await page.ngOnInit();

    expect(service.listRuns).toHaveBeenCalledWith('wf-1');
    expect(page.runs()).toEqual(rows);
  });

  it('does not load runs when the route has no workflow id', async () => {
    const { page, service } = createPage({ workflowId: '' });

    await page.ngOnInit();

    expect(service.listRuns).not.toHaveBeenCalled();
    expect(page.runs()).toEqual([]);
  });

  it('refreshes the workflow runs on page entry', async () => {
    const { page, service } = createPage();
    await page.ngOnInit();
    service.listRuns.mockClear();

    await page.ionViewWillEnter();

    expect(service.listRuns).toHaveBeenCalledWith('wf-1');
  });

  it('maps the run id to the list text and the status to the value', () => {
    const { page } = createPage();

    expect(page.mapper(rows[0])).toEqual({
      ...rows[0],
      text: 'run-1',
      value: 'completed',
    });
  });

  it('replays a run through mastra time travel on a replay event', async () => {
    const { page, router } = createPage();
    await page.ngOnInit();

    await page.onListEvent({ action: 'replay', data: 'run-1' } as never);

    expect(router.navigate).toHaveBeenCalledWith(['/graph/read/wf-1'], {
      queryParams: { replayRun: 'run-1' },
    });
    expect(page.replayError()).toBeNull();
  });

  it('ignores a list event that is not a replay', async () => {
    const { page, router } = createPage();
    await page.ngOnInit();

    await page.onListEvent({ action: 'open', data: 'run-1' } as never);

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ignores a replay event without a run id', async () => {
    const { page, router } = createPage();
    await page.ngOnInit();

    await page.onListEvent({ action: 'replay', data: '' } as never);

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('surfaces a replay failure without throwing', async () => {
    const { page } = createPage({
      navigate: jest.fn().mockRejectedValue(new Error('backend down')),
    });
    await page.ngOnInit();

    await page.onListEvent({ action: 'replay', data: 'run-1' } as never);

    expect(page.replayError()).toBe('backend down');
  });

  it('does not replay before the workflow id is known', async () => {
    const { page, router } = createPage({ workflowId: '' });

    await page.onListEvent({ action: 'replay', data: 'run-1' } as never);

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
