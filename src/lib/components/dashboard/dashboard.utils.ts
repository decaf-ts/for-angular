/**
 * @module module:lib/components/dashboard/dashboard.utils
 * @description Pure grid geometry, snap and collision helpers for the dashboard.
 * @summary Framework-free functions that quantize pointer positions to grid
 * cells, enforce grid bounds, and implement the reject-overlap collision
 * semantics (Decision 4 / AC-5). Kept pure so the snap/collision behaviour is
 * unit-testable without an Angular test bed.
 */

import { Model, ModelBuilder } from '@decaf-ts/decorator-validation';
import { uielement, uilayout, uilayoutprop } from '@decaf-ts/ui-decorators';
import type { DashPlacement, GridRange } from './dashboard.types';

/**
 * @description Clamps a number to the inclusive [min, max] range.
 * @summary Basic numeric helper used by every snap function.
 * @param n the value to clamp.
 * @param min inclusive lower bound.
 * @param max inclusive upper bound.
 * @returns the clamped value.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * @description Enumerates every grid cell occupied by a range.
 * @summary Returns a list of 1-based `{col,row}` cell coordinates covered by
 * the range. Used to compute occupancy for the collision routine.
 * @param p the range to expand.
 * @returns an array of occupied cell coordinates.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function cellsOf(p: GridRange): { col: number; row: number }[] {
  const cells: { col: number; row: number }[] = [];
  for (let row = p.row; row < p.row + p.rows; row++) {
    for (let col = p.col; col < p.col + p.cols; col++) {
      cells.push({ col, row });
    }
  }
  return cells;
}

/**
 * @description Tests whether two grid ranges overlap.
 * @summary Standard AABB overlap check in grid units.
 * @param a first range.
 * @param b second range.
 * @returns true when the ranges share at least one cell.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function rangesOverlap(a: GridRange, b: GridRange): boolean {
  return (
    a.col < b.col + b.cols &&
    a.col + a.cols > b.col &&
    a.row < b.row + b.rows &&
    a.row + a.rows > b.row
  );
}

/**
 * @description Builds a {@link GridRange} for a placement at a proposed origin.
 * @summary Helper that derives the range for a placement whose top-left corner
 * is at `(col,row)` while preserving the placement's footprint.
 * @param p the placement whose size is reused.
 * @param col proposed 1-based origin column.
 * @param row proposed 1-based origin row.
 * @returns the corresponding range.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function rangeFor(p: Pick<DashPlacement, 'cols' | 'rows'>, col: number, row: number): GridRange {
  return { col, row, cols: p.cols, rows: p.rows };
}

/**
 * @description Validates that a proposed origin is inside the grid bounds and
 * does not overlap any other placement (reject-overlap, Decision 4).
 * @summary The core collision predicate. A proposal is valid only when it fits
 * within the grid and no placed component (other than the one being moved)
 * occupies any of its cells.
 * @param p the placement being placed.
 * @param col proposed origin column.
 * @param row proposed origin row.
 * @param placements all placements (may include `p` itself).
 * @param gridCols total grid columns.
 * @param gridRows total grid rows.
 * @returns true when the placement can occupy the proposed cells.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function canPlace(
  p: Pick<DashPlacement, 'id' | 'cols' | 'rows'>,
  col: number,
  row: number,
  placements: DashPlacement[],
  gridCols: number,
  gridRows: number
): boolean {
  if (col < 1 || row < 1) return false;
  if (col + p.cols - 1 > gridCols || row + p.rows - 1 > gridRows) return false;
  const proposed = rangeFor(p, col, row);
  return !placements.some((other) => other.id !== p.id && rangesOverlap(proposed, other));
}

/**
 * @description Quantizes a drag pointer position to a valid snapped origin.
 * @summary Rounds the pointer to the nearest cell and clamps so the placement
 * stays inside the grid. Returns null when the snapped position collides with
 * another placement (rendered as an invalid dotted preview and rejected).
 * @param p the placement being dragged.
 * @param pointerCol fractional pointer column in grid units.
 * @param pointerRow fractional pointer row in grid units.
 * @param placements all placements.
 * @param gridCols total grid columns.
 * @param gridRows total grid rows.
 * @returns the snapped {@link GridRange} or null when invalid.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function snapDrag(
  p: Pick<DashPlacement, 'id' | 'cols' | 'rows'>,
  pointerCol: number,
  pointerRow: number,
  placements: DashPlacement[],
  gridCols: number,
  gridRows: number
): GridRange | null {
  const col = clamp(Math.round(pointerCol), 1, gridCols - p.cols + 1);
  const row = clamp(Math.round(pointerRow), 1, gridRows - p.rows + 1);
  if (!canPlace(p, col, row, placements, gridCols, gridRows)) return null;
  return rangeFor(p, col, row);
}

/**
 * @description Computes a snapped footprint for a border-resize gesture.
 * @summary The pointer supplies the dragged corner/edge position in grid
 * units; the size is derived by rounding to whole cells and clamping to the
 * grid edge. Returns null when the resized footprint overlaps another
 * placement.
 * @param p the placement being resized (its origin stays fixed).
 * @param pointerCol fractional pointer column in grid units.
 * @param pointerRow fractional pointer row in grid units.
 * @param placements all placements.
 * @param gridCols total grid columns.
 * @param gridRows total grid rows.
 * @returns the resized {@link GridRange} or null when invalid.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function snapResize(
  p: Pick<DashPlacement, 'id' | 'col' | 'row'>,
  pointerCol: number,
  pointerRow: number,
  placements: DashPlacement[],
  gridCols: number,
  gridRows: number
): GridRange | null {
  const cols = clamp(Math.round(pointerCol), 1, gridCols - p.col + 1);
  const rows = clamp(Math.round(pointerRow), 1, gridRows - p.row + 1);
  const proposed: GridRange = { col: p.col, row: p.row, cols, rows };
  const invalid = placements.some((other) => other.id !== p.id && rangesOverlap(proposed, other));
  if (invalid) return null;
  return proposed;
}

/**
 * @description Builds a renderable decaf model class for a saved composition
 * (read mode / AC-9).
 * @summary Uses the ModelBuilder machinery (Decision 3) to generate a single
 * class per composition: `@uilayout('ngx-decaf-layout', cols, rows)` plus one
 * property per placed component carrying `@uielement(tag, props)` and
 * `@uilayoutprop(col, row)`. Deterministic `setName()` is required (AC-11).
 * @param name deterministic model name.
 * @param cols grid columns.
 * @param rows grid rows.
 * @param placements placed components.
 * @returns an instance of the generated renderable model.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function buildDashboardModel(
  name: string,
  cols: number,
  rows: number,
  placements: DashPlacement[]
): Model {
  const builder = ModelBuilder.builder<Model & Record<string, unknown>>();
  builder.setName(name);
  builder.decorateClass(uilayout('ngx-decaf-layout', cols, rows, {}));

  for (const placement of placements) {
    const propName = placement.id;
    const elementProps: Record<string, unknown> = {
      ...placement.config,
      labelKey: placement.labelKey,
      row: placement.row,
      col: placement.col,
    };
    const attr = builder.string(propName as never);
    attr.decorate(
      uielement(placement.tag, elementProps) as never,
      uilayoutprop(placement.col, placement.row) as never
    );
  }

  const ViewModel = builder.build();
  return new ViewModel();
}

/**
 * @description Serializes placements into a plain persistable composition.
 * @summary Strips runtime-only state and returns a JSON-safe {@link DashDocument}
 * that survives the decaf repository machinery (AC-9).
 * @param name model identity.
 * @param cols grid columns.
 * @param rows grid rows.
 * @param placements placed components.
 * @returns the persistable composition.
 * @memberOf module:lib/components/dashboard/dashboard.utils
 */
export function serializeDocument(
  name: string,
  cols: number,
  rows: number,
  placements: DashPlacement[]
): { name: string; cols: number; rows: number; placements: DashPlacement[] } {
  return {
    name,
    cols,
    rows,
    placements: placements.map((p) => ({
      id: p.id,
      tag: p.tag,
      labelKey: p.labelKey,
      col: p.col,
      row: p.row,
      cols: p.cols,
      rows: p.rows,
      config: { ...p.config },
    })),
  };
}
