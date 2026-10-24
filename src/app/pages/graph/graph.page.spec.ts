/**
 * @module for-angular/app/pages/graph/graph.page.spec
 * @summary Graph page save/rename, per-workflow run gate, and route-bound
 * `runAllowed` contracts (SAA-68 D4, SAA-1359 D5, SAA-1425).
 * @description Proves the editor's save gate: an invalid graph is never saved and
 * surfaces the structured issues, the first create save opens the create modal, a
 * confirmed create assigns a slugged id and persists, and an in-place rename updates
 * the document name and the breadcrumb trail. It also proves the Run gate: a
 * `runnable:false` catalogue row blocks `canRun`/`runWorkflow` even when the engine
 * allows runs, while a row that omits the flag stays runnable; and
 * `withComponentInputBinding()` keeps `runAllowed` true when the route carries no
 * such input while still honouring an explicit `?runAllowed=false`.
 */
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import type { GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';
import {
  GRAPH_DEV_MODE,
  GraphAutoSaveService,
  GraphEngineCapabilityService,
  GraphExecutionService,
  GraphHistoryService,
  GraphKeyboardShortcutsService,
  GraphMutationDetectorService,
  GraphNodeCatalogService,
  GraphRendererComponent,
  GraphRunClient,
  GraphRunEventClient,
  GraphSaveService,
  GraphWorkflowDocumentStore,
  GraphWorkflowValidateClient,
  graphValidity,
} from 'diagrams/src/lib/graph';
import { GraphPage } from './graph.page';
import { I18nFakeLoader } from 'src/lib/i18n';
import fixture from '../../../../tests/fixtures/graph/text-pipeline.document.json';

const document = fixture as unknown as GraphWorkflowDocument;

/** Builds a GraphPage without running the Angular injector. */
function createPage(operation: string): {
  page: GraphPage;
  saveDocument: jest.Mock;
  configure: jest.Mock;
  documentStore: GraphWorkflowDocumentStore;
} {
  const page = Object.create(GraphPage.prototype) as GraphPage;
  const saveDocument = jest.fn().mockResolvedValue(undefined);
  const configure = jest.fn();
  const documentStore = new GraphWorkflowDocumentStore();
  documentStore.initialize(document);
  Object.assign(page as unknown as Record<string, unknown>, {
    operation,
    workflowId: 'wf-1',
    createdWorkflowId: null,
    workflowName: signal(''),
    runError: signal<string | null>(null),
    runValidationIssues: signal([]),
    createModalOpen: signal(false),
    documentStore,
    mutationDetector: { configure },
    saveService: { saveDocument },
    renderer: undefined,
  });
  return { page, saveDocument, configure, documentStore };
}

describe('GraphPage — save gate and rename (SAA-68 D4)', () => {
  afterEach(() => {
    graphValidity.reset();
  });

  it('blocks the save and surfaces the issues when the graph is invalid', async () => {
    const { page, saveDocument } = createPage('create');
    const issues = [{ code: 'kind.unknown', path: 'nodes[0].kind', message: 'Unknown kind' }];
    graphValidity.applyResult({ valid: false, issues });

    await page.onSaveWorkflow();

    expect(saveDocument).not.toHaveBeenCalled();
    expect(page.createModalOpen()).toBe(false);
    expect(page.runValidationIssues()).toEqual(issues);
  });

  it('opens the create modal on the first valid save of a new workflow', async () => {
    const { page, saveDocument } = createPage('create');
    graphValidity.applyResult({ valid: true, issues: [] });

    await page.onSaveWorkflow();

    expect(page.createModalOpen()).toBe(true);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('persists directly on save once the workflow has been created', async () => {
    const { page, saveDocument } = createPage('create');
    (page as unknown as { createdWorkflowId: string | null }).createdWorkflowId = 'wf-1';
    graphValidity.applyResult({ valid: true, issues: [] });

    await page.onSaveWorkflow();

    expect(page.createModalOpen()).toBe(false);
    expect(saveDocument).toHaveBeenCalledWith('wf-1', { document: expect.any(Object) });
  });

  it('assigns a slugged id, renames the document, and persists on create submit', async () => {
    const { page, saveDocument, configure, documentStore } = createPage('create');
    graphValidity.applyResult({ valid: true, issues: [] });

    await page.onCreateSubmitted({
      name: '  My First Flow  ',
      description: 'A sufficiently long description',
      namespace: 'private',
    });

    expect(page.createModalOpen()).toBe(false);
    expect(page.workflowName()).toBe('My First Flow');
    expect(documentStore.document()?.id).toBe('my-first-flow');
    expect(documentStore.document()?.name).toBe('My First Flow');
    expect(configure).toHaveBeenCalledWith('my-first-flow', expect.any(Function));
    expect(saveDocument).toHaveBeenCalledWith('my-first-flow', { document: expect.any(Object) });
  });

  it('ignores a create submit without a name', async () => {
    const { page, saveDocument, documentStore } = createPage('create');

    await page.onCreateSubmitted({
      name: '   ',
      description: 'A sufficiently long description',
    });

    expect(page.createModalOpen()).toBe(false);
    expect(documentStore.document()?.name).toBe(document.name);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('renames the workflow document and breadcrumb in place', () => {
    const { page, documentStore } = createPage('update');

    page.onRenameWorkflow('  Renamed Flow  ');

    expect(page.workflowName()).toBe('Renamed Flow');
    expect(documentStore.document()?.name).toBe('Renamed Flow');
  });

  it('ignores an empty rename', () => {
    const { page, documentStore } = createPage('update');
    page.workflowName.set('Original');

    page.onRenameWorkflow('   ');

    expect(page.workflowName()).toBe('Original');
    expect(documentStore.document()?.name).toBe(document.name);
  });
});

/**
 * Builds a GraphPage through the real field initializers with every injected
 * collaborator stubbed, so the per-workflow run gate can be evaluated directly.
 *
 * @param runnable - Value of the row-level run gate.
 * @param engineAllows - Whether the engine capability manifest allows runs.
 * @return The constructed page.
 */
function injectedPage(runnable: boolean, engineAllows: boolean): GraphPage {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: GraphExecutionService,
        useValue: { backendAvailable: signal(true) },
      },
      { provide: GraphSaveService, useValue: {} },
      { provide: GraphAutoSaveService, useValue: {} },
      { provide: GraphMutationDetectorService, useValue: {} },
      {
        provide: GraphWorkflowDocumentStore,
        useValue: new GraphWorkflowDocumentStore(),
      },
      { provide: GraphRunClient, useValue: {} },
      { provide: GraphRunEventClient, useValue: {} },
      { provide: GraphWorkflowValidateClient, useValue: {} },
      {
        provide: GraphNodeCatalogService,
        useValue: { manifests: signal([]) },
      },
      {
        provide: GraphEngineCapabilityService,
        useValue: {
          canRunWorkflowOn: jest.fn(() => engineAllows),
          selectedEngineId: jest.fn(() => 'engine-a'),
          engines: signal([]),
          workflows: signal([]),
          load: jest.fn(),
          getWorkflow: jest.fn(),
          workflowSummary: jest.fn(),
        },
      },
    ],
  });
  const page = TestBed.runInInjectionContext(() => new GraphPage());
  (
    page as unknown as {
      workflowRunnable: { set(value: boolean): void };
    }
  ).workflowRunnable.set(runnable);
  return page;
}

/**
 * Builds a GraphPage whose engine catalogue serves the given row summary, so
 * the page's catalogue-load path sets the per-workflow run gate exactly as it
 * does for a `/workflows/:workflowId?engine=dagster` visit.
 *
 * @param summary - The catalogue row summary (or `undefined` when unlisted).
 * @return The constructed page.
 */
function catalogPage(
  summary: { workflowId: string; runnable?: boolean } | undefined,
): GraphPage {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: GraphExecutionService,
        useValue: { backendAvailable: signal(true), checkBackend: jest.fn() },
      },
      { provide: GraphSaveService, useValue: { loadDocument: jest.fn(async () => undefined) } },
      { provide: GraphAutoSaveService, useValue: {} },
      { provide: GraphMutationDetectorService, useValue: { configure: jest.fn() } },
      {
        provide: GraphWorkflowDocumentStore,
        useValue: new GraphWorkflowDocumentStore(),
      },
      { provide: GraphRunClient, useValue: {} },
      { provide: GraphRunEventClient, useValue: {} },
      { provide: GraphWorkflowValidateClient, useValue: {} },
      {
        provide: GraphNodeCatalogService,
        useValue: { manifests: signal([]), load: jest.fn() },
      },
      {
        provide: GraphEngineCapabilityService,
        useValue: {
          canRunWorkflowOn: jest.fn(() => true),
          selectedEngineId: jest.fn(() => 'dagster'),
          engines: signal([]),
          workflows: signal([]),
          load: jest.fn(async () => undefined),
          getWorkflow: jest.fn(async () => document),
          workflowSummary: jest.fn(async () => summary),
        },
      },
    ],
  });
  const page = TestBed.runInInjectionContext(() => new GraphPage());
  page.workflowId = 'fixture-manual-log';
  page.engine = 'dagster';
  return page;
}

