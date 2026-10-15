/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityService.spec
 * @summary SAA-219 — capability service load/query contract.
 * @description Proves the service projects the manifest source into the store and
 * the derived affordances the toolbar/picker consume:
 *
 * - `load` fetches once and caches, `refresh` always re-fetches;
 * - `canBrowseWorkflows`/`canLookupWorkflow` follow the selected engine's
 *   verdicts, and the labels/chips project the manifest;
 * - `listWorkflows` never throws: it returns `[]` on unsupported engines, on the
 *   `GraphEngineWorkflowCatalogUnsupportedError`, and on any other failure
 *   (landing `degraded`); `getWorkflow` returns `undefined` on failure;
 * - a backend outage surfaces `GraphEngineCapabilityUnavailableError` and lands the
 *   store `failed` with `backend-down`.
 */
import { TestBed } from '@angular/core/testing';
import { SerializationError } from '@decaf-ts/db-decorators';
import type { GraphWorkflowDocument } from '@decaf-ts/as-graph/shared';

import {
  GraphEngineCapabilityUnavailableError,
  GraphEngineWorkflowCatalogUnsupportedError,
  type GraphEngineCapabilitySource,
} from './GraphEngineCapabilityApi';
import {
  GraphEngineCapabilityService,
  GRAPH_ENGINE_CAPABILITY_SOURCE,
} from './GraphEngineCapabilityService';
import { GraphEngineCapabilityStore } from './GraphEngineCapabilityStore';
import type {
  GraphEngineCapabilityManifest,
  GraphEngineDescriptor,
  GraphEngineFeature,
  GraphEngineWorkflowSummary,
} from './GraphEngineCapability';

/** Builds an engine descriptor with the given capability rows. */
function engine(
  engineId: string,
  capabilities: GraphEngineFeature[],
): GraphEngineDescriptor {
  return {
    engineId,
    displayName: `Engine ${engineId}`,
    local: true,
    pinnedEngineVersion: '1.0.0',
    capabilities,
  };
}

/** A manifest whose default engine supports workflow listing and lookup. */
function manifest(): GraphEngineCapabilityManifest {
  return {
    engines: [
      engine('engine-a', [
        { feature: 'workflowList', verdict: 'SUPPORTED' },
        { feature: 'workflowLookup', verdict: 'SUPPORTED' },
      ]),
      engine('engine-b', [
        { feature: 'workflowList', verdict: 'NOT_SUPPORTED' },
      ]),
    ],
    defaultEngineId: 'engine-a',
  };
}

