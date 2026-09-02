/** @module for-angular/graph/catalog/GraphNodeCatalogStore
 * @summary Root-scoped store holding the frontend node catalogue (DECAF-50 §4.12).
 * @description The store owns the loaded node manifests and every dynamic-port
 * resolution that depends on them. A {@link GraphNodeCatalogSource} (fixtures during
 * P4, HTTP during P6) populates it, and no node constructor ever reaches the map.
 */
import { Injectable, signal } from '@angular/core';
import { NotFoundError, ValidationError } from '@decaf-ts/db-decorators';
import type {
  GraphJsonValue,
  GraphNodeInstance,
  GraphNodeManifest,
} from '@decaf-ts/ui-decorators/graph';
import { resolveGraphNodeManifest } from './GraphNodeResolution';
import type { GraphNodeManifestReader } from './GraphNodeCatalogReader';
import type { GraphResolvedNodeManifest } from '@decaf-ts/integrations/graph/shared';

/** Status of the catalogue fixture/HTTP source. */
export type GraphNodeCatalogStatus = 'unloaded' | 'loading' | 'ready' | 'failed';

/**
 * Pluggable catalogue source. The HTTP-backed NestJS catalogue (P2/P6) and
 * frontend manifest fixtures both satisfy this contract.
 */
export interface GraphNodeCatalogSource {
  /** Fetches the full manifest list (deterministically kind-sorted). */
  fetchManifests(): Promise<GraphNodeManifest[]>;
  /** Fetches a single manifest, or `undefined` when unknown. */
  fetchManifest(kind: string): Promise<GraphNodeManifest | undefined>;
  /** Resolves a manifest for a node instance subset (parameters/metadata). */
  resolveManifest(
    kind: string,
    instance: Pick<GraphNodeInstance, 'parameters' | 'metadata'>
  ): Promise<GraphResolvedNodeManifest>;
  /** Invokes a declared node method (P6). Fixtures reject with a Decaf error. */
  invokeMethod(
    kind: string,
    method: string,
    request: Record<string, GraphJsonValue>
  ): Promise<GraphJsonValue>;
}

/** Error for node kinds missing from the catalogue (§4.8 semantics). */
export class GraphNodeNotFoundError extends NotFoundError {
  constructor(kind: string) {
    super(`Node kind '${kind}' is not registered in the node catalogue.`);
  }
}

/**
 * Frontend node-catalogue store: holds the loaded manifest set as a signal,
 * validates kinds on registration, and serves manifest lookups to the
 * palette, parameter rendering, and diagram adapter.
 */
@Injectable({ providedIn: 'root' })
export class GraphNodeCatalogStore implements GraphNodeManifestReader {
  private readonly manifestsSignal = signal<GraphNodeManifest[]>([]);
  private readonly statusSignal = signal<GraphNodeCatalogStatus>('unloaded');
  private readonly manifestMap = new Map<string, GraphNodeManifest>();

  /** Registers manifests (load/refresh). Throws on unknown or duplicated kinds. */
  setManifests(manifests: GraphNodeManifest[]): void {
    const next = [...manifests].sort((left, right) => left.kind.localeCompare(right.kind));
    const kinds = new Set<string>();
    for (const manifest of next) {
      if (!manifest || typeof manifest.kind !== 'string' || !manifest.kind) {
        throw new ValidationError('Node catalogue received a manifest without a valid kind.');
      }
      if (kinds.has(manifest.kind)) {
        throw new ValidationError(
          `Node catalogue received duplicate manifest kind '${manifest.kind}'.`
        );
      }
      kinds.add(manifest.kind);
    }
    this.manifestMap.clear();
    for (const manifest of next) this.manifestMap.set(manifest.kind, manifest);
    this.manifestsSignal.set(next);
  }

  /** Sets the source status before/after a load attempt. */
  setStatus(status: GraphNodeCatalogStatus): void {
    this.statusSignal.set(status);
  }

  /** Deterministically kind-sorted manifest list. */
  manifests(): GraphNodeManifest[] {
    return this.manifestsSignal();
  }

  /** @inheritdoc GraphNodeManifestReader */
  all(): GraphNodeManifest[] {
    return this.manifestsSignal();
  }

  /** @inheritdoc GraphNodeManifestReader */
  get(kind: string): GraphNodeManifest | undefined {
    return this.manifestMap.get(kind);
  }

  /** Resolves a manifest for a concrete node instance (dynamic ports). */
  resolve(
    instance: Pick<GraphNodeInstance, 'kind' | 'parameters' | 'metadata'>
  ): GraphResolvedNodeManifest {
    const manifest = this.manifestMap.get(instance.kind);
    if (!manifest) throw new GraphNodeNotFoundError(instance.kind);
    return resolveGraphNodeManifest(manifest, instance.parameters ?? {}, instance.metadata);
  }

  /** Digest of the loaded manifest kinds, for cache/ETag parity. */
  digest(): string {
    return [...this.manifestMap.keys()].sort().join(',');
  }

  /** Signals powering Angular compositions. */
  get signals() {
    return { manifests: this.manifestsSignal, status: this.statusSignal };
  }
}
