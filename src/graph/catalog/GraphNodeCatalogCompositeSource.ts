/** @module for-angular/graph/catalog/GraphNodeCatalogCompositeSource
 * @summary Catalog source that keeps frontend fixtures first and merges backend extras.
 * @description The demo's decorated node kinds are not published to the backend, and
 * even the kinds the backend does publish can carry different port/parameter
 * shapes than the demo's locally compiled manifests — so fixtures stay
 * authoritative for every kind they know, the live backend list supplies extra
 * kinds when it responds, and the fixture set stands alone when the backend is
 * down. Invocations of node methods stay backend-only.
 */
import { Injectable, inject } from '@angular/core';
import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
} from '@decaf-ts/ui-decorators/graph';
import type { GraphResolvedNodeManifest } from '@decaf-ts/integrations/graph/shared';
import { GraphNodeCatalogApi } from './GraphNodeCatalogApi';
import {
  GraphNodeCatalogFixtureSource,
} from './GraphNodeManifestFixtures';
import type { GraphNodeCatalogSource } from './GraphNodeCatalogStore';

/** Catalog source merging fixture manifests (authoritative) with live backend extras; fixtures stand alone when the backend is down. */
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogCompositeSource implements GraphNodeCatalogSource {
  private readonly live = inject(GraphNodeCatalogApi, { optional: true });
  private readonly fixed = inject(GraphNodeCatalogFixtureSource);

  /**
   * Fixture manifests first (they keep the demo's own decorated kinds
   * authoritative), live backend extras merged in, fixture set alone when the
   * backend is unreachable.
   */
  async fetchManifests(): Promise<GraphNodeManifest[]> {
    if (this.live) {
      try {
        const live = await this.live.fetchManifests();
        const fixed = await this.fixed.fetchManifests();
        const fixedKinds = new Set(fixed.map((manifest) => manifest.kind));
        return [...fixed, ...live.filter((manifest) => !fixedKinds.has(manifest.kind))];
      } catch {
        // backend down → fixtures only
      }
    }
    return this.fixed.fetchManifests();
  }

  /** {@inheritdoc GraphNodeCatalogSource} */
  async fetchManifest(kind: string): Promise<GraphNodeManifest | undefined> {
    const fixed = await this.fixed.fetchManifest(kind);
    if (fixed) return fixed;
    if (this.live) {
      try {
        return await this.live.fetchManifest(kind);
      } catch {
        // backend down → fixtures only
      }
    }
    return undefined;
  }

  /** {@inheritdoc GraphNodeCatalogSource} */
  async resolveManifest(
    kind: string,
    instance: Pick<GraphNodeInstance, 'parameters' | 'metadata'>
  ): Promise<GraphResolvedNodeManifest> {
    if (await this.fixed.fetchManifest(kind)) {
      return this.fixed.resolveManifest(kind, instance);
    }
    if (this.live) {
      return this.live.resolveManifest(kind, instance);
    }
    return this.fixed.resolveManifest(kind, instance);
  }

  /** {@inheritdoc GraphNodeCatalogSource} */
  async invokeMethod(
    kind: string,
    method: string,
    request: Record<string, GraphJsonValue>
  ): Promise<GraphJsonValue> {
    if (this.live) {
      return this.live.invokeMethod(kind, method, request);
    }
    return this.fixed.invokeMethod();
  }
}
