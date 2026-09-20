/** @module for-angular/graph/catalog/GraphNodeManifestFixtures
 * @summary Node manifest fixtures for the canonical Angular catalogue (DECAF-50 §4.26 R2-1).
 * @description The Angular demo's offline fallback catalogue source. Under R2-1 the
 * node classes are backend-only and the frontend receives only serializable
 * manifests, so this source no longer compiles fixtures from constructors: it serves
 * the metadata-only {@link GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT} (a serialized
 * snapshot of the backend's published built-in manifests) when the live
 * `GET /graph/node-types` catalogue is unavailable. No node constructor, class,
 * function, or execute code participates in the frontend catalogue map; every payload
 * is the published `GraphNodeManifest` JSON shape.
 */
import { Injectable } from '@angular/core';
import { InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
  GraphResolvedNodeManifest,
} from '@decaf-ts/ui-decorators/graph';

import { GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT } from './GraphNodeManifestSnapshot';
import { resolveGraphNodeManifest } from './GraphNodeResolution';
import type { GraphNodeCatalogSource } from './GraphNodeCatalogStore';

/**
 * Deterministically kind-sorted manifest array acting as the `load()` payload of the
 * fixture catalogue source. Metadata only — the snapshot mirrors the backend's
 * published built-in manifests (R2-1).
 */
export const GRAPH_NODE_MANIFEST_FIXTURES: GraphNodeManifest[] = [
  ...GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT,
].sort((left, right) => left.kind.localeCompare(right.kind));

/**
 * P4 catalogue source backed by {@link GRAPH_NODE_MANIFEST_FIXTURES}. The graphs demo
 * page provides this source for `GRAPH_NODE_CATALOG_SOURCE` until the NestJS node
 * catalogue ships (P6).
 */
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogFixtureSource implements GraphNodeCatalogSource {
  async fetchManifests(): Promise<GraphNodeManifest[]> {
    return GRAPH_NODE_MANIFEST_FIXTURES;
  }

  async fetchManifest(kind: string): Promise<GraphNodeManifest | undefined> {
    return GRAPH_NODE_MANIFEST_FIXTURES.find((manifest) => manifest.kind === kind);
  }

  async resolveManifest(
    kind: string,
    instance: Pick<GraphNodeInstance, 'parameters' | 'metadata'>
  ): Promise<GraphResolvedNodeManifest> {
    const manifest = GRAPH_NODE_MANIFEST_FIXTURES.find((candidate) => candidate.kind === kind);
    if (!manifest) {
      throw new NotFoundError(`Node kind '${kind}' is not registered in the fixture node catalogue.`);
    }
    return resolveGraphNodeManifest(manifest, instance.parameters ?? {}, instance.metadata);
  }

  async invokeMethod(): Promise<GraphJsonValue> {
    throw new InternalError('Node method invocation is not available in the P4 fixture catalogue.');
  }
}
