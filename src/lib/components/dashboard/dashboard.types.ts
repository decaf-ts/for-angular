/**
 * @module module:lib/components/dashboard/dashboard.types
 * @description Type definitions for the editable dashboard component.
 * @summary Flavor-neutral types describing a placed dashboard component (grid
 * footprint + configuration) and the grid interaction state consumed by the
 * drag / resize / snap machine and by serialization.
 */

import type { DashComponentDefinition } from '@decaf-ts/ui-decorators';

/**
 * @description A single component placed on the dashboard grid.
 * @summary Carries the component tag, its grid footprint (origin + size in
 * grid units) and the configuration props forwarded to the rendered component.
 * @typedef DashPlacement
 * @memberOf module:lib/components/dashboard/dashboard.types
 */
export interface DashPlacement {
  /** Stable unique id (drives set-aside keys and deterministic generated-class property names). */
  id: string;
  /** Component tag resolved for rendering (whitelisted against the palette registry at load). */
  tag: string;
  /** Optional translation label key for the palette/placement header. */
  labelKey?: string;
  /** 1-based grid column at which the component starts. */
  col: number;
  /** 1-based grid row at which the component starts. */
  row: number;
  /** Number of grid columns the component spans. */
  cols: number;
  /** Number of grid rows the component spans. */
  rows: number;
  /** Configuration props forwarded to the rendered component. */
  config: Record<string, unknown>;
}

/**
 * @description A normalized palette entry, resolved from the `@dashcomponent()`
 * registry by the catalog service.
 * @summary Augments the ui-decorators {@link DashComponentDefinition} with the
 * resolved component constructor so the palette can be rendered without the
 * consumer re-resolving metadata.
 * @typedef DashPaletteEntry
 * @memberOf module:lib/components/dashboard/dashboard.types
 */
export type DashPaletteEntry = DashComponentDefinition & {
  /** The `@dashcomponent()` + `@Dynamic()`-decorated constructor. */
  ctor: unknown;
};

/**
 * @description Grid rectangle (origin + footprint) in grid units.
 * @typedef GridRange
 * @memberOf module:lib/components/dashboard/dashboard.types
 */
export interface GridRange {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

/**
 * @description Interaction state during a drag gesture.
 * @summary Tracks the placement being dragged, the last pointer position in
 * grid units, and the current (possibly null) snapped target.
 * @typedef DragState
 * @memberOf module:lib/components/dashboard/dashboard.types
 */
export interface DragState {
  placementId: string;
  pointerCol: number;
  pointerRow: number;
  target: GridRange | null;
}

/**
 * @description Interaction state during a border-resize gesture.
 * @summary Tracks the placement being resized, the edge being dragged and the
 * current (possibly null) snapped footprint.
 * @typedef ResizeState
 * @memberOf module:lib/components/dashboard/dashboard.types
 */
export interface ResizeState {
  placementId: string;
  pointerCol: number;
  pointerRow: number;
  target: GridRange | null;
}

/**
 * @description The shape of the persistable dashboard composition model.
 * @summary Serialized by {@link DashboardComponent} on create/update and
 * restored on read (AC-9). Kept deliberately plain so it survives the decaf
 * repository machinery.
 * @typedef DashDocument
 * @memberOf module:lib/components/dashboard/dashboard.types
 */
export interface DashDocument {
  /** Model identity used for persistence. */
  name: string;
  /** Grid dimensions. */
  cols: number;
  rows: number;
  /** Placed components. */
  placements: DashPlacement[];
}
