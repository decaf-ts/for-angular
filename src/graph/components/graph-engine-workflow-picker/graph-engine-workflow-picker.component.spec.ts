/**
 * @module for-angular/graph/components/graph-engine-workflow-picker/graph-engine-workflow-picker.component.spec
 * @summary SAA-219 — workflow picker render/selection contract.
 * @description Proves the smart picker projects the capability manifest into its
 * four states and resolves a workflow before emitting:
 *
 * - an engine without workflow-listing shows the unsupported message and no list;
 * - a `loading` status shows the spinner; a supported engine with no workflows
 *   shows the empty state; a populated list renders one row per workflow;
 * - Run resolves the document through the service and emits `workflowSelected` with
 *   the resolved document, while a failed lookup emits nothing;
 * - the engine selector renders only when more than one engine is available and an
 *   engine change re-selects and re-lists.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';
import type { GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';

import {
  GraphEngineCapabilityService,
  GRAPH_ENGINE_CAPABILITY_SOURCE,
} from '../../capabilities/GraphEngineCapabilityService';
import { GraphEngineCapabilityStore } from '../../capabilities/GraphEngineCapabilityStore';
import type {
  GraphEngineCapabilitySource,
  GraphEngineFeature,
} from '../../capabilities';
import type { GraphEngineCapabilityManifest } from '../../capabilities';
import { GraphEngineWorkflowPickerComponent } from './graph-engine-workflow-picker.component';

/**
 * Builds an engine descriptor with the given capability rows.
 * @param engineId - The engine identifier.
 * @param capabilities - The capability features.
 * @return The engine descriptor.
 */
function engine(
  engineId: string,
  capabilities: GraphEngineFeature[],
): GraphEngineCapabilityManifest['engines'][number] {
  return {
    engineId,
    displayName: `Engine ${engineId}`,
    local: true,
    pinnedEngineVersion: '1.0.0',
    capabilities,
  };
}

/**
 * A manifest with the given engines and default.
 * @param engines - The engine descriptors.
 * @param defaultEngineId - The default engine id.
 * @return The manifest fixture.
 */
function manifest(
  engines: GraphEngineCapabilityManifest['engines'],
  defaultEngineId: string,
): GraphEngineCapabilityManifest {
  return { engines, defaultEngineId };
}

/** Builds a workflow document. */
function document(workflowId: string): GraphWorkflowDocument {
  return {
    id: workflowId,
    name: workflowId,
    inputs: [],
    outputs: [],
    nodes: [],
    edges: [],
  } as GraphWorkflowDocument;
}

/** A fake source with every method stubbed. */
function fakeSource(
  overrides: Partial<GraphEngineCapabilitySource> = {},
): GraphEngineCapabilitySource {
  return {
    fetchManifest: jest.fn(async () =>
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    ),
    fetchEngine: jest.fn(async () => undefined),
    listWorkflows: jest.fn(async () => []),
    getWorkflow: jest.fn(async () => undefined),
    ...overrides,
  };
}

/** Mounts the picker with a fake capability source. */
async function render(
  source: GraphEngineCapabilitySource = fakeSource(),
): Promise<{
  fixture: ComponentFixture<GraphEngineWorkflowPickerComponent>;
  store: GraphEngineCapabilityStore;
  source: GraphEngineCapabilitySource;
}> {
  await TestBed.configureTestingModule({
    imports: [
      GraphEngineWorkflowPickerComponent,
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
      }),
    ],
    providers: [
      GraphEngineCapabilityService,
      GraphEngineCapabilityStore,
      { provide: GRAPH_ENGINE_CAPABILITY_SOURCE, useValue: source },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(GraphEngineWorkflowPickerComponent);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return {
    fixture,
    store: TestBed.inject(GraphEngineCapabilityStore),
    source,
  };
}

describe('GraphEngineWorkflowPickerComponent — states', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders nothing while closed', async () => {
    const { fixture } = await render();
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker'),
    ).toBeNull();
  });

  it('shows the unsupported message and no list when the engine cannot browse', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'NOT_SUPPORTED' }])], 'engine-a'),
    );
    store.setStatus('ready');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker__unsupported'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker__list'),
    ).toBeNull();
  });

  it('shows the spinner while loading', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    );
    store.setStatus('loading');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker__loading'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker__empty'),
    ).toBeNull();
  });

  it('shows the empty state when the engine lists no workflows', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    );
    store.setStatus('ready');
    store.setWorkflows([]);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker__empty'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.graph-engine-picker__list'),
    ).toBeNull();
  });

  it('renders one row per workflow', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    );
    store.setStatus('ready');
    store.setWorkflows([
      { workflowId: 'wf-1', name: 'Workflow One' },
      { workflowId: 'wf-2', name: 'Workflow Two' },
    ]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll(
      '.graph-engine-picker__workflow',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent?.trim()).toBe('Workflow One');
    expect(rows[1].textContent?.trim()).toBe('Workflow Two');
  });
});

