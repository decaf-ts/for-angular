/**
 * @module for-angular/graph/runs/GraphRunCatalogBinding.spec
 * @summary DECAF-50 §4.19 Angular run row: `GRAPH_NODE_CATALOG_SOURCE` live
 * binding tests for the canonical node catalogue.
 * @description Proves the Angular catalogue surface the run cutover relies on
 * (spec §4.12/§4.13):
 *
 * - `app.config.ts` binds `GraphNodeCatalogApi` as the canonical HTTP
 *   `GRAPH_NODE_CATALOG_SOURCE`.
 * - `GraphNodeCatalogService.load/refresh/invokeMethod/resolve` read that
 *   source through the same `fetch`/Decaf-error surface.
 * - `GraphNodeCatalogStore` keeps the deterministic kind-sorted manifest set
 *   (`digest`, `GraphNodeNotFoundError` on unknown kinds) and every catalogue
 *   status (`unloaded`/`loading`/`ready`/`failed`).
 */
import { TestBed } from '@angular/core/testing';
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '@decaf-ts/db-decorators';
import type {
  GraphNodeInstance,
  GraphNodeManifest,
} from '@decaf-ts/ui-decorators/graph';

import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import {
  GraphNodeCatalogApi,
  GraphCatalogueUnavailableError,
} from '../catalog/GraphNodeCatalogApi';
import {
  GraphNodeCatalogService,
  GRAPH_NODE_CATALOG_SOURCE,
} from '../catalog/GraphNodeCatalogService';
import {
  GraphNodeCatalogStore,
  GraphNodeNotFoundError,
} from '../catalog/GraphNodeCatalogStore';

// app.config.ts is app-code whose transitive imports (src/app/ew/* directory
// modules without an index) do not resolve under jest; the binding is a static
// provider declaration, so it is verified against the declared config source
// while the behavioral proof runs through the identical TestBed wiring below.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const APP_CONFIG_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../app/app.config.ts'),
  'utf-8',
);

const BACKEND_URL = 'http://backend.test';

/**
 * Angular-injectable constructor for the catalog service. The decaf
 * `@service()` class decorator replaces the exported constructor with a
 * registry wrapper that does not carry Angular's `ɵprov` metadata (Angular's
 * `inject(GraphNodeCatalogService)` fails with NG0201 under that wrapper —
 * reported as a finding on SAA-546). The Angular-decorated original stays
 * reachable through the wrapper's `__original` static, so the behavioral
 * suites exercise the real service implementation either way.
 */
const CatalogServiceCtor =
  (
    GraphNodeCatalogService as unknown as {
      __original?: typeof GraphNodeCatalogService;
    }
  ).__original ?? GraphNodeCatalogService;

/** Minimal literal manifest with one dynamic-output-port rule. */
function manifest(kind: string): GraphNodeManifest {
  return {
    kind,
    display: { label: kind, category: 'Utility' },
    inputs: [],
    outputs: [],
    parameters: [],
    dynamicPorts: [
      {
        type: 'repeatFromParameter',
        parameter: 'cases',
        itemIdPath: 'outputPort',
        itemLabelPath: 'label',
        direction: 'output',
        portIdTemplate: '${id}',
      },
    ],
  } as unknown as GraphNodeManifest;
}

const MANIFEST_A = manifest('core.flow.code');
const MANIFEST_B = manifest('core.loop.foreach');
const MANIFEST_C = manifest('core.trigger.manual');

function httpResponse(body: unknown, status = 200): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  } as never as Response;
}

