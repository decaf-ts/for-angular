/** @module for-angular/graph/catalog/GraphNodeCatalogService
 * @summary Angular service exposing the node catalogue to the canonical graph frontend (DECAF-50 §4.12).
 * @description Loads/refreshes node manifests from the configured source (frontend fixture
 * catalogue during P4, HTTP NestJS catalogue in P6), resolves dynamic ports for node
 * instances and forwards node method invocation. The palette consumes manifests — never
 * node constructors.
 */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { InternalError, ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphResolvedNodeManifest } from '@decaf-ts/integrations/graph/shared';
import { service } from '@decaf-ts/core';
import type { GraphNodeManifestReader } from './GraphNodeCatalogReader';
import { GraphNodeCatalogStore, type GraphNodeCatalogSource } from './GraphNodeCatalogStore';
import { graphAngularServiceShare } from '../utils/graphAngularServiceShare';

/**
 * The catalogue source used by {@link GraphNodeCatalogService}'s load/refresh paths.
 * Graph demo (P4) provides frontend fixtures; P6 swaps to the HTTP node catalogue.
 */
export const GRAPH_NODE_CATALOG_SOURCE = new InjectionToken<GraphNodeCatalogSource>(
  'GRAPH_NODE_CATALOG_SOURCE'
);

/**
 * The {@link graphAngularServiceShare} decorator is declared above `@service()` so the
 * final `@service()` registry wrapper carries Angular's `ɵprov` (spec §4.12 pairing).
 */
@graphAngularServiceShare
@service()
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogService {
  private readonly store = inject(GraphNodeCatalogStore);
  private readonly api = inject(GRAPH_NODE_CATALOG_SOURCE, { optional: true });

  /** Live manifest signal (P7 cutover): the editor palette reads this directly. */
  readonly manifests = this.store.signals.manifests;

  /** Live catalogue status signal ('unloaded'|'loading'|'ready'|'failed'). */
  readonly status = this.store.signals.status;

  /**
   * Loads the manifests when no source has run before. Idempotent.
   */
  async load(): Promise<void> {
    if (this.store.all().length) {
      return;
    }
    await this.refresh();
  }

  /**
   * Re-fetches the manifests from the configured source and pushes them into the store.
   */
  async refresh(): Promise<void> {
    const source = this.source();
    this.store.setStatus('loading');
    try {
      const manifests = await source.fetchManifests();
      this.store.setManifests(manifests);
      this.store.setStatus('ready');
    } catch (error) {
      this.store.setStatus('failed');
      throw error;
    }
  }

  /** @inheritdoc GraphNodeManifestReader */
  all(): GraphNodeManifest[] {
    return this.store.all();
  }

  /** @inheritdoc GraphNodeManifestReader */
  get(kind: string): GraphNodeManifest | undefined {
    return this.store.get(kind);
  }

  /**
   * Resolves a manifest for a concrete node instance (dynamic ports, credentials).
   * Asynchronous per spec (§4.12); the sync reader above services the pure
   * diagram projection.
   */
  async resolve(instance: GraphNodeInstance): Promise<GraphResolvedNodeManifest> {
    return this.store.resolve(instance);
  }

  /**
   * Synchronous reader view used by the pure diagram projection.
   */
  reader(): GraphNodeManifestReader {
    return this.store;
  }

  /**
   * Invokes a declared node method (P6). Fixtures reject with a Decaf error.
   */
  async invokeMethod(
    kind: string,
    method: string,
    request: Record<string, GraphJsonValue>
  ): Promise<GraphJsonValue> {
    return this.source().invokeMethod(kind, method, request);
  }

  private source(): GraphNodeCatalogSource {
    if (!this.api) {
      throw new InternalError('Graph node catalogue source was not provided.');
    }
    return this.api;
  }
}

export type { GraphNodeCatalogSource };
