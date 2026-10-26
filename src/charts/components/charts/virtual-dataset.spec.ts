import { Condition, QueryError } from '@decaf-ts/core';
import { model, Model, ModelArg } from '@decaf-ts/decorator-validation';
import {
  applyVirtualDatasetQueryOptions,
  mergeVirtualDatasetQuery,
  normalizeVirtualDatasetQuery,
  toChartDatasetSource,
  toChartRows,
  VirtualDataset,
  VirtualDatasetView,
} from './virtual-dataset';

@model()
class DatasetTestModel extends Model {
  a: number = 0;
  b: number = 0;
  series: string = '';

  constructor(arg: ModelArg<DatasetTestModel> = {}) {
    super(arg);
  }
}

function condition(value: number): Condition<DatasetTestModel> {
  return Condition.attribute<DatasetTestModel>('a').eq(value) as Condition<DatasetTestModel>;
}

describe('virtual-dataset', () => {
  describe('normalizeVirtualDatasetQuery', () => {
    it('defaults the action to find', () => {
      expect(normalizeVirtualDatasetQuery().action).toBe('find');
    });

    it('preserves a supplied query', () => {
      const where = condition(1);
      expect(normalizeVirtualDatasetQuery({ where, limit: 5 })).toMatchObject({ where, limit: 5 });
    });
  });

  describe('mergeVirtualDatasetQuery', () => {
    it('AND-combines the base and sub-query conditions', () => {
      const combined = condition(3);
      const base = { and: jest.fn(() => combined) } as unknown as Condition<Model>;
      const sub = condition(2);

      const merged = mergeVirtualDatasetQuery({ where: base }, { where: sub });

      expect(base.and).toHaveBeenCalledWith(sub);
      expect(merged.where).toBe(combined);
    });

    it('takes the smaller limit and adds offsets', () => {
      const merged = mergeVirtualDatasetQuery(
        { limit: 20, offset: 5 },
        { limit: 10, offset: 3 }
      );
      expect(merged.limit).toBe(10);
      expect(merged.offset).toBe(8);
    });

    it('inherits base clauses the sub-query omits and overrides the rest', () => {
      const where = condition(1);
      const merged = mergeVirtualDatasetQuery(
        { select: ['a'], where, orderBy: [['a', 'asc']] as never },
        { selector: 'a' }
      );

      expect(merged.action).toBe('find');
      expect(merged.select).toEqual(['a']);
      expect(merged.selector).toBe('a');
      expect(merged.where).toBe(where);
      expect(merged.orderBy).toHaveLength(1);
    });

    it('intersects projections so a sub-query can only narrow the select', () => {
      const merged = mergeVirtualDatasetQuery(
        { select: ['a', 'b', 'c'] },
        { select: ['b', 'c', 'd'] }
      );

      expect(merged.select).toEqual(['b', 'c']);
    });

    it('inherits a single-sided projection unchanged', () => {
      expect(mergeVirtualDatasetQuery({ select: ['a'] }, {}).select).toEqual(['a']);
      expect(mergeVirtualDatasetQuery({}, { select: ['b'] }).select).toEqual(['b']);
    });

    it('yields an empty projection when the sides do not intersect', () => {
      expect(mergeVirtualDatasetQuery({ select: ['a'] }, { select: ['b'] }).select).toEqual([]);
    });
  });

  describe('applyVirtualDatasetQueryOptions', () => {
    it('rejects a disallowed clause by default', () => {
      expect(() => applyVirtualDatasetQueryOptions(normalizeVirtualDatasetQuery({ limit: 5 }), { allowLimit: false })).toThrow(QueryError);
    });

    it('strips a disallowed clause when throws is false', () => {
      const result = applyVirtualDatasetQueryOptions(
        normalizeVirtualDatasetQuery({ limit: 5, offset: 2, orderBy: [['a', 'asc']] as never }),
        { allowLimit: false, allowOffset: false, allowOrderBy: false, throws: false }
      );

      expect(result.limit).toBeUndefined();
      expect(result.offset).toBeUndefined();
      expect(result.orderBy).toBeUndefined();
    });

    it('keeps allowed clauses untouched', () => {
      const result = applyVirtualDatasetQueryOptions(
        normalizeVirtualDatasetQuery({ limit: 5, offset: 2 }),
        { allowLimit: true, allowOffset: true }
      );
      expect(result).toMatchObject({ limit: 5, offset: 2 });
    });
  });

  describe('rows helpers', () => {
    it('copies object rows and wraps primitives', () => {
      expect(toChartRows([{ a: 1 }, 5, null])).toEqual([{ a: 1 }, { value: 5, index: 1 }, { value: null, index: 2 }]);
    });

    it('discovers dimensions from the first row', () => {
      expect(toChartDatasetSource([{ a: 1, b: 2 }, { a: 3, b: 4 }])).toEqual({
        source: [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        dimensions: ['a', 'b'],
      });
    });
  });

  describe('VirtualDataset', () => {
    const rows = [
      new DatasetTestModel({ a: 1 }),
      new DatasetTestModel({ a: 2 }),
    ];

    it('exposes its normalised base query', () => {
      const dataset = new VirtualDataset<DatasetTestModel>({
        model: DatasetTestModel,
        query: { limit: 10 },
        load: () => rows,
      });

      expect(dataset.query).toMatchObject({ action: 'find', limit: 10 });
    });

    it('passes the merged query to the loader', async () => {
      const load = jest.fn((..._args: unknown[]) => rows);
      const dataset = new VirtualDataset<DatasetTestModel>({
        model: DatasetTestModel,
        query: { limit: 10, offset: 2 },
        load,
      });

      await dataset.subQuery({ limit: 4, offset: 1 }).execute();

      expect(load).toHaveBeenCalledTimes(1);
      expect(load.mock.calls[0][0]).toMatchObject({ action: 'find', limit: 4, offset: 3 });
    });

    it('returns a VirtualDatasetView from subQuery', () => {
      const dataset = new VirtualDataset<DatasetTestModel>({
        model: DatasetTestModel,
        load: () => rows,
      });

      const view = dataset.subQuery({ limit: 1 });
      expect(view).toBeInstanceOf(VirtualDatasetView);
      expect(view.query).toMatchObject({ limit: 1 });
    });

    it('converts executed rows into a dataset source', async () => {
      const dataset = new VirtualDataset<DatasetTestModel>({
        model: DatasetTestModel,
        load: () => rows,
      });

      const source = await dataset.toChartDataset();
      expect(source.dimensions).toContain('a');
      expect(source.source).toHaveLength(2);
    });
  });
});