/** Builds a workflow summary. */
function workflow(workflowId: string): GraphEngineWorkflowSummary {
  return { workflowId, name: workflowId };
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

/** Builds the service with an optional fake source. */
function buildService(source?: Partial<GraphEngineCapabilitySource>): {
  service: GraphEngineCapabilityService;
  store: GraphEngineCapabilityStore;
} {
  const providers: unknown[] = [
    GraphEngineCapabilityService,
    GraphEngineCapabilityStore,
  ];
  if (source) {
    providers.push({ provide: GRAPH_ENGINE_CAPABILITY_SOURCE, useValue: source });
  }
  TestBed.configureTestingModule({ providers });
  return {
    service: TestBed.inject(GraphEngineCapabilityService),
    store: TestBed.inject(GraphEngineCapabilityStore),
  };
}

/** A fake source with every method stubbed. */
function fakeSource(
  overrides: Partial<GraphEngineCapabilitySource> = {},
): GraphEngineCapabilitySource {
  return {
    fetchManifest: jest.fn(async () => manifest()),
    fetchEngine: jest.fn(async () => undefined),
    listWorkflows: jest.fn(async () => []),
    getWorkflow: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('GraphEngineCapabilityService — load/refresh', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads the manifest once and caches it', async () => {
    const source = fakeSource();
    const { service, store } = buildService(source);

    await service.load();
    await service.load();

    expect(source.fetchManifest).toHaveBeenCalledTimes(1);
    expect(store.signals.status()).toBe('ready');
    expect(service.engines().map((item) => item.engineId)).toEqual([
      'engine-a',
      'engine-b',
    ]);
  });

  it('re-fetches on refresh', async () => {
    const source = fakeSource();
    const { service, store } = buildService(source);

    await service.load();
    await service.refresh();

    expect(source.fetchManifest).toHaveBeenCalledTimes(2);
    expect(store.signals.status()).toBe('ready');
  });

  it('lands failed + backend-down and rejects when the source is offline', async () => {
    const source = fakeSource({
      fetchManifest: jest.fn(async () => {
        throw new GraphEngineCapabilityUnavailableError('graph/engines');
      }),
    });
    const { service, store } = buildService(source);

    await expect(service.load()).rejects.toBeInstanceOf(
      GraphEngineCapabilityUnavailableError,
    );

    expect(store.signals.status()).toBe('failed');
    expect(store.signals.failure()).toMatchObject({ kind: 'backend-down' });
  });

  it('lands failed + malformed-response when the manifest is out of contract', async () => {
    const source = fakeSource({
      fetchManifest: jest.fn(async () => {
        throw new SerializationError('manifest is out of contract');
      }),
    });
    const { service, store } = buildService(source);

    await expect(service.refresh()).rejects.toBeInstanceOf(SerializationError);

    expect(store.signals.status()).toBe('failed');
    expect(store.signals.failure()).toMatchObject({
      kind: 'malformed-response',
    });
  });

  it('lands failed + backend-down and rejects when no source is provided', async () => {
    const { service, store } = buildService();

    await expect(service.load()).rejects.toBeInstanceOf(
      GraphEngineCapabilityUnavailableError,
    );

    expect(store.signals.status()).toBe('failed');
    expect(store.signals.failure()).toMatchObject({ kind: 'backend-down' });
    expect(service.canBrowseWorkflows()).toBe(false);
  });
});

describe('GraphEngineCapabilityService — affordances', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('follows the selected engine workflowList verdict', async () => {
    const { service, store } = buildService(fakeSource());
    await service.load();

    expect(service.canBrowseWorkflows()).toBe(true);

    service.selectEngine('engine-b');

    expect(store.signals.selectedEngineId()).toBe('engine-b');
    expect(service.canBrowseWorkflows()).toBe(false);
  });

  it('follows the selected engine workflowLookup verdict', async () => {
    const { service } = buildService(fakeSource());
    await service.load();

    expect(service.canLookupWorkflow()).toBe(true);

    service.selectEngine('engine-b');

    expect(service.canLookupWorkflow()).toBe(false);
  });

  it('projects the engine label and only the SUPPORTED capability chips', async () => {
    const { service } = buildService(
      fakeSource({
        fetchManifest: jest.fn(async () => ({
          engines: [
            engine('engine-a', [
              { feature: 'workflowList', verdict: 'SUPPORTED' },
              { feature: 'workflowLookup', verdict: 'NOT_SUPPORTED' },
              { feature: 'experimental', verdict: 'EXTENSION_POINT' },
            ]),
          ],
          defaultEngineId: 'engine-a',
        })),
      }),
    );
    await service.load();

    expect(service.engineLabel()).toBe('Engine engine-a');
    expect(service.capabilityChips()).toEqual(['workflowList']);
    expect(service.supports('workflowList')).toBe(true);
    expect(service.supports('workflowLookup')).toBe(false);
  });

  it('reports an empty label before a manifest lands', () => {
    const { service } = buildService(fakeSource());

    expect(service.engineLabel()).toBe('');
    expect(service.canBrowseWorkflows()).toBe(false);
    expect(service.canSelectEngine()).toBe(false);
  });
});

