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
import type { GraphEngineCapabilityService } from 'src/graph/capabilities';
import { WorkflowListPage } from './workflow-list.page';

const rows: GraphWorkflowSummary[] = [
  { workflowId: 'wf-1', name: 'Text Pipeline', updatedAt: '2026-01-02T00:00:00.000Z' },
  { workflowId: 'wf-2', updatedAt: '2026-01-01T00:00:00.000Z' },
];

/** The capability-service double shape the page consumes. */
interface CapabilityFake {
  engines: () => unknown[];
  selectedEngineId: () => string | null;
  canSelectEngine: () => boolean;
  canCreateWorkflow: () => boolean;
  canBrowseWorkflows: () => boolean;
  failure: () => { kind: string; message: string } | null;
  load: jest.Mock;
  refresh: jest.Mock;
  listWorkflows: jest.Mock;
  selectEngine: jest.Mock;
}

/** Builds a capability-service double with every member the page touches. */
function capabilityFake(overrides: Partial<CapabilityFake> = {}): CapabilityFake {
  return {
    engines: () => [],
    selectedEngineId: () => 'engine-a',
    canSelectEngine: () => false,
    canCreateWorkflow: () => true,
    canBrowseWorkflows: () => true,
    failure: () => null,
    load: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
    listWorkflows: jest.fn().mockResolvedValue([]),
    selectEngine: jest.fn(),
    ...overrides,
  };
}

/** Builds the page with mocked list service, router, and optional capabilities. */
function createPage(
  listWorkflows: jest.Mock = jest.fn().mockResolvedValue(rows),
  capabilities?: CapabilityFake
): {
  page: WorkflowListPage;
  service: { listWorkflows: jest.Mock };
  router: { navigate: jest.Mock };
  capabilities?: CapabilityFake;
} {
  const service = { listWorkflows };
  const router = { navigate: jest.fn().mockResolvedValue(true) };
  const page = new WorkflowListPage(
    service as unknown as GraphListService,
    router as unknown as Router,
    capabilities as unknown as GraphEngineCapabilityService
  );
  return { page, service, router, capabilities };
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

describe('WorkflowListPage — engine capability catalogue (SAA-707)', () => {
  it('loads the manifest then the engine catalogue rows when the engine can browse', async () => {
    const capabilities = capabilityFake({
      listWorkflows: jest.fn().mockResolvedValue([
        { workflowId: 'cat-1', name: 'Catalogue One' },
        { workflowId: 'cat-2' },
      ]),
    });
    const { page, service } = createPage(undefined, capabilities);

    await page.ngOnInit();

    expect(capabilities.load).toHaveBeenCalledTimes(1);
    expect(capabilities.listWorkflows).toHaveBeenCalledTimes(1);
    expect(service.listWorkflows).not.toHaveBeenCalled();
    expect(page.catalogue()).toBe(true);
    expect(page.workflows()).toEqual([
      { workflowId: 'cat-1', name: 'Catalogue One', updatedAt: '' },
      { workflowId: 'cat-2', name: undefined, updatedAt: '' },
    ]);
  });

  it('falls back to the legacy endpoint when the engine cannot browse', async () => {
    const capabilities = capabilityFake({ canBrowseWorkflows: () => false });
    const { page, service } = createPage(undefined, capabilities);

    await page.ngOnInit();

    expect(capabilities.load).toHaveBeenCalledTimes(1);
    expect(capabilities.listWorkflows).not.toHaveBeenCalled();
    expect(service.listWorkflows).toHaveBeenCalledTimes(1);
    expect(page.catalogue()).toBe(false);
    expect(page.workflows()).toEqual(rows);
  });

  it('still loads legacy rows when the manifest load fails', async () => {
    const capabilities = capabilityFake({
      canBrowseWorkflows: () => false,
      load: jest.fn().mockRejectedValue(new Error('backend down')),
    });
    const { page, service } = createPage(undefined, capabilities);

    await expect(page.loadWorkflows()).resolves.toBeUndefined();

    expect(service.listWorkflows).toHaveBeenCalledTimes(1);
    expect(page.workflows()).toEqual(rows);
  });

  it('re-selects the engine and reloads its catalogue on engine change', async () => {
    const listWorkflows = jest.fn().mockResolvedValue([{ workflowId: 'wf-b' }]);
    const selectEngine = jest.fn();
    const capabilities = capabilityFake({ listWorkflows, selectEngine });
    const { page } = createPage(undefined, capabilities);

    await page.onEngineChange(
      new CustomEvent('ionChange', { detail: { value: 'engine-b' } })
    );

    expect(selectEngine).toHaveBeenCalledWith('engine-b');
    expect(listWorkflows).toHaveBeenCalledTimes(1);
    expect(page.workflows()).toEqual([
      { workflowId: 'wf-b', name: undefined, updatedAt: '' },
    ]);
  });

  it('ignores an engine change without a value', async () => {
    const capabilities = capabilityFake();
    const { page } = createPage(undefined, capabilities);

    await page.onEngineChange(new CustomEvent('ionChange', { detail: {} }));

    expect(capabilities.selectEngine).not.toHaveBeenCalled();
    expect(capabilities.listWorkflows).not.toHaveBeenCalled();
  });

  it('retries the manifest and reloads the rows on onRetry', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    const capabilities = capabilityFake({ refresh });
    const { page } = createPage(undefined, capabilities);

    await page.onRetry();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(capabilities.listWorkflows).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy fallback when the retry fails', async () => {
    const refresh = jest.fn().mockRejectedValue(new Error('still down'));
    const capabilities = capabilityFake({
      refresh,
      canBrowseWorkflows: () => false,
    });
    const { page, service } = createPage(undefined, capabilities);

    await expect(page.onRetry()).resolves.toBeUndefined();

    expect(service.listWorkflows).toHaveBeenCalledTimes(1);
  });

  it('exposes the failure signal for the banner', () => {
    const failure = { kind: 'backend-down', message: 'offline' };
    const capabilities = capabilityFake({ failure: () => failure });
    const { page } = createPage(undefined, capabilities);

    expect(page.failure()).toEqual(failure);
  });

  it('projects the served engines, selection, and selector visibility', () => {
    const engines = [
      { engineId: 'engine-a', displayName: 'Engine A' },
      { engineId: 'engine-b', displayName: 'Engine B' },
    ];
    const capabilities = capabilityFake({
      engines: () => engines,
      selectedEngineId: () => 'engine-b',
      canSelectEngine: () => true,
    });
    const { page } = createPage(undefined, capabilities);

    expect(page.engines()).toEqual(engines);
    expect(page.selectedEngineId()).toBe('engine-b');
    expect(page.canSelectEngine()).toBe(true);
  });

  it('gates the create action on the engine capability', async () => {
    const blocked = capabilityFake({ canCreateWorkflow: () => false });
    const first = createPage(undefined, blocked);

    await first.page.onCreate();
    expect(first.router.navigate).not.toHaveBeenCalled();

    const allowed = capabilityFake({ canCreateWorkflow: () => true });
    const second = createPage(undefined, allowed);

    await second.page.onCreate();
    expect(second.router.navigate).toHaveBeenCalledWith(['/graph/create']);
  });

  it('defaults the create gate to allowed when no capability service is bound', async () => {
    const { page, router } = createPage();

    await page.onCreate();

    expect(router.navigate).toHaveBeenCalledWith(['/graph/create']);
  });
});
