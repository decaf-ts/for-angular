/**
 * @module for-angular/graph/port-zones
 * @summary Local mirror of the as-graph connection port-zone wire contract (SAA-836 M1).
 * @description The mastra agent family declares dedicated render zones for its
 * `@connection()` ports (memory bottom-left, scorers top-right, embedding
 * bottom-right, hooks/sandbox top-middle, tools/skill bottom-middle, input/output
 * processors centered). The zone travels on the served node manifest
 * (`GraphPortManifest.zone`) and on the canvas port definition's `graph` block.
 * These mirror types keep the editor type-safe against the currently installed
 * `@decaf-ts/as-graph` release, which does not yet export the zone contract;
 * once the peer dependency publishes it, the imports switch to
 * `@decaf-ts/as-graph/shared` and the mirrors are deleted.
 */
import type { GraphPortDefinition, GraphPortManifest } from '@decaf-ts/as-graph/shared';

/** Node edge a connection port zone is anchored to. */
export type GraphPortZoneSide = 'top' | 'bottom' | 'left' | 'right';

/** Alignment of a port zone along its anchored edge. */
export type GraphPortZoneAlign = 'start' | 'center' | 'end';

/** Dedicated render zone of a `@connection()` port (SAA-836 M1). */
export interface GraphPortZone {
  side: GraphPortZoneSide;
  align?: GraphPortZoneAlign;
  order?: number;
}

/** Render zone carried on a manifest port (wire shape served by the backend). */
type GraphPortManifestWithZone = GraphPortManifest & { zone?: unknown };

/** Render zone carried on a canvas port definition's connection metadata. */
type GraphPortMetadataWithZone = NonNullable<GraphPortDefinition['graph']> & { zone?: unknown };

/**
 * Reads the render zone declared on a manifest port.
 *
 * @param port - Manifest port as served by `GET /graph/node-types`.
 * @returns The declared zone, or `undefined` when the port has none.
 */
export function graphManifestPortZoneOf(port: GraphPortManifest): GraphPortZone | undefined {
  const zone = (port as GraphPortManifestWithZone).zone;
  return isGraphPortZone(zone) ? zone : undefined;
}

/**
 * Reads the render zone carried on a canvas port definition's `graph` block.
 *
 * @param port - Canvas port definition (manifest-derived or legacy).
 * @returns The declared zone, or `undefined` when the port has none.
 */
export function graphPortZoneOf(port: GraphPortDefinition): GraphPortZone | undefined {
  const zone = (port.graph as GraphPortMetadataWithZone | undefined)?.zone;
  return isGraphPortZone(zone) ? zone : undefined;
}

/**
 * The node edge a connection port handle anchors to: the declared zone side when
 * zoned, the legacy bottom edge otherwise.
 *
 * @param port - Canvas port definition.
 * @returns The ng-diagram `Side` the port handle renders on.
 */
export function graphConnectionPortSideOf(port: GraphPortDefinition): GraphPortZoneSide {
  return graphPortZoneOf(port)?.side ?? 'bottom';
}

function isGraphPortZone(value: unknown): value is GraphPortZone {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const side = record['side'];
  if (side !== 'top' && side !== 'bottom' && side !== 'left' && side !== 'right') return false;
  const align = record['align'];
  if (align !== undefined && align !== 'start' && align !== 'center' && align !== 'end') return false;
  const order = record['order'];
  if (order !== undefined && typeof order !== 'number') return false;
  return true;
}
