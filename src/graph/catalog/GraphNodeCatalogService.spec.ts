/**
 * @module for-angular/graph/catalog/GraphNodeCatalogService.spec
 * @summary PR-H palette failure-surface contract (DECAF-50 §4.23 G3-26/G3-27).
 * @description Proves the catalogue service projects the source's status and
 * failure class into the store the palette renders. Per the §4.24 infra pairing,
 * every assertion checks the catalogue STATUS first (a fixture compile error
 * silently empties the palette, so a manifest-count assertion alone is unsafe):
 *
 * - a graceful source that reports a failure lands `degraded` with that class;
 * - a throwing source lands `failed` with the classified error and still rejects;
 * - a healthy load lands `ready`, and a later success clears a prior failure.
 */
import { TestBed } from '@angular/core/testing';
import { SerializationError } from '@decaf-ts/db-decorators';
import type { GraphNodeManifest } from '@decaf-ts/ui-decorators/graph';

import { GraphCatalogueUnavailableError } from './GraphNodeCatalogApi';
import {
  GraphNodeCatalogService,
  GRAPH_NODE_CATALOG_SOURCE,
} from './GraphNodeCatalogService';
import { GraphNodeCatalogStore } from './GraphNodeCatalogStore';
import type {
  GraphNodeCatalogFailure,
  GraphNodeCatalogSource,
} from './GraphNodeCatalogStore';

/** Minimal valid manifest literal. */
function manifest(kind: string): GraphNodeManifest {
  return { kind, title: kind, inputs: [], outputs: [], parameters: [] } as never;
}

/** Builds the service with a source stub. */
function buildService(source: Partial<GraphNodeCatalogSource>): GraphNodeCatalogService {
  TestBed.configureTestingModule({
    providers: [
      GraphNodeCatalogService,
      GraphNodeCatalogStore,
      { provide: GRAPH_NODE_CATALOG_SOURCE, useValue: source },
    ],
  });
  return TestBed.inject(GraphNodeCatalogService);
}

describe('GraphNodeCatalogService (G3-26/G3-27 status surface)', () => {
  it('lands ready with the manifests and no failure on a healthy load', async () => {
    const service = buildService({
      fetchManifests: jest.fn(async () => [manifest('core.flow.code')]),
    });

    await service.refresh();

    // Status first (per §4.24 infra pairing): a fixture compile error would
    // empty the palette while a count-only assertion still passed.
    expect(service.status()).toBe('ready');
    expect(service.failure()).toBeNull();
    expect(service.manifests().map((item) => item.kind)).toEqual(['core.flow.code']);
  });

  it('lands degraded with the source failure class when the source degrades gracefully', async () => {
    const failure: GraphNodeCatalogFailure = {
      kind: 'backend-down',
      message: 'backend offline',
    };
    const service = buildService({
      fetchManifests: jest.fn(async () => [manifest('core.flow.code')]),
      failure: () => failure,
    });

    await service.refresh();

    expect(service.status()).toBe('degraded');
    expect(service.failure()).toEqual(failure);
    // The fixture manifests still serve the palette.
    expect(service.manifests()).toHaveLength(1);
  });

  it('lands failed + backend-down when the source throws a catalogue outage', async () => {
    const service = buildService({
      fetchManifests: jest.fn(async () => {
        throw new GraphCatalogueUnavailableError('GET graph/node-types');
      }),
    });

    await expect(service.refresh()).rejects.toBeInstanceOf(GraphCatalogueUnavailableError);

    expect(service.status()).toBe('failed');
    expect(service.failure()).toMatchObject({ kind: 'backend-down' });
  });

  it('lands failed + malformed-response when the source throws out of contract', async () => {
    const service = buildService({
      fetchManifests: jest.fn(async () => {
        throw new SerializationError('list response is out of contract');
      }),
    });

    await expect(service.refresh()).rejects.toBeInstanceOf(SerializationError);

    expect(service.status()).toBe('failed');
    expect(service.failure()).toMatchObject({ kind: 'malformed-response' });
  });

  it('clears the failure and returns to ready after a later successful refresh', async () => {
    let fail = true;
    const service = buildService({
      fetchManifests: jest.fn(async () => {
        if (fail) throw new GraphCatalogueUnavailableError('GET graph/node-types');
        return [manifest('core.flow.code')];
      }),
    });

    await expect(service.refresh()).rejects.toBeInstanceOf(GraphCatalogueUnavailableError);
    expect(service.status()).toBe('failed');

    fail = false;
    await service.refresh();

    expect(service.status()).toBe('ready');
    expect(service.failure()).toBeNull();
  });

  it('load is idempotent: it never refetches a populated store', async () => {
    const fetchManifests = jest.fn(async () => [manifest('core.flow.code')]);
    const service = buildService({ fetchManifests });

    await service.load();
    await service.load();

    expect(fetchManifests).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('ready');
  });
});