describe('GraphEngineCapabilityService — workflow catalog', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('lists the selected engine workflows and caches them', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => [workflow('wf-1'), workflow('wf-2')]),
    });
    const { service, store } = buildService(source);
    await service.load();

    const workflows = await service.listWorkflows();

    expect(workflows.map((item) => item.workflowId)).toEqual(['wf-1', 'wf-2']);
    expect(store.signals.workflows().map((item) => item.workflowId)).toEqual([
      'wf-1',
      'wf-2',
    ]);
    expect(source.listWorkflows).toHaveBeenCalledWith('engine-a');
  });

  it('lists an explicit engine workflows', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => [workflow('wf-b')]),
    });
    const { service } = buildService(source);
    await service.load();

    const workflows = await service.listWorkflows('engine-a');

    expect(workflows.map((item) => item.workflowId)).toEqual(['wf-b']);
    expect(source.listWorkflows).toHaveBeenCalledWith('engine-a');
  });

  it('returns [] without calling the source when the selected engine cannot browse', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => [workflow('wf-1')]),
    });
    const { service, store } = buildService(source);
    await service.load();
    service.selectEngine('engine-b');

    const workflows = await service.listWorkflows();

    expect(workflows).toEqual([]);
    expect(source.listWorkflows).not.toHaveBeenCalled();
    expect(store.signals.workflows()).toEqual([]);
  });

  it('returns [] and never throws when the catalog is unsupported', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => {
        throw new GraphEngineWorkflowCatalogUnsupportedError('engine-a', 'list');
      }),
    });
    const { service, store } = buildService(source);
    await service.load();

    await expect(service.listWorkflows()).resolves.toEqual([]);

    expect(store.signals.workflows()).toEqual([]);
    expect(store.signals.status()).toBe('ready');
  });

  it('returns [] and lands degraded on any other catalog failure', async () => {
    const source = fakeSource({
      listWorkflows: jest.fn(async () => {
        throw new SerializationError('workflow list is out of contract');
      }),
    });
    const { service, store } = buildService(source);
    await service.load();

    await expect(service.listWorkflows()).resolves.toEqual([]);

    expect(store.signals.workflows()).toEqual([]);
    expect(store.signals.status()).toBe('degraded');
    expect(store.signals.failure()).toMatchObject({
      kind: 'malformed-response',
    });
  });

  it('resolves a workflow document by id', async () => {
    const source = fakeSource({
      getWorkflow: jest.fn(async () => document('wf-1')),
    });
    const { service } = buildService(source);
    await service.load();

    const resolved = await service.getWorkflow('engine-a', 'wf-1');

    expect(resolved?.id).toBe('wf-1');
    expect(source.getWorkflow).toHaveBeenCalledWith('engine-a', 'wf-1');
  });

  it('returns undefined when the workflow cannot be found', async () => {
    const source = fakeSource({
      getWorkflow: jest.fn(async () => undefined),
    });
    const { service } = buildService(source);
    await service.load();

    await expect(service.getWorkflow('engine-a', 'missing')).resolves.toBeUndefined();
  });

  it('returns undefined without calling the source for a missing engine or workflow id', async () => {
    const source = fakeSource();
    const { service } = buildService(source);
    await service.load();

    await expect(service.getWorkflow('', 'wf-1')).resolves.toBeUndefined();
    await expect(service.getWorkflow('engine-a', '')).resolves.toBeUndefined();
    expect(source.getWorkflow).not.toHaveBeenCalled();
  });

  it('returns undefined and lands degraded when a lookup fails', async () => {
    const source = fakeSource({
      getWorkflow: jest.fn(async () => {
        throw new SerializationError('workflow is out of contract');
      }),
    });
    const { service, store } = buildService(source);
    await service.load();

    await expect(
      service.getWorkflow('engine-a', 'wf-1'),
    ).resolves.toBeUndefined();

    expect(store.signals.status()).toBe('degraded');
  });

  it('returns undefined without degrading when a lookup is unsupported', async () => {
    const source = fakeSource({
      getWorkflow: jest.fn(async () => {
        throw new GraphEngineWorkflowCatalogUnsupportedError('engine-a', 'lookup');
      }),
    });
    const { service, store } = buildService(source);
    await service.load();

    await expect(
      service.getWorkflow('engine-a', 'wf-1'),
    ).resolves.toBeUndefined();

    expect(store.signals.status()).toBe('ready');
    expect(store.signals.failure()).toBeNull();
  });
});