describe('GraphEngineWorkflowPickerComponent — selection', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('emits workflowSelected with the resolved document when Run is triggered', async () => {
    const resolved = document('wf-1');
    const { fixture, store } = await render(
      fakeSource({ getWorkflow: jest.fn(async () => resolved) }),
    );
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    );
    store.setStatus('ready');
    const summary = { workflowId: 'wf-1', name: 'Workflow One' };
    store.setWorkflows([summary]);

    const selections: unknown[] = [];
    fixture.componentInstance.workflowSelected.subscribe((value) => {
      selections.push(value);
    });

    await fixture.componentInstance.onWorkflowRun(summary);

    expect(selections).toEqual([
      { engineId: 'engine-a', summary, document: resolved },
    ]);
  });

  it('emits nothing when the workflow document cannot be resolved', async () => {
    const { fixture, store } = await render(
      fakeSource({
        getWorkflow: jest.fn(async () => {
          throw new Error('workflow lookup failed');
        }),
      }),
    );
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    );
    store.setStatus('ready');
    store.setWorkflows([{ workflowId: 'wf-1', name: 'Workflow One' }]);

    let emitted = 0;
    fixture.componentInstance.workflowSelected.subscribe(() => {
      emitted += 1;
    });

    await fixture.componentInstance.onWorkflowRun({
      workflowId: 'wf-1',
      name: 'Workflow One',
    });

    expect(emitted).toBe(0);
  });

  it('re-selects and re-lists when the engine changes', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => [{ workflowId: 'wf-b' }]),
    });
    const { fixture, store } = await render(source);
    store.setManifest(
      manifest(
        [
          engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
          engine('engine-b', [{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
        ],
        'engine-a',
      ),
    );
    store.setStatus('ready');
    fixture.detectChanges();

    fixture.componentInstance.onEngineChange(
      new CustomEvent('ionChange', { detail: { value: 'engine-b' } }),
    );
    await fixture.whenStable();

    expect(store.signals.selectedEngineId()).toBe('engine-b');
    expect(source.listWorkflows).toHaveBeenCalledWith('engine-b');
  });

  it('renders the engine selector only when more than one engine is available', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest([engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])], 'engine-a'),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-select')).toBeNull();

    store.setManifest(
      manifest(
        [
          engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
          engine('engine-b', [{ feature: 'workflowList', verdict: 'SUPPORTED' }]),
        ],
        'engine-a',
      ),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ion-select')).not.toBeNull();
  });

  it('loads the manifest and lists the workflows on openAndLoad', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => [{ workflowId: 'wf-1' }]),
    });
    const { fixture, store } = await render(source);

    await fixture.componentInstance.openAndLoad();

    expect(source.fetchManifest).toHaveBeenCalledTimes(1);
    expect(source.listWorkflows).toHaveBeenCalledWith('engine-a');
    expect(store.signals.workflows().map((item) => item.workflowId)).toEqual([
      'wf-1',
    ]);
  });

  it('emits dismiss when the picker is dismissed', async () => {
    const { fixture } = await render();

    let emitted = 0;
    fixture.componentInstance.dismiss.subscribe(() => {
      emitted += 1;
    });

    fixture.componentInstance.onDismiss();

    expect(emitted).toBe(1);
  });
});

describe('GraphEngineWorkflowPickerComponent — gated Run action (SAA-707)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('disables the Run button when the engine explicitly blocks running', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest(
        [
          engine('engine-a', [
            { feature: 'workflowList', verdict: 'SUPPORTED' },
            { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
          ]),
        ],
        'engine-a',
      ),
    );
    store.setStatus('ready');
    store.setWorkflows([{ workflowId: 'wf-1', name: 'Workflow One' }]);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'ion-button',
    ) as HTMLElement;

    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('keeps the Run button enabled when the engine leaves running undeclared', async () => {
    const { fixture, store } = await render();
    store.setManifest(
      manifest(
        [engine('engine-a', [{ feature: 'workflowList', verdict: 'SUPPORTED' }])],
        'engine-a',
      ),
    );
    store.setStatus('ready');
    store.setWorkflows([{ workflowId: 'wf-1', name: 'Workflow One' }]);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'ion-button',
    ) as HTMLElement;

    expect(button.getAttribute('aria-disabled')).toBe('false');
  });

  it('does not resolve or emit when the engine blocks running', async () => {
    const getWorkflow = jest.fn(async () => document('wf-1'));
    const { fixture, store } = await render(fakeSource({ getWorkflow }));
    store.setManifest(
      manifest(
        [
          engine('engine-a', [
            { feature: 'workflowList', verdict: 'SUPPORTED' },
            { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
          ]),
        ],
        'engine-a',
      ),
    );
    store.setStatus('ready');
    store.setWorkflows([{ workflowId: 'wf-1', name: 'Workflow One' }]);

    let emitted = 0;
    fixture.componentInstance.workflowSelected.subscribe(() => {
      emitted += 1;
    });

    await fixture.componentInstance.onWorkflowRun({
      workflowId: 'wf-1',
      name: 'Workflow One',
    });

    expect(getWorkflow).not.toHaveBeenCalled();
    expect(emitted).toBe(0);
  });
});
