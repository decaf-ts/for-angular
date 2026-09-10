/**
 * @module module:lib/components/dashboard/dashboard.utils.spec
 * @description Unit tests for the dashboard grid geometry helpers.
 */

import type { DashPlacement } from './dashboard.types';
import {
  buildDashboardModel,
  canPlace,
  cellsOf,
  rangesOverlap,
  serializeDocument,
  snapDrag,
  snapResize,
} from './dashboard.utils';

function placement(partial: Partial<DashPlacement>): DashPlacement {
  return {
    id: 'p1',
    tag: 'demo-note',
    col: 1,
    row: 1,
    cols: 1,
    rows: 1,
    config: {},
    ...partial,
  };
}

describe('dashboard.utils', () => {
  describe('cellsOf', () => {
    it('enumerates every occupied cell of a range', () => {
      const cells = cellsOf({ col: 2, row: 1, cols: 2, rows: 2 });
      expect(cells).toEqual([
        { col: 2, row: 1 },
        { col: 3, row: 1 },
        { col: 2, row: 2 },
        { col: 3, row: 2 },
      ]);
    });
  });

  describe('rangesOverlap', () => {
    it('returns true for overlapping ranges', () => {
      expect(rangesOverlap({ col: 1, row: 1, cols: 2, rows: 2 }, { col: 2, row: 2, cols: 1, rows: 1 })).toBe(true);
    });

    it('returns false for disjoint ranges', () => {
      expect(rangesOverlap({ col: 1, row: 1, cols: 1, rows: 1 }, { col: 3, row: 3, cols: 1, rows: 1 })).toBe(false);
    });

    it('returns false for edge-adjacent ranges', () => {
      expect(rangesOverlap({ col: 1, row: 1, cols: 2, rows: 1 }, { col: 3, row: 1, cols: 1, rows: 1 })).toBe(false);
    });
  });

  describe('canPlace', () => {
    const placed = [placement({ id: 'a', col: 1, row: 1, cols: 2, rows: 2 })];

    it('rejects a placement outside grid bounds', () => {
      expect(canPlace(placement({ cols: 2 }), 4, 1, [], 4, 4)).toBe(false);
      expect(canPlace(placement({ rows: 2 }), 1, 4, [], 4, 4)).toBe(false);
    });

    it('rejects an overlapping placement (reject-overlap, Decision 4)', () => {
      expect(canPlace(placement({ cols: 1, rows: 1 }), 2, 2, placed, 4, 4)).toBe(false);
    });

    it('accepts a non-overlapping placement', () => {
      expect(canPlace(placement({ col: 3, row: 3, cols: 1, rows: 1 }), 3, 3, placed, 4, 4)).toBe(true);
    });

    it('ignores the placement itself when checking overlap', () => {
      const self = placed[0];
      expect(canPlace(self, 1, 1, placed, 4, 4)).toBe(true);
    });
  });

  describe('snapDrag', () => {
    it('quantizes the pointer to a cell and clamps within grid bounds', () => {
      const result = snapDrag(placement({ cols: 2, rows: 1 }), 3.4, 2.6, [], 4, 4);
      expect(result).toEqual({ col: 3, row: 3, cols: 2, rows: 1 });
    });

    it('clamps so the placement never overflows the grid', () => {
      const result = snapDrag(placement({ cols: 2, rows: 1 }), 4.8, 1.1, [], 4, 4);
      expect(result).toEqual({ col: 3, row: 1, cols: 2, rows: 1 });
    });

    it('returns null when the snapped position collides', () => {
      const placed = [placement({ id: 'a', col: 1, row: 1, cols: 2, rows: 2 })];
      const result = snapDrag(placement({ cols: 1, rows: 1 }), 1.8, 1.8, placed, 4, 4);
      expect(result).toBeNull();
    });
  });

  describe('snapResize', () => {
    it('derives size from the pointer and clamps to the grid edge', () => {
      const result = snapResize(placement({ col: 1, row: 1 }), 3.2, 2.4, [], 4, 4);
      expect(result).toEqual({ col: 1, row: 1, cols: 3, rows: 2 });
    });

    it('returns null when the resized footprint overlaps another placement', () => {
      const placed = [placement({ id: 'a', col: 2, row: 1, cols: 1, rows: 1 })];
      const result = snapResize(placement({ col: 1, row: 1 }), 3.0, 1.0, placed, 4, 4);
      expect(result).toBeNull();
    });
  });

  describe('serializeDocument', () => {
    it('returns a plain, JSON-safe document with copied config', () => {
      const placements = [
        placement({ id: 'x', tag: 'demo-stats', config: { title: 'T', value: 1 } }),
      ];
      const doc = serializeDocument('Dash', 4, 4, placements);
      expect(doc.name).toBe('Dash');
      expect(doc.cols).toBe(4);
      expect(doc.placements[0].config).toEqual({ title: 'T', value: 1 });
      expect(doc.placements[0]).not.toBe(placements[0]);
    });
  });

  describe('buildDashboardModel', () => {
    it('builds a renderable model with a deterministic name and one property per placement', () => {
      const placements = [placement({ id: 'widget1', tag: 'demo-note', col: 2, row: 3, config: { note: 'hi' } })];
      const model = buildDashboardModel('DashTest', 6, 4, placements);
      expect(model.constructor.name).toBe('DashTest');
      expect('widget1' in model).toBe(true);
    });
  });
});
