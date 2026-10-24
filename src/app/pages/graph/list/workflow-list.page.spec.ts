/**
 * @module for-angular/app/pages/graph/list/workflow-list.page.spec
 * @summary SAA-68 D1 workflow list page contract.
 * @description Proves the workflow list page loads `GET /graph/workflows` through
 * `GraphListService`, exposes the rows to the list through the `workflows` signal
 * and the display mapper, and routes the create action to `/graph/create`.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { GraphListService, type GraphWorkflowSummary } from 'src/app/services/graph-list/graph-list.service';
import { GraphEngineCapabilityService } from 'diagrams/src/lib/graph/capabilities';
import { I18nFakeLoader } from 'src/lib/i18n';
import en from '../../../../assets/i18n/en.json';
import pt from '../../../../assets/i18n/pt.json';
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
  canRunWorkflow: () => boolean;
  canRunListedWorkflow: (row?: { runnable?: boolean }) => boolean;
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
    canRunWorkflow: () => true,
    canRunListedWorkflow: (row?: { runnable?: boolean }) => row?.runnable !== false,
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
      listWorkflows: jest
        .fn()
        .mockResolvedValue([{ workflowId: 'cat-1', name: 'Catalogue One' }, { workflowId: 'cat-2' }]),
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

    await page.onEngineChange(new CustomEvent('ionChange', { detail: { value: 'engine-b' } }));

    expect(selectEngine).toHaveBeenCalledWith('engine-b');
    expect(listWorkflows).toHaveBeenCalledTimes(1);
    expect(page.workflows()).toEqual([{ workflowId: 'wf-b', name: undefined, updatedAt: '' }]);
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

/**
 * SAA-1359 D5 page-level regression: a catalogue row's per-row `runnable` flag
 * must survive `WorkflowListPage`'s catalogue mapping and reach the rendered row.
 * Mounting the page (not a hand-built `GraphWorkflowItemComponent` fixture) is the
 * point: the historical bug lived in `refreshWorkflows`, which mapped catalogue
 * rows to `{workflowId, name, updatedAt}` and dropped `runnable` before the list
 * item ever saw it, so the item-level spec stayed green while every row was
 * runnable on `/workflows`.
 */