/** Runs the page's private catalogue load and lets it settle. */
async function loadCatalogue(page: GraphPage): Promise<void> {
  await (
    page as unknown as { catalogBackendWorkflowLoad(): Promise<void> }
  ).catalogBackendWorkflowLoad();
}

describe('GraphPage — per-workflow run gate (SAA-1359 D5)', () => {
  afterEach(() => {
    graphValidity.reset();
    TestBed.resetTestingModule();
  });

  it('blocks canRun for a runnable:false row even when the engine allows running', () => {
    const page = injectedPage(false, true);

    expect(page.canRun()).toBe(false);
  });

  it('allows canRun for a runnable:true row when the engine allows running', () => {
    const page = injectedPage(true, true);

    expect(page.canRun()).toBe(true);
  });

  it('blocks canRun when the engine refuses running even for a runnable row', () => {
    const page = injectedPage(true, false);

    expect(page.canRun()).toBe(false);
  });

  it('refuses to start a run for a runnable:false row', async () => {
    const page = injectedPage(false, true);

    await page.runWorkflow();

    expect(page.isRunning()).toBe(false);
  });

  it('adopts runnable:false from the Dagster catalogue row and blocks Run', async () => {
    const page = catalogPage({ workflowId: 'fixture-manual-log', runnable: false });

    await loadCatalogue(page);

    expect(page.workflowRunnable()).toBe(false);
    expect(page.canRun()).toBe(false);
  });

  it('keeps Run available for a runnable:true Dagster catalogue row', async () => {
    const page = catalogPage({ workflowId: 'etl_pipeline', runnable: true });

    await loadCatalogue(page);

    expect(page.workflowRunnable()).toBe(true);
    expect(page.canRun()).toBe(true);
  });

  it('keeps Run available when the catalogue omits the runnable flag', async () => {
    const page = catalogPage({ workflowId: 'etl_pipeline' });

    await loadCatalogue(page);

    expect(page.workflowRunnable()).toBe(true);
    expect(page.canRun()).toBe(true);
  });
});