/** A manifest whose default engine explicitly refuses every authoring/run action. */
function gatedManifest(): GraphEngineCapabilityManifest {
  return {
    engines: [
      engine('gate-engine', [
        { feature: 'workflowList', verdict: 'SUPPORTED' },
        { feature: 'workflowLookup', verdict: 'NOT_SUPPORTED' },
        { feature: 'workflowCreate', verdict: 'NOT_SUPPORTED' },
        { feature: 'workflowUpdate', verdict: 'NOT_SUPPORTED' },
        { feature: 'workflowDelete', verdict: 'NOT_SUPPORTED' },
        { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
        { feature: 'runEventStream', verdict: 'NOT_SUPPORTED' },
        { feature: 'workflowResume', verdict: 'NOT_SUPPORTED' },
      ]),
      engine('bare-engine', []),
    ],
    defaultEngineId: 'gate-engine',
  };
}

/** Builds the service against the all-refusing manifest. */
function buildGatedService(): GraphEngineCapabilityService {
  return buildService(
    fakeSource({ fetchManifest: jest.fn(async () => gatedManifest()) }),
  ).service;
}

describe('GraphEngineCapabilityService — SAA-707 action gates', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('blocks every can*Workflow gate the selected engine explicitly refuses', async () => {
    const service = buildGatedService();
    await service.load();

    expect(service.canBrowseWorkflows()).toBe(true);
    expect(service.canLookupWorkflow()).toBe(false);
    expect(service.canCreateWorkflow()).toBe(false);
    expect(service.canUpdateWorkflow()).toBe(false);
    expect(service.canDeleteWorkflow()).toBe(false);
    expect(service.canRunWorkflow()).toBe(false);
    expect(service.canStreamRunEvents()).toBe(false);
    expect(service.canResumeWorkflow()).toBe(false);
  });

  it('default-allows an undeclared action so an unlisted feature never disables a control', async () => {
    const service = buildGatedService();
    await service.load();
    service.selectEngine('bare-engine');

    expect(service.canCreateWorkflow()).toBe(true);
    expect(service.canUpdateWorkflow()).toBe(true);
    expect(service.canDeleteWorkflow()).toBe(true);
    expect(service.canRunWorkflow()).toBe(true);
    expect(service.canStreamRunEvents()).toBe(true);
    expect(service.canResumeWorkflow()).toBe(true);
    expect(service.supports('workflowRun')).toBe(true);
  });

  it('projects actionGates consistently with the individual gates', async () => {
    const service = buildGatedService();
    await service.load();

    const gates = service.actionGates();
    expect(gates).toEqual({
      browseWorkflows: service.canBrowseWorkflows(),
      lookupWorkflow: service.canLookupWorkflow(),
      createWorkflow: service.canCreateWorkflow(),
      updateWorkflow: service.canUpdateWorkflow(),
      deleteWorkflow: service.canDeleteWorkflow(),
      runWorkflow: service.canRunWorkflow(),
      streamRunEvents: service.canStreamRunEvents(),
      resumeWorkflow: service.canResumeWorkflow(),
    });
    expect(gates.runWorkflow).toBe(false);
    expect(gates.browseWorkflows).toBe(true);
  });

  it('resolves featureVerdict without collapsing it to a boolean', async () => {
    const service = buildGatedService();
    await service.load();

    expect(service.featureVerdict('workflowRun')).toBe('NOT_SUPPORTED');
    expect(service.featureVerdict('workflowList')).toBe('SUPPORTED');
    expect(service.featureVerdict('notDeclared')).toBeUndefined();
  });

  it('keeps supports false for an explicit NOT_SUPPORTED row', async () => {
    const service = buildGatedService();
    await service.load();

    expect(service.supports('workflowLookup')).toBe(false);
    expect(service.supports('workflowCreate')).toBe(false);
    expect(service.supports('workflowRun')).toBe(false);
  });

  it('reports manifestReady from the ready status', async () => {
    const service = buildGatedService();

    expect(service.manifestReady()).toBe(false);

    await service.load();

    expect(service.manifestReady()).toBe(true);
  });

  it('reports degraded when a catalogue interaction fails', async () => {
    const { service } = buildService(
      fakeSource({
        fetchManifest: jest.fn(async () => gatedManifest()),
        listWorkflows: jest.fn(async () => {
          throw new SerializationError('workflow list is out of contract');
        }),
      }),
    );

    expect(service.degraded()).toBe(false);
    await service.load();
    expect(service.degraded()).toBe(false);

    await service.listWorkflows();

    expect(service.degraded()).toBe(true);
  });
});
