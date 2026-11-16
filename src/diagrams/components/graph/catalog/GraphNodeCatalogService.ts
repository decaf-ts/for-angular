/** @module for-angular/graph/catalog/GraphNodeCatalogService
 * @summary Angular service exposing the node catalogue to the canonical graph frontend (DECAF-50 §4.12).
 * @description Loads/refreshes node manifests from the configured source (frontend fixture
 * catalogue during P4, HTTP NestJS catalogue in P6), resolves dynamic ports for node
 * instances and forwards node method invocation. The palette consumes manifests — never
 * node constructors.
 */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { service } from '@decaf-ts/core';
import { InternalError } from '@decaf-ts/db-decorators';
import type { GraphJsonValue, GraphNodeInstance, GraphNodeManifest, GraphResolvedNodeManifest } from '@decaf-ts/as-graph/shared';
import { graphAngularServiceShare } from '../utils/graphAngularServiceShare';
import type { GraphNodeManifestReader } from './GraphNodeCatalogReader';
import { graphNodeCatalogFailureOf } from './GraphNodeCatalogApi';
import {
  GraphNodeCatalogStore,
  type GraphNodeCatalogFailure,
  type GraphNodeCatalogSource,
} from './GraphNodeCatalogStore';

/**
 * The catalogue source used by {@link GraphNodeCatalogService}'s load/refresh paths.
 * Graph demo (P4) provides frontend fixtures; P6 swaps to the HTTP node catalogue.
 */
export const GRAPH_NODE_CATALOG_SOURCE = new InjectionToken<GraphNodeCatalogSource>('GRAPH_NODE_CATALOG_SOURCE');

/**
 * The {@link graphAngularServiceShare} decorator is declared above `@service()` so the
 * final `@service()` registry wrapper carries Angular's `ɵprov` (spec §4.12 pairing).
 */
/** A string that is a graph locale key (`graph.node.…`). */
const GRAPH_LOCALE_KEY = /^graph\.[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/;

@graphAngularServiceShare
@service()
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogService {
  private readonly store = inject(GraphNodeCatalogStore);
  private readonly api = inject(GRAPH_NODE_CATALOG_SOURCE, { optional: true });
  private readonly translate = inject(TranslateService, { optional: true });

  /** Live manifest signal (P7 cutover): the editor palette reads this directly. */
  readonly manifests = this.store.signals.manifests;

  /** Live catalogue status signal ('unloaded'|'loading'|'ready'|'degraded'|'failed'). */
  readonly status = this.store.signals.status;

  /** Structured failure of the last degraded/failed catalogue load (G3-26/G3-27). */
  readonly failure = this.store.signals.failure;

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
   * Re-fetches the manifests from the configured source and pushes them into the
   * store. A source that degrades gracefully (the composite source keeps the
   * fixtures when the live backend fails) reports its failure class on
   * {@link GraphNodeCatalogSource.failure}; the store then lands on `degraded`
   * with that failure instead of silently claiming `ready` (G3-27). A source
   * that throws lands on `failed` with the classified error (G3-26).
   */
  async refresh(): Promise<void> {
    const source = this.source();
    this.store.setStatus('loading');
    try {
      const manifests = await source.fetchManifests();
      this.store.setManifests(await this.localize(manifests));
      const failure = source.failure?.() ?? null;
      this.store.setStatus(failure ? 'degraded' : 'ready', failure);
    } catch (error) {
      this.store.setStatus('failed', graphNodeCatalogFailureOf(error));
      throw error;
    }
  }

  all(): GraphNodeManifest[] {
    return this.store.all();
  }

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
  async invokeMethod(kind: string, method: string, request: Record<string, GraphJsonValue>): Promise<GraphJsonValue> {
    return this.source().invokeMethod(kind, method, request);
  }

  /**
   * Resolves the locale keys a served manifest carries. Every user-facing
   * string of a node kind (name, description, port and field labels,
   * placeholders) is published as a `graph.…` locale key; the editor shows
   * the translation. A key with no translation is left as-is.
   */
  private async localize(manifests: GraphNodeManifest[]): Promise<GraphNodeManifest[]> {
    const translate = this.translate;
    if (!translate) return manifests;
    try {
      // Wait for the active language to be loaded before resolving keys.
      await firstValueFrom(translate.get('graph'));
    } catch {
      return manifests;
    }
    const resolve = (value: unknown, depth: number): unknown => {
      if (typeof value === 'string') {
        if (!GRAPH_LOCALE_KEY.test(value)) return value;
        const translated = translate.instant(value);
        return typeof translated === 'string' && translated !== value ? translated : value;
      }
      if (depth > 12 || value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map((entry) => resolve(entry, depth + 1));
      const next: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        // Identifiers are never translated, even when they look like keys.
        next[key] = key === 'id' || key === 'kind' || key === 'handle' ? entry : resolve(entry, depth + 1);
      }
      return next;
    };
    return manifests.map((manifest) => resolve(manifest, 0) as GraphNodeManifest);
  }

  private source(): GraphNodeCatalogSource {
    if (!this.api) {
      throw new InternalError('Graph node catalogue source was not provided.');
    }
    return this.api;
  }
}

export type { GraphNodeCatalogSource };