/**
 * Mounts `GraphPage` through the real router binding
 * (`provideRouter(..., withComponentInputBinding())`) on the
 * `/graph/read/:workflowId` route, so every component input — including the
 * ones absent from the route/query — is set by Angular exactly as it is in the
 * running app. The renderer canvas cannot mount under jsdom, so its template is
 * replaced by a content projection while its declared inputs stay intact; the
 * real toolbar (and its `button.graph-float-btn--run`) still renders from the
 * page template.
 *
 * @param url - Route URL to activate (with or without a `runAllowed` query).
 * @return The harness, the routed page, and the rendered Run control.
 */
async function mountGraphRoute(
  url: string,
): Promise<{
  harness: RouterTestingHarness;
  page: GraphPage;
  runButton: HTMLButtonElement;
}> {
  const execution = {
    backendAvailable: signal<boolean | undefined>(true),
    checkBackend: jest.fn(async () => undefined),
  };
  const capabilities = {
    selectedEngineId: jest.fn(() => 'local'),
    canRunWorkflowOn: jest.fn(() => true),
    canRunWorkflow: signal(true),
    canUpdateWorkflow: signal(true),
    engineLabel: signal('local'),
    load: jest.fn(async () => undefined),
    getWorkflow: jest.fn(async () => undefined),
    workflowSummary: jest.fn(async () => ({
      workflowId: 'fixture-manual-log',
      runnable: true,
    })),
    engines: signal([]),
    workflows: signal([]),
  };
  const catalog = {
    manifests: signal([]),
    status: signal('ready'),
    failure: signal(null),
    load: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
  };
  const save = {
    saving: signal(false),
    loadDocument: jest.fn(async () => undefined),
    saveDocument: jest.fn(async () => undefined),
  };

  TestBed.configureTestingModule({
    imports: [
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
      }),
    ],
    providers: [
      provideRouter(
        [
          {
            path: 'graph/read/:workflowId',
            component: GraphPage,
            data: { operation: 'read' },
          },
        ],
        withComponentInputBinding(),
      ),
      { provide: GraphExecutionService, useValue: execution },
      { provide: GraphSaveService, useValue: save },
      {
        provide: GraphAutoSaveService,
        useValue: { enabled: signal(false), setEnabled: jest.fn() },
      },
      {
        provide: GraphMutationDetectorService,
        useValue: { configure: jest.fn() },
      },
      {
        provide: GraphWorkflowDocumentStore,
        useValue: new GraphWorkflowDocumentStore(),
      },
      { provide: GraphRunClient, useValue: {} },
      { provide: GraphRunEventClient, useValue: {} },
      { provide: GraphWorkflowValidateClient, useValue: null },
      { provide: GraphNodeCatalogService, useValue: catalog },
      { provide: GraphEngineCapabilityService, useValue: capabilities },
      {
        provide: GraphHistoryService,
        useValue: {
          setActiveWorkflow: jest.fn(),
          canUndoFor: jest.fn(() => false),
          canRedoFor: jest.fn(() => false),
          undo: jest.fn(),
          redo: jest.fn(),
        },
      },
      {
        provide: GraphKeyboardShortcutsService,
        useValue: { configure: jest.fn(), attach: jest.fn(), detach: jest.fn() },
      },
      { provide: GRAPH_DEV_MODE, useValue: false },
    ],
  });
  TestBed.overrideComponent(GraphPage, {
    set: {
      providers: [
        { provide: GraphExecutionService, useValue: execution },
        { provide: GraphNodeCatalogService, useValue: catalog },
        { provide: GRAPH_DEV_MODE, useValue: false },
      ],
    },
  });
  TestBed.overrideComponent(GraphRendererComponent, {
    set: { template: '<ng-content />', providers: [] },
  });

  const harness = await RouterTestingHarness.create(url);
  harness.detectChanges();
  await harness.fixture.whenStable();
  harness.detectChanges();

  const page = harness.routeDebugElement?.componentInstance as GraphPage;
  const runButton = harness.fixture.nativeElement.querySelector(
    'button.graph-float-btn--run',
  ) as HTMLButtonElement | null;
  if (!runButton) {
    throw new Error(`Run control not rendered for ${url}`);
  }
  return { harness, page, runButton };
}

describe('GraphPage — runAllowed route binding (SAA-1425 regression)', () => {
  afterEach(() => {
    graphValidity.reset();
    TestBed.resetTestingModule();
  });

  it('keeps Run enabled on /graph/read/:id when the route has no runAllowed input', async () => {
    const { page, runButton } = await mountGraphRoute(
      '/graph/read/fixture-manual-log',
    );

    expect(page.runAllowed()).toBe(true);
    expect(page.canRun()).toBe(true);
    expect(runButton.classList.contains('graph-float-btn--run')).toBe(true);
    expect(runButton.hidden).toBe(false);
    expect(runButton.disabled).toBe(false);
    expect(runButton.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('keeps Run disabled when ?runAllowed=false is bound from the route', async () => {
    const { page, runButton } = await mountGraphRoute(
      '/graph/read/fixture-manual-log?runAllowed=false',
    );

    expect(page.runAllowed()).toBe(false);
    expect(page.canRun()).toBe(false);
    expect(runButton.disabled).toBe(true);
    expect(runButton.getAttribute('aria-disabled')).toBe('true');
  });
});