describe('GraphRunCatalogBinding (DECAF-50 §4.19 — GRAPH_NODE_CATALOG_SOURCE live binding)', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    TestBed.resetTestingModule();
  });

  describe('app.config — canonical HTTP catalogue source binding', () => {
    it('declares GraphNodeCatalogApi as the GRAPH_NODE_CATALOG_SOURCE provider', () => {
      expect(APP_CONFIG_SOURCE).toMatch(
        /\{\s*provide:\s*GRAPH_NODE_CATALOG_SOURCE,\s*useExisting:\s*GraphNodeCatalogApi\s*\}/,
      );
      // The token and the bridge are the real modules, not a local re-declaration.
      expect(GRAPH_NODE_CATALOG_SOURCE).toBeDefined();
      expect(GraphNodeCatalogApi).toBeDefined();
    });
  });

  describe('GraphNodeCatalogStore — deterministic manifest set', () => {
    let store: GraphNodeCatalogStore;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      store = TestBed.inject(GraphNodeCatalogStore);
    });

    it('starts unloaded and exposes every catalogue status', () => {
      expect(store.signals.status()).toBe('unloaded');
      store.setStatus('loading');
      expect(store.signals.status()).toBe('loading');
      store.setStatus('ready');
      expect(store.signals.status()).toBe('ready');
      store.setStatus('failed');
      expect(store.signals.status()).toBe('failed');
    });

    it('sorts manifests deterministically by kind and exposes the digest', () => {
      store.setManifests([MANIFEST_C, MANIFEST_A, MANIFEST_B]);

      expect(store.all().map((entry) => entry.kind)).toEqual([
        'core.flow.code',
        'core.loop.foreach',
        'core.trigger.manual',
      ]);
      // Deterministic regardless of insertion order.
      store.setManifests([MANIFEST_B, MANIFEST_C, MANIFEST_A]);
      expect(store.all().map((entry) => entry.kind)).toEqual([
        'core.flow.code',
        'core.loop.foreach',
        'core.trigger.manual',
      ]);
      expect(store.digest()).toBe('core.flow.code,core.loop.foreach,core.trigger.manual');
      expect(store.get('core.flow.code')).toBe(MANIFEST_A);
      expect(store.get('missing.kind')).toBeUndefined();
    });

    it('rejects duplicate and invalid manifest kinds with Decaf validation errors', () => {
      expect(() => store.setManifests([MANIFEST_A, MANIFEST_A])).toThrow(ValidationError);
      expect(() =>
        store.setManifests([{ kind: '' } as unknown as GraphNodeManifest]),
      ).toThrow(ValidationError);
    });

    it('resolves loaded manifests with dynamic ports and rejects unknown kinds', () => {
      store.setManifests([MANIFEST_A]);

      const instance = {
        kind: 'core.flow.code',
        parameters: { cases: [{ outputPort: 'alpha', label: 'Alpha' }] },
      } as unknown as Pick<GraphNodeInstance, 'kind' | 'parameters' | 'metadata'>;
      const resolved = store.resolve(instance);

      expect(resolved.kind).toBe('core.flow.code');
      expect(resolved.outputs.map((port) => port.id)).toContain('alpha');

      expect(() =>
        store.resolve({ kind: 'missing.kind', parameters: {} } as never),
      ).toThrow(GraphNodeNotFoundError);
    });
  });

  describe('GraphNodeCatalogService over the live HTTP source (as bound in app.config)', () => {
    let service: GraphNodeCatalogService;
    let store: GraphNodeCatalogStore;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          { provide: GRAPH_BACKEND_URL, useValue: BACKEND_URL },
          { provide: GRAPH_NODE_CATALOG_SOURCE, useExisting: GraphNodeCatalogApi },
        ],
      });
      service = TestBed.inject(CatalogServiceCtor);
      store = TestBed.inject(GraphNodeCatalogStore);
    });

    it('loads manifests from GET /graph/node-types and turns the store ready', async () => {
      const fetchMock = jest.fn((url: string, init?: RequestInit) =>
        url === `${BACKEND_URL}/graph/node-types` && init?.method !== 'POST'
          ? Promise.resolve(httpResponse([MANIFEST_C, MANIFEST_A]))
          : Promise.reject(new Error(`unexpected fetch: ${url}`),
          )) as never as jest.Mock;
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      expect(store.signals.status()).toBe('unloaded');
      await service.load();

      expect(fetchMock).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/node-types`,
        expect.objectContaining({ method: 'GET', credentials: 'include' }),
      );
      expect(store.signals.status()).toBe('ready');
      expect(service.all().map((entry) => entry.kind)).toEqual([
        'core.flow.code',
        'core.trigger.manual',
      ]);
      expect(store.digest()).toBe('core.flow.code,core.trigger.manual');

      // Idempotent load: the store keeps its manifests without a second fetch.
      await service.load();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('accepts wrapped manifest payloads (nodes/manifests keys)', async () => {
      globalThis.fetch = jest.fn(() =>
        Promise.resolve(httpResponse({ nodes: [MANIFEST_B] })),
      ) as never as typeof globalThis.fetch;

      await service.refresh();
      expect(service.all().map((entry) => entry.kind)).toEqual(['core.loop.foreach']);
    });

    it('walks unloaded → loading → ready while the source is in flight', async () => {
      let release!: (response: Response) => void;
      globalThis.fetch = jest.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ) as never as typeof globalThis.fetch;

      const pending = service.refresh();
      expect(store.signals.status()).toBe('loading');

      release(httpResponse([MANIFEST_A]));
      await pending;
      expect(store.signals.status()).toBe('ready');
    });

    it('re-fetches on refresh and marks the store failed on source errors', async () => {
      globalThis.fetch = jest.fn(() => Promise.resolve(httpResponse([MANIFEST_A]))) as never as typeof globalThis.fetch;
      await service.load();
      await service.refresh();
      expect((globalThis.fetch as never as jest.Mock).mock.calls.length).toBe(2);

      globalThis.fetch = jest.fn(() =>
        Promise.reject(new TypeError('fetch failed')),
      ) as never as typeof globalThis.fetch;
      await expect(service.refresh()).rejects.toThrow(GraphCatalogueUnavailableError);
      expect(store.signals.status()).toBe('failed');
    });

    it.each([
      [404, NotFoundError],
      [400, BadRequestError],
      [500, InternalError],
    ] as const)(
      'maps catalogue HTTP %s failures onto the Decaf error hierarchy and marks the store failed',
      async (status, errorType) => {
        globalThis.fetch = jest.fn(() =>
          Promise.resolve(httpResponse('catalogue exploded', status)),
        ) as never as typeof globalThis.fetch;

        await expect(service.refresh()).rejects.toThrow(errorType);
        expect(store.signals.status()).toBe('failed');
      },
    );

    it('invokes declared node methods through POST /graph/node-types/:kind/methods/:method', async () => {
      globalThis.fetch = jest.fn((url: string, init?: RequestInit) =>
        url === `${BACKEND_URL}/graph/node-types/core.flow.code/methods/run`
          ? Promise.resolve(httpResponse({ echoed: true }))
          : Promise.reject(new Error(`unexpected fetch: ${url}`)),
      ) as never as jest.Mock;
      globalThis.fetch = globalThis.fetch as never as typeof globalThis.fetch;

      const result = await service.invokeMethod('core.flow.code', 'run', { count: 1 });

      expect(result).toEqual({ echoed: true });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/node-types/core.flow.code/methods/run`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
      );
      const [, init] = (globalThis.fetch as never as jest.Mock).mock
        .calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({ count: 1 });
    });

    it('resolves loaded node instances through the store and rejects unknown kinds', async () => {
      globalThis.fetch = jest.fn(() =>
        Promise.resolve(httpResponse([MANIFEST_A])),
      ) as never as typeof globalThis.fetch;
      await service.load();

      const resolved = await service.resolve({
        kind: 'core.flow.code',
        parameters: { cases: [{ outputPort: 'beta' }] },
      } as never);
      expect(resolved.kind).toBe('core.flow.code');
      expect(resolved.outputs.map((port) => port.id)).toContain('beta');

      await expect(
        service.resolve({ kind: 'missing.kind', parameters: {} } as never),
      ).rejects.toThrow(GraphNodeNotFoundError);
    });

    it('rejects load attempts when no catalogue source is bound', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: GRAPH_BACKEND_URL, useValue: BACKEND_URL }],
      });
      const unbound = TestBed.inject(CatalogServiceCtor);

      await expect(unbound.load()).rejects.toThrow(InternalError);
    });
  });
});
