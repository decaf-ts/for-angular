/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityStore.spec
 * @summary SAA-219 — capability signal-store contract.
 * @description Proves the store's manifest/selection/workflow state machine:
 *
 * - `setManifest` validates the manifest shape (engines array, defaultEngineId,
 *   non-empty unique engineIds) and resets the selection to `defaultEngineId`
 *   whenever the previous selection is unknown to the new manifest;
 * - `selectEngine` ignores unknown ids and clears the cached workflows when the
 *   selection changes;
 * - `setWorkflows` replaces the list, and `setStatus` only retains a failure for
 *   the `degraded`/`failed` statuses.
 */
import { TestBed } from '@angular/core/testing';
import { ValidationError } from '@decaf-ts/db-decorators';
import {
  GraphEngineCapabilityStore,
  type GraphEngineCapabilityFailure,
} from './GraphEngineCapabilityStore';
import type {
  GraphEngineCapabilityManifest,
  GraphEngineDescriptor,
  GraphEngineWorkflowSummary,
} from './GraphEngineCapability';

/** Builds an engine descriptor. */
function engine(engineId: string): GraphEngineDescriptor {
  return {
    engineId,
    displayName: `Engine ${engineId}`,
    local: true,
    pinnedEngineVersion: '1.0.0',
    capabilities: [{ feature: 'workflowList', verdict: 'SUPPORTED' }],
  };
}

/** Builds a manifest with the given engines and default. */
function manifest(
  engines: GraphEngineDescriptor[],
  defaultEngineId = engines[0]?.engineId ?? 'engine-1',
): GraphEngineCapabilityManifest {
  return { engines, defaultEngineId };
}

/** Builds a workflow summary. */
function workflow(workflowId: string): GraphEngineWorkflowSummary {
  return { workflowId, name: workflowId };
}

/** Creates the store under test. */
function buildStore(): GraphEngineCapabilityStore {
  TestBed.configureTestingModule({ providers: [GraphEngineCapabilityStore] });
  return TestBed.inject(GraphEngineCapabilityStore);
}

describe('GraphEngineCapabilityStore — manifest', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('selects the default engine and exposes the manifest engines', () => {
    const store = buildStore();
    store.setManifest(manifest([engine('engine-1'), engine('engine-2')], 'engine-2'));

    expect(store.engines().map((item) => item.engineId)).toEqual([
      'engine-1',
      'engine-2',
    ]);
    expect(store.selectedEngine()?.engineId).toBe('engine-2');
    expect(store.engine('engine-1')?.engineId).toBe('engine-1');
  });

  it('rejects a manifest without an engines array or defaultEngineId', () => {
    const store = buildStore();
    expect(() =>
      store.setManifest(null as unknown as GraphEngineCapabilityManifest),
    ).toThrow(ValidationError);
    expect(() =>
      store.setManifest({ engines: null } as unknown as GraphEngineCapabilityManifest),
    ).toThrow(ValidationError);
    expect(() =>
      store.setManifest({ engines: [] } as unknown as GraphEngineCapabilityManifest),
    ).toThrow(ValidationError);
  });

  it('rejects an engine without a valid engineId and duplicate engineIds', () => {
    const store = buildStore();
    expect(() =>
      store.setManifest(
        manifest([
          { ...engine('engine-1'), engineId: '' },
        ]),
      ),
    ).toThrow(ValidationError);
    expect(() =>
      store.setManifest(manifest([engine('engine-1'), engine('engine-1')])),
    ).toThrow(ValidationError);
  });

  it('resets the selection to defaultEngineId when the previous selection is unknown', () => {
    const store = buildStore();
    store.setManifest(manifest([engine('engine-1'), engine('engine-2')], 'engine-1'));
    store.selectEngine('engine-2');
    expect(store.selectedEngine()?.engineId).toBe('engine-2');

    store.setManifest(manifest([engine('engine-3')], 'engine-3'));

    expect(store.selectedEngine()?.engineId).toBe('engine-3');
  });

  it('keeps a selection that is still present in the new manifest', () => {
    const store = buildStore();
    store.setManifest(manifest([engine('engine-1'), engine('engine-2')], 'engine-1'));
    store.selectEngine('engine-2');

    store.setManifest(manifest([engine('engine-1'), engine('engine-2')], 'engine-1'));

    expect(store.selectedEngine()?.engineId).toBe('engine-2');
  });

  it('clears the cached workflows when a new manifest lands', () => {
    const store = buildStore();
    store.setWorkflows([workflow('wf-1')]);

    store.setManifest(manifest([engine('engine-1')]));

    expect(store.workflows()).toEqual([]);
  });
});

describe('GraphEngineCapabilityStore — selection', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('ignores an unknown engine id', () => {
    const store = buildStore();
    store.setManifest(manifest([engine('engine-1')], 'engine-1'));

    store.selectEngine('engine-unknown');

    expect(store.selectedEngine()?.engineId).toBe('engine-1');
  });

  it('changes the selection and clears the cached workflows', () => {
    const store = buildStore();
    store.setManifest(manifest([engine('engine-1'), engine('engine-2')], 'engine-1'));
    store.setWorkflows([workflow('wf-1')]);

    store.selectEngine('engine-2');

    expect(store.selectedEngine()?.engineId).toBe('engine-2');
    expect(store.workflows()).toEqual([]);
  });

  it('reports no selected engine before a manifest lands', () => {
    const store = buildStore();
    expect(store.selectedEngine()).toBeUndefined();
    expect(store.engine('engine-1')).toBeUndefined();
    expect(store.engines()).toEqual([]);
  });
});

describe('GraphEngineCapabilityStore — workflows and status', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('replaces the workflow list', () => {
    const store = buildStore();
    store.setWorkflows([workflow('wf-1')]);
    store.setWorkflows([workflow('wf-2'), workflow('wf-3')]);

    expect(store.workflows().map((item) => item.workflowId)).toEqual([
      'wf-2',
      'wf-3',
    ]);
  });

  it('retains a failure only for degraded/failed statuses', () => {
    const store = buildStore();
    const failure: GraphEngineCapabilityFailure = {
      kind: 'backend-down',
      message: 'backend offline',
    };

    store.setStatus('ready');
    expect(store.failure()).toBeNull();

    store.setStatus('degraded', failure);
    expect(store.failure()).toEqual(failure);

    store.setStatus('loading');
    expect(store.failure()).toBeNull();
  });
});
