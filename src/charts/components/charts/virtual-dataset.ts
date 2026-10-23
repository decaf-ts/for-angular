/**
 * @module charts/lib/charts/virtual-dataset
 * @description Thin virtual-dataset pavement over the decaf core query types.
 * @summary A {@link VirtualDataset} wraps a larger/global query source and
 * exposes {@link VirtualDataset.subQuery} views that compose a narrower query
 * on top of it. The layer deliberately does not execute or re-implement queries:
 * it merges `QueryAssist` descriptors (from `@decaf-ts/core/query`), applies the
 * `QueryOptions` allow flags, and delegates execution to the loader supplied by
 * the source. That keeps charts able to bind to a shared/global query while
 * still using the repository/adapter that owns it.
 */

import { QueryError } from '@decaf-ts/core';
import type { Condition, QueryAssist, QueryOptions } from '@decaf-ts/core';
import type { Constructor } from '@decaf-ts/decoration';
import type { Model } from '@decaf-ts/decorator-validation';
import type { ChartDatasetSource, ChartRow } from './chart.types';

/**
 * @description A sub-query accepted by a virtual dataset.
 * @summary Every field is optional: omitted fields inherit the dataset's base
 * query. `where` conditions are combined with AND so a sub-query can only ever
 * narrow the global source, never widen it.
 * @typedef VirtualDatasetQuery
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export type VirtualDatasetQuery = Partial<
  Pick<
    QueryAssist,
    'action' | 'select' | 'selector' | 'where' | 'groupBy' | 'orderBy' | 'limit' | 'offset'
  >
>;

/**
 * @description Executes a composed query against the dataset source.
 * @summary The source owns the actual query execution (repository, adapter, or
 * in-memory fixture); the dataset only hands it the merged query and options.
 * @typedef VirtualDatasetLoader
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export type VirtualDatasetLoader<M extends Model = Model> = (
  query: QueryAssist,
  options: QueryOptions
) => Promise<M[]> | M[];

/**
 * @description Descriptor used to create a {@link VirtualDataset}.
 * @typedef VirtualDatasetDescriptor
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export interface VirtualDatasetDescriptor<M extends Model = Model> {
  /** Model (or model name) the query source targets. */
  model: Constructor<M> | string;
  /** The larger/global query the dataset starts from. */
  query?: VirtualDatasetQuery;
  /** Query allow flags applied to every composed sub-query. */
  options?: QueryOptions;
  /** Execution delegate supplied by the query owner. */
  load: VirtualDatasetLoader<M>;
}

/**
 * @description A resolved dataset view a chart can execute.
 * @summary Structurally implemented by {@link VirtualDatasetView}; charts accept
 * any object with an `execute` method.
 * @typedef ChartDatasetView
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export interface ChartDatasetView {
  execute(): Promise<readonly unknown[]> | readonly unknown[];
}

/**
 * @description A dataset a chart can sub-query from.
 * @summary Structurally implemented by {@link VirtualDataset}; charts accept any
 * object with a `subQuery` method.
 * @typedef ChartDatasetSourceProvider
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export interface ChartDatasetSourceProvider {
  subQuery(query?: VirtualDatasetQuery): ChartDatasetView;
}

/** A chart dataset input: either a query source or an already narrowed view. */
export type ChartDatasetBinding = ChartDatasetSourceProvider | ChartDatasetView;

