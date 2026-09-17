/**
 * @module for-angular/graph/catalog/GraphNodeCatalogCompositeSource.spec
 * @summary Gate-2 P0 #8 (PR-H) — composite-source failure-class contract.
 * @description Proves the composite catalogue source (DECAF-50 §4.23
 * G3-26/G3-27, §4.24 P1 #8) never swallows a live-backend failure and
 * distinguishes its two classes:
 *
 * - `backend-down` (a {@link GraphCatalogueUnavailableError}) and
 *   `malformed-response` (any out-of-contract payload error) are classified by
 *   {@link graphNodeCatalogFailureOf} and reported on the source's `failure()`
 *   signal while the fixture set still serves the palette.
 * - The fixture set is fetched FIRST (it stays authoritative), the live extras
 *   merge in only when the backend answers, and a successful fetch clears a prior
 *   failure.
 */
import { TestBed } from '@angular/core/testing';
import { InternalError, SerializationError } from '@decaf-ts/db-decorators';
import type { GraphNodeManifest } from '@decaf-ts/ui-decorators/graph';

import {
  GraphCatalogueUnavailableError,
  GraphNodeCatalogApi,
  graphNodeCatalogFailureOf,
} from './GraphNodeCatalogApi';
import { GraphNodeCatalogCompositeSource } from './GraphNodeCatalogCompositeSource';
import { GraphNodeCatalogFixtureSource } from './GraphNodeManifestFixtures';

/** Minimal manifest literal. */
function manifest(kind: string): GraphNodeManifest {
  return { kind, title: kind, inputs: [], outputs: [], parameters: [] } as never;
}

/** Builds the composite source with the given live/fixture stubs injected. */
function buildSource(live: unknown, fixed: unknown): GraphNodeCatalogCompositeSource {
  TestBed.configureTestingModule({
    providers: [
      GraphNodeCatalogCompositeSource,
      { provide: GraphNodeCatalogApi, useValue: live },
      { provide: GraphNodeCatalogFixtureSource, useValue: fixed },
    ],
  });
  return TestBed.inject(GraphNodeCatalogCompositeSource);
}

describe('GraphNodeCatalogCompositeSource (G3-27 failure classes)', () => {
  it('classifies a backend outage as backend-down', () => {
    const failure = graphNodeCatalogFailureOf(
      new GraphCatalogueUnavailableError('GET graph/node-types')
    );
    expect(failure).toMatchObject({ kind: 'backend-down' });
  });

  it('classifies an out-of-contract response as malformed-response', () => {
    const failure = graphNodeCatalogFailureOf(
      new SerializationError('list response is out of contract')
    );
    expect(failure).toMatchObject({ kind: 'malformed-response' });
  });

  it('serves the fixtures first and merges live extras when the backend answers', async () => {
    const calls: string[] = [];
    const fixed = {
      fetchManifests: jest.fn(async () => {
        calls.push('fixtures');
        return [manifest('core.flow.code'), manifest('core.loop.foreach')];
      }),
    };
    const live = {
      fetchManifests: jest.fn(async () => {
        calls.push('live');
        return [manifest('core.loop.foreach'), manifest('backend.extra')];
      }),
    };
    const source = buildSource(live, fixed);

    const manifests = await source.fetchManifests();

    // Fixtures stay authoritative: the live duplicate of a fixture kind is dropped.
    expect(calls).toEqual(['fixtures', 'live']);
    expect(manifests.map((item) => item.kind)).toEqual([
      'core.flow.code',
      'core.loop.foreach',
      'backend.extra',
    ]);
    expect(source.failure()).toBeNull();
  });

  it('keeps the fixture set when the backend is down and reports backend-down', async () => {
    const fixed = {
      fetchManifests: jest.fn(async () => [manifest('core.flow.code')]),
    };
    const live = {
      fetchManifests: jest.fn(async () => {
        throw new GraphCatalogueUnavailableError('GET graph/node-types', 'offline');
      }),
    };
    const source = buildSource(live, fixed);

    const manifests = await source.fetchManifests();

    expect(manifests.map((item) => item.kind)).toEqual(['core.flow.code']);
    expect(source.failure()).toMatchObject({ kind: 'backend-down' });
  });

  it('keeps the fixture set on an out-of-contract response and reports malformed-response', async () => {
    const fixed = {
      fetchManifests: jest.fn(async () => [manifest('core.flow.code')]),
    };
    const live = {
      fetchManifests: jest.fn(async () => {
        throw new SerializationError('expected a manifest array');
      }),
    };
    const source = buildSource(live, fixed);

    const manifests = await source.fetchManifests();

    expect(manifests.map((item) => item.kind)).toEqual(['core.flow.code']);
    expect(source.failure()).toMatchObject({ kind: 'malformed-response' });
  });

  it('clears a prior failure after a successful live fetch', async () => {
    const fixed = {
      fetchManifests: jest.fn(async () => [manifest('core.flow.code')]),
    };
    let fail = true;
    const live = {
      fetchManifests: jest.fn(async () => {
        if (fail) throw new GraphCatalogueUnavailableError('GET graph/node-types');
        return [manifest('backend.extra')];
      }),
    };
    const source = buildSource(live, fixed);

    await source.fetchManifests();
    expect(source.failure()).toMatchObject({ kind: 'backend-down' });

    fail = false;
    await source.fetchManifests();
    expect(source.failure()).toBeNull();
  });

  it('serves a fixture manifest without touching the live source', async () => {
    const fixed = {
      fetchManifest: jest.fn(async (kind: string) =>
        kind === 'core.flow.code' ? manifest(kind) : undefined
      ),
    };
    const live = {
      fetchManifest: jest.fn(async (kind: string) => manifest(kind)),
    };
    const source = buildSource(live, fixed);

    const found = await source.fetchManifest('core.flow.code');

    expect(found?.kind).toBe('core.flow.code');
    expect(live.fetchManifest).not.toHaveBeenCalled();
  });

  it('reports the live failure class when an unknown kind cannot be fetched', async () => {
    const fixed = {
      fetchManifest: jest.fn(async () => undefined),
    };
    const live = {
      fetchManifest: jest.fn(async () => {
        throw new InternalError('backend answered out of contract');
      }),
    };
    const source = buildSource(live, fixed);

    const found = await source.fetchManifest('backend.unknown');

    expect(found).toBeUndefined();
    expect(source.failure()).toMatchObject({ kind: 'malformed-response' });
  });

  it('reports no failure when no live source is bound', async () => {
    const fixed = {
      fetchManifests: jest.fn(async () => [manifest('core.flow.code')]),
    };
    TestBed.configureTestingModule({
      providers: [
        GraphNodeCatalogCompositeSource,
        { provide: GraphNodeCatalogApi, useValue: null },
        { provide: GraphNodeCatalogFixtureSource, useValue: fixed },
      ],
    });
    const source = TestBed.inject(GraphNodeCatalogCompositeSource);

    const manifests = await source.fetchManifests();

    expect(manifests).toHaveLength(1);
    expect(source.failure()).toBeNull();
  });
});