describe('WorkflowListPage — per-row run gate (SAA-1359 D5)', () => {
  const catalogueRows: GraphWorkflowSummary[] = [
    {
      workflowId: 'fixture-manual-log',
      name: 'Seeded fixture',
      updatedAt: '2026-10-24T00:00:00.000Z',
      runnable: false,
    },
    {
      workflowId: 'etl_pipeline',
      name: 'Deployed job',
      updatedAt: '2026-10-24T00:00:00.000Z',
      runnable: true,
    },
  ];

  let fixture: ComponentFixture<WorkflowListPage>;

  /** Mounts the real page with the engine catalogue serving the given rows. */
  async function renderPage(rows: GraphWorkflowSummary[]): Promise<WorkflowListPage> {
    const capabilities = capabilityFake({
      listWorkflows: jest.fn().mockResolvedValue(rows),
    });
    TestBed.configureTestingModule({
      imports: [
        WorkflowListPage,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: NavController,
          useValue: {
            navigateRoot: jest.fn(),
            navigateForward: jest.fn(),
            navigateBack: jest.fn(),
          },
        },
        {
          provide: GraphListService,
          useValue: { listWorkflows: jest.fn().mockResolvedValue([]) },
        },
        { provide: GraphEngineCapabilityService, useValue: capabilities },
      ],
    });

    fixture = TestBed.createComponent(WorkflowListPage);
    // Load the catalogue into the page signal before the first change detection
    // so the list's `[data]` binding is created with the mapped rows; this mirrors
    // the real page, whose catalogue arrives before `ngAfterViewInit` refreshes
    // the list.
    await fixture.componentInstance.loadWorkflows();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /**
   * Waits for the dynamically rendered row whose visible text carries the
   * catalogue name. The list renders items through the component renderer, whose
   * child `ngOnInit` is async, and Ionic hydrates the row's `ion-button` a tick
   * after the first paint, so both the label and the `aria-disabled` reflection
   * have to settle before the row is asserted.
   */
  async function renderedRow(name: string): Promise<HTMLElement> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      fixture.detectChanges();
      await fixture.whenStable();
      const rows = Array.from(fixture.nativeElement.querySelectorAll('.graph-workflow-item')) as HTMLElement[];
      const row = rows.find((candidate) => candidate.textContent?.includes(name));
      if (row) {
        const run = runButton(row);
        const disabled = (run as unknown as { disabled?: unknown }).disabled === true;
        const ariaDisabled = run.getAttribute('aria-disabled');
        const labelled = !!run.getAttribute('aria-label');
        if (labelled && (disabled ? ariaDisabled === 'true' : ariaDisabled !== 'true')) {
          return row;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.graph-workflow-item')) as HTMLElement[];
    throw new Error(
      `row "${name}" not rendered; rows=${JSON.stringify(
        rows.map((candidate) => candidate.textContent?.trim())
      )}; pageRows=${JSON.stringify(fixture.componentInstance.workflows())}`
    );
  }

  /** The row's Run control (second action button: runs, run, edit). */
  function runButton(row: HTMLElement): HTMLElement {
    return row.querySelectorAll('.graph-workflow-item__actions ion-button')[1] as HTMLElement;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('forwards the catalogue runnable flag from the page to the list rows', async () => {
    const page = await renderPage(catalogueRows);

    expect(page.workflows()).toEqual(catalogueRows);
    expect(page.workflows().map((row) => row.runnable)).toEqual([false, true]);
  });

  it('disables Run and names the block for a runnable:false catalogue row', async () => {
    await renderPage(catalogueRows);
    const translate = TestBed.inject(TranslateService);
    const seededRow = await renderedRow('Seeded fixture');
    const run = runButton(seededRow);
    expect(run.hasAttribute('disabled')).toBe(true);
    expect(run.getAttribute('aria-disabled')).toBe('true');
    expect(run.getAttribute('aria-label')).toBe(
      translate.instant('graph.workflows.runBlockedReadOnly')
    );
    expect(run.getAttribute('title')).toBe(
      translate.instant('graph.workflows.runBlockedReadOnly')
    );
    expect(run.getAttribute('aria-label')).not.toBe(
      translate.instant('graph.workflows.runBlocked')
    );
    expect(run.getAttribute('aria-label')).not.toBe(translate.instant('graph.workflows.run'));
    expect(run.getAttribute('aria-label')?.trim()).not.toBe('');
  });

  it('keeps Run enabled and named for a runnable:true catalogue row', async () => {
    await renderPage(catalogueRows);
    const translate = TestBed.inject(TranslateService);
    const run = runButton(await renderedRow('Deployed job'));

    expect(run.hasAttribute('disabled')).toBe(false);
    expect(run.getAttribute('aria-disabled')).not.toBe('true');
    expect(run.getAttribute('aria-label')).toBe(translate.instant('graph.workflows.run'));
  });

  it('keeps a runnable:false row from opening the autorun editor', async () => {
    const page = await renderPage(catalogueRows);
    const navigate = jest.spyOn(TestBed.inject(Router) as unknown as { navigate: jest.Mock }, 'navigate');
    const run = runButton(await renderedRow('Seeded fixture'));

    run.click();

    expect(navigate).not.toHaveBeenCalledWith(['/graph/read/fixture-manual-log'], {
      queryParams: expect.objectContaining({ autorun: '1' }),
    });
    expect(page.workflows()[0].runnable).toBe(false);
  });
});

/**
 * SAA-1359 D5 wording regression: the per-workflow block must explain *this
 * row* (read-only canonical document / not a deployed job) instead of reusing
 * the engine-level "the selected engine does not support running workflows"
 * claim. Both shipped locales must carry the explanation for the workflow row
 * and the engine picker, and the explanation must differ from the engine-level
 * block.
 */
describe('Per-workflow run-block i18n strings (SAA-1359 D5)', () => {
  const locales = [
    ['en', en],
    ['pt', pt],
  ] as const;

  it.each(locales)(
    'ships a workflow-specific read-only explanation in %s',
    (_locale, translations) => {
      const workflows = translations.graph.workflows as {
        run: string;
        runBlocked: string;
        runBlockedReadOnly: string;
      };

      expect(workflows.runBlockedReadOnly.trim()).not.toBe('');
      expect(workflows.runBlockedReadOnly).not.toBe(workflows.runBlocked);
      expect(workflows.runBlockedReadOnly).not.toBe(workflows.run);
      expect(workflows.runBlockedReadOnly.toLowerCase()).toMatch(
        /read-only|leitura/,
      );
      expect(workflows.runBlockedReadOnly.toLowerCase()).toMatch(
        /canonical|canónico/,
      );
    },
  );

  it.each(locales)(
    'ships the picker per-row and engine-level run blocks in %s',
    (_locale, translations) => {
      const picker = translations.graph.engines.picker as {
        run: string;
        runBlocked: string;
        runBlockedReadOnly: string;
      };

      expect(picker.runBlocked.trim()).not.toBe('');
      expect(picker.runBlockedReadOnly.trim()).not.toBe('');
      expect(picker.runBlockedReadOnly).not.toBe(picker.runBlocked);
      expect(picker.runBlocked).not.toBe(picker.run);
    },
  );
});
