/** @module for-angular/graph/catalog/GraphNodeCatalogReader
 * @summary Frontend-safe node catalogue reader contracts (DECAF-50 §4.12/§4.13).
 * @description The palette and the canonical diagram adapter read manifests only
 * through this interface, so test fixtures, the HTTP-backed NestJS catalogue and the
 * in-memory store are interchangeable without touching rendering code.
 */
import type { GraphNodeInstance } from '@decaf-ts/ui-decorators/graph';
import type { GraphNodeManifest } from '@decaf-ts/ui-decorators/graph';
import type { GraphResolvedNodeManifest } from '@decaf-ts/integrations/graph/shared';

/**
 * Read-only view over the node catalogue the canonical canvas consumes.
 */
export interface GraphNodeManifestReader {
  /** All registered manifests, deterministically kind-sorted. */
  all(): GraphNodeManifest[];
  /** Manifest of a single kind, if registered. */
  get(kind: string): GraphNodeManifest | undefined;
  /**
   * Resolves a manifest for a concrete node instance (dynamic ports, credentials,
   * parameter values). Throws a Decaf error when the kind is unknown.
   */
  resolve(instance: GraphNodeInstance): GraphResolvedNodeManifest;
}