/**
 * @description Tests whether a dataset binding is already a view.
 * @summary Only objects without a `subQuery` method count as views: a
 * {@link VirtualDataset} also exposes `execute`, but binding one must apply the
 * chart's `[datasetQuery]` rather than bypassing it.
 * @param dataset the binding to inspect.
 * @returns true when the binding exposes `execute` but cannot be sub-queried.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function isChartDatasetView(dataset: ChartDatasetBinding): dataset is ChartDatasetView {
  return (
    typeof (dataset as ChartDatasetView).execute === 'function' &&
    typeof (dataset as ChartDatasetSourceProvider).subQuery !== 'function'
  );
}

/**
 * @description Tests whether a dataset binding is a query source.
 * @param dataset the binding to inspect.
 * @returns true when the binding exposes `subQuery`.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function isChartDatasetSource(
  dataset: ChartDatasetBinding
): dataset is ChartDatasetSourceProvider {
  return typeof (dataset as ChartDatasetSourceProvider).subQuery === 'function';
}

/**
 * @description Normalises a query to the full {@link QueryAssist} shape.
 * @summary Fills the defaults the decaf query contract expects (`action:
 * 'find'`) so views always hand a complete descriptor to the loader.
 * @param query the (possibly partial) query.
 * @returns the normalised query.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function normalizeVirtualDatasetQuery(query: VirtualDatasetQuery = {}): QueryAssist {
  return {
    action: query.action ?? 'find',
    select: query.select,
    selector: query.selector,
    where: query.where,
    groupBy: query.groupBy,
    orderBy: query.orderBy,
    limit: query.limit,
    offset: query.offset,
  };
}

/**
 * @description Combines two optional conditions with AND.
 * @summary A sub-query never replaces the global condition: when both are
 * present the result is `base.and(sub)`.
 * @param base the dataset (global) condition.
 * @param sub the sub-query condition.
 * @returns the combined condition, or whichever side is defined.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function combineVirtualDatasetConditions(
  base?: Condition<Model>,
  sub?: Condition<Model>
): Condition<Model> | undefined {
  if (base && sub) return base.and(sub);
  return sub ?? base;
}

/**
 * @description Intersects two projections so a sub-query cannot widen them.
 * @summary When both queries select fields, only fields present on both sides
 * survive. A single-sided projection is inherited unchanged.
 * @param base the dataset's global projection.
 * @param sub the sub-query projection.
 * @returns the narrowed projection, or whichever side is defined.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function intersectVirtualDatasetProjection(
  base?: string[],
  sub?: string[]
): string[] | undefined {
  if (!base || !sub) return sub ?? base;
  return base.filter((field) => sub.includes(field));
}

/**
 * @description Merges a sub-query over a dataset's base query.
 * @summary Merge rules: `selector`, `groupBy` and `orderBy` follow the
 * sub-query when supplied; `select` is intersected so the sub-query can only
 * narrow the projection; `where` is AND-combined; `limit` takes the smaller
 * bound; and `offset` adds the base offset to the sub-query offset.
 * @param base the dataset's global query.
 * @param sub the sub-query.
 * @returns the merged, normalised {@link QueryAssist}.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function mergeVirtualDatasetQuery(
  base: VirtualDatasetQuery = {},
  sub: VirtualDatasetQuery = {}
): QueryAssist {
  const limit =
    base.limit !== undefined && sub.limit !== undefined
      ? Math.min(base.limit, sub.limit)
      : (sub.limit ?? base.limit);
  const offset = (base.offset ?? 0) + (sub.offset ?? 0);

  return normalizeVirtualDatasetQuery({
    action: sub.action ?? base.action,
    select: intersectVirtualDatasetProjection(base.select, sub.select),
    selector: sub.selector ?? base.selector,
    where: combineVirtualDatasetConditions(base.where, sub.where),
    groupBy: sub.groupBy ?? base.groupBy,
    orderBy: sub.orderBy ?? base.orderBy,
    limit,
    offset: offset > 0 ? offset : undefined,
  });
}

/**
 * @description Applies {@link QueryOptions} allow flags to a composed query.
 * @summary When a clause is not allowed the query is either stripped (when
 * `throws` is explicitly `false`) or rejected with a {@link QueryError}. This
 * reuses the core `QueryOptions` semantics instead of inventing a second query
 * engine.
 * @param query the composed query.
 * @param options the source allow flags.
 * @returns the allowed query.
 * @throws {QueryError} when a disallowed clause is present and `throws` is not
 * explicitly `false`.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function applyVirtualDatasetQueryOptions(
  query: QueryAssist,
  options: QueryOptions = {}
): QueryAssist {
  const throws = options.throws !== false;
  const result: QueryAssist = { ...query };

  const reject = (clause: string): void => {
    if (throws) throw new QueryError(`Virtual dataset source does not allow ${clause}`);
  };

  if (result.limit !== undefined && options.allowLimit === false) {
    reject('LIMIT');
    result.limit = undefined;
  }
  if (result.offset !== undefined && options.allowOffset === false) {
    reject('OFFSET');
    result.offset = undefined;
  }
  if (result.orderBy?.length && options.allowOrderBy === false) {
    reject('ORDER BY');
    result.orderBy = undefined;
  }

  return result;
}

/**
 * @description Converts arbitrary rows into chart-friendly plain records.
 * @summary Accepts plain objects, decaf model instances and primitives.
 * @param rows the rows to normalise.
 * @returns the normalised rows.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function toChartRows(rows: readonly unknown[] | null | undefined): ChartRow[] {
  return (rows ?? []).map((row, index) => {
    if (row && typeof row === 'object') return { ...(row as ChartRow) };
    return { value: row, index };
  });
}

/**
 * @description Builds the serializable dataset source consumed by ECharts.
 * @param rows the rows to expose.
 * @returns the source rows plus their discovered dimensions.
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export function toChartDatasetSource(rows: readonly unknown[]): ChartDatasetSource {
  const source = toChartRows(rows);
  return {
    source,
    dimensions: source.length ? Object.keys(source[0]) : [],
  };
}

/**
 * @description A larger/global query a chart can sub-query from.
 * @summary Wraps a source query descriptor and an execution delegate. Sub-query
 * views merge their descriptor over the base query, so several charts can share
 * one global source while each narrows it independently.
 * @class VirtualDataset
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export class VirtualDataset<M extends Model = Model> implements ChartDatasetSourceProvider {
  /** Model (or model name) the source targets. */
  readonly model: Constructor<M> | string;
  /** The larger/global query shared by every sub-query. */
  readonly baseQuery: VirtualDatasetQuery;
  /** Query allow flags applied to every composed sub-query. */
  readonly options: QueryOptions;

  private readonly load: VirtualDatasetLoader<M>;

  /**
   * @description Creates a virtual dataset.
   * @param descriptor the model, global query, allow flags and loader.
   */
  constructor(descriptor: VirtualDatasetDescriptor<M>) {
    this.model = descriptor.model;
    this.baseQuery = descriptor.query ?? {};
    this.options = descriptor.options ?? {};
    this.load = descriptor.load;
  }

  /**
   * @description The dataset's global query, normalised.
   * @returns the normalised base query.
   */
  get query(): QueryAssist {
    return normalizeVirtualDatasetQuery(this.baseQuery);
  }

  /**
   * @description Creates a narrowed view over this dataset.
   * @param query the sub-query to apply.
   * @returns a view that executes the merged query.
   */
  subQuery(query: VirtualDatasetQuery = {}): VirtualDatasetView<M> {
    return new VirtualDatasetView(this, query);
  }

  /**
   * @description Executes a sub-query directly against the source.
   * @param query the sub-query to apply.
   * @returns the rows returned by the loader.
   */
  async execute(query: VirtualDatasetQuery = {}): Promise<M[]> {
    const composed = applyVirtualDatasetQueryOptions(
      mergeVirtualDatasetQuery(this.baseQuery, query),
      this.options
    );
    return await this.load(composed, this.options);
  }

  /**
   * @description Executes a sub-query and converts the rows into a dataset source.
   * @param query the sub-query to apply.
   * @returns the serializable dataset source.
   */
  async toChartDataset(query: VirtualDatasetQuery = {}): Promise<ChartDatasetSource> {
    return toChartDatasetSource(await this.execute(query));
  }
}

/**
 * @description A narrowed view of a {@link VirtualDataset}.
 * @summary Resolves the composed query lazily and executes it against the
 * owning dataset. Charts use this to render one slice of a shared/global query.
 * @class VirtualDatasetView
 * @memberOf module:charts/lib/charts/virtual-dataset
 */
export class VirtualDatasetView<M extends Model = Model> implements ChartDatasetView {
  /**
   * @description Creates a view.
   * @param dataset the owning dataset.
   * @param request the sub-query applied to it.
   */
  constructor(
    readonly dataset: VirtualDataset<M>,
    readonly request: VirtualDatasetQuery = {}
  ) {}

  /**
   * @description The merged query this view executes.
   * @returns the composed {@link QueryAssist}.
   */
  get query(): QueryAssist {
    return applyVirtualDatasetQueryOptions(
      mergeVirtualDatasetQuery(this.dataset.baseQuery, this.request),
      this.dataset.options
    );
  }

  /**
   * @description Executes the composed query.
   * @returns the rows returned by the dataset loader.
   */
  async execute(): Promise<M[]> {
    return await this.dataset.execute(this.request);
  }

  /**
   * @description Executes the view and converts the rows into a dataset source.
   * @returns the serializable dataset source.
   */
  async toChartDataset(): Promise<ChartDatasetSource> {
    return toChartDatasetSource(await this.execute());
  }
}
