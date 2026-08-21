import {
  Adapter,
  AdapterFlags,
  PersistenceKeys,
  QueryError,
  RawResult,
} from '@decaf-ts/core';
import {
  RamConfig,
  RamContext,
  RamFlags,
  RamFlavour,
  RamPaginator,
  RamStatement,
  RamStorage,
  RawRamQuery,
} from '@decaf-ts/core/ram';
import { ContextualArgs } from '@decaf-ts/core/types/index.mjs';
import {
  BaseError,
  ConflictError,
  DBKeys,
  generated,
  InternalError,
  NotFoundError,
  onCreate,
  onCreateUpdate,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { Constructor, Decoration, Metadata, propMetadata } from '@decaf-ts/decoration';
import { Model } from '@decaf-ts/decorator-validation';
import { Lock, MultiLock } from '@decaf-ts/transactional-decorators';

type Snapshot = Record<string, [PrimaryKeyType, any][]>;

function createdByOnNgxSessionCreateUpdate<M extends Model>(
  this: NgxSessionAdapter,
  ctx: { get: (key: string) => unknown },
  ...args: unknown[]
): any {
  const flags = args[args.length - 1] as { UUID?: string };
  return flags?.UUID ?? '';
}

/**
 * @description In-memory adapter backed by localStorage.
 * @summary Full, self-contained CRUD/query implementation for browser session persistence.
 * Deliberately does NOT extend {@link RamAdapter} — that class caches its Map storage
 * behind {@link Adapter}'s `client` getter (memoized forever after the first access via
 * `_client`), so any localStorage change made outside that one cached snapshot (a page
 * reload elsewhere, a second tab, or even this adapter's own writes once cached) is never
 * seen again. Every method here reads a fresh snapshot from localStorage, mutates it, and
 * writes it straight back — localStorage is the only state that exists.
 * @class NgxSessionAdapter
 */
export class NgxSessionAdapter extends Adapter<RamConfig, RamStorage, RawRamQuery, RamContext> {
  private readonly dbName: string;
  private readonly lock: Lock;

  constructor(conf: RamConfig & { dbName?: string } = { user: '', dbName: 'for-angular' }, alias: string = RamFlavour) {
    super({ user: conf?.user }, RamFlavour, alias);
    this.dbName = conf.dbName || 'for-angular';
    this.lock = conf.lock || new MultiLock();
  }

  protected override getClient(): RamStorage {
    return new Map();
  }

  private readSnapshot(): RamStorage {
    const raw = localStorage.getItem(this.dbName);
    const snapshot: Snapshot = raw ? JSON.parse(raw) : {};
    const client: RamStorage = new Map();
    for (const [table, records] of Object.entries(snapshot)) client.set(table, new Map(records));
    return client;
  }

  private writeSnapshot(client: RamStorage): void {
    const snapshot: Snapshot = {};
    for (const [table, records] of client.entries()) snapshot[table] = Array.from(records.entries());
    localStorage.setItem(this.dbName, JSON.stringify(snapshot));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async index(...models: Record<string, any>[]): Promise<any> {
    return Promise.resolve(undefined);
  }

  override async create<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    model: Record<string, any>,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, any>> {
    const { log } = this.logCtx(args, this.create);
    const tableName = Model.tableName(clazz);
    log.debug(`creating record in table ${tableName} with id ${id}`);
    await this.lock.acquire(tableName);
    try {
      const client = this.readSnapshot();
      if (!client.has(tableName)) client.set(tableName, new Map());
      const table = client.get(tableName);
      if (table?.has(id)) {
        throw new ConflictError(`Record with id ${id} already exists in table ${tableName}`);
      }
      table?.set(id, model);
      this.writeSnapshot(client);
      return model;
    } finally {
      this.lock.release(tableName);
    }
  }

  override async read<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, any>> {
    const { log } = this.logCtx(args, this.read);
    const tableName = Model.tableName(clazz);
    log.debug(`reading record in table ${tableName} with id ${id}`);
    const client = this.readSnapshot();
    if (!client.has(tableName)) throw new NotFoundError(`Table ${tableName} not found`);
    const table = client.get(tableName);
    if (!table?.has(id)) {
      throw new NotFoundError(`Record with id ${id} not found in table ${tableName}`);
    }
    return table.get(id);
  }

  override async update<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    model: Record<string, any>,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, any>> {
    const { log } = this.logCtx(args, this.update);
    const tableName = Model.tableName(clazz);
    log.debug(`updating record in table ${tableName} with id ${id}`);
    await this.lock.acquire(tableName);
    try {
      const client = this.readSnapshot();
      if (!client.has(tableName)) throw new NotFoundError(`Table ${tableName} not found`);
      const table = client.get(tableName);
      if (!table?.has(id)) {
        throw new NotFoundError(`Record with id ${id} not found in table ${tableName}`);
      }
      table.set(id, model);
      this.writeSnapshot(client);
      return model;
    } finally {
      this.lock.release(tableName);
    }
  }

  override async delete<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, any>> {
    const { log } = this.logCtx(args, this.delete);
    const tableName = Model.tableName(clazz);
    log.debug(`deleting record from table ${tableName} with id ${id}`);
    await this.lock.acquire(tableName);
    try {
      const client = this.readSnapshot();
      if (!client.has(tableName)) throw new NotFoundError(`Table ${tableName} not found`);
      const table = client.get(tableName);
      if (!table?.has(id)) {
        throw new NotFoundError(`Record with id ${id} not found in table ${tableName}`);
      }
      const deleted = table.get(id);
      table.delete(id);
      this.writeSnapshot(client);
      return deleted;
    } finally {
      this.lock.release(tableName);
    }
  }

  override async raw<R, D extends boolean>(
    rawInput: RawRamQuery<any>,
    docsOnly: D = true as D,
    ...args: ContextualArgs<RamContext>
  ): Promise<RawResult<R, D>> {
    const { log, ctx } = this.logCtx(args, this.raw);
    log.debug(`performing raw query: ${JSON.stringify(rawInput)}`);

    const {
      where,
      sort,
      limit,
      skip,
      from,
      groupBy,
      count: countField,
      countDistinct: countDistinctField,
      min: minField,
      max: maxField,
      sum: sumField,
      avg: avgField,
      distinct: distinctField,
    } = rawInput;
    let { select } = rawInput;

    const tableName = Model.tableName(from);
    const collection = this.readSnapshot().get(tableName);
    if (!collection) throw new InternalError(`Table ${tableName} not found in NgxSessionAdapter`);

    const clazz = from;
    const id = Model.pk(from);
    const props = Metadata.get(from, Metadata.key(DBKeys.ID, id as string));

    let result: any[] = Array.from(collection.entries()).map(([pk, r]) =>
      this.revert(r, from, pk as PrimaryKeyType, undefined, ctx)
    );
    if (sort) result = result.sort(sort);
    result = where ? result.filter(where) : result;

    if ('count' in rawInput) {
      if (!countField) return result.length as unknown as RawResult<R, D>;
      const count = result.filter(
        (r) => r[countField as string] !== undefined && r[countField as string] !== null
      ).length;
      return count as unknown as RawResult<R, D>;
    }

    if (countDistinctField !== undefined) {
      const seen = new Set();
      for (const item of result) {
        const value = item[countDistinctField as string];
        if (value !== undefined && value !== null) seen.add(JSON.stringify(value));
      }
      return seen.size as unknown as RawResult<R, D>;
    }

    if (minField !== undefined) {
      this.ensureFieldType(
        clazz,
        minField as string,
        'MIN operation',
        (type) => this.isNumericType(type) || type === 'date',
        'numeric or date'
      );
      if (result.length === 0) return null as unknown as RawResult<R, D>;
      const values = result.map((r) => r[minField as string]).filter((v) => v !== undefined && v !== null);
      if (values.length === 0) return null as unknown as RawResult<R, D>;
      let minValue = values[0];
      for (const v of values) {
        const comparison = v instanceof Date ? v.getTime() : typeof v === 'bigint' ? Number(v) : Number(v);
        const minComparison =
          minValue instanceof Date ? minValue.getTime() : typeof minValue === 'bigint' ? Number(minValue) : Number(minValue);
        if (comparison < minComparison) minValue = v;
      }
      return minValue as unknown as RawResult<R, D>;
    }

    if (maxField !== undefined) {
      this.ensureFieldType(
        clazz,
        maxField as string,
        'MAX operation',
        (type) => this.isNumericType(type) || type === 'date',
        'numeric or date'
      );
      if (result.length === 0) return null as unknown as RawResult<R, D>;
      const values = result.map((r) => r[maxField as string]).filter((v) => v !== undefined && v !== null);
      if (values.length === 0) return null as unknown as RawResult<R, D>;
      let maxValue = values[0];
      for (const v of values) {
        const comparison = v instanceof Date ? v.getTime() : typeof v === 'bigint' ? Number(v) : Number(v);
        const maxComparison =
          maxValue instanceof Date ? maxValue.getTime() : typeof maxValue === 'bigint' ? Number(maxValue) : Number(maxValue);
        if (comparison > maxComparison) maxValue = v;
      }
      return maxValue as unknown as RawResult<R, D>;
    }

    if (sumField !== undefined) {
      this.ensureFieldType(clazz, sumField as string, 'SUM operation', (type) => this.isNumericType(type), 'numeric');
      if (result.length === 0) return null as unknown as RawResult<R, D>;
      const values = result.map((r) => r[sumField as string]).filter((v) => v !== undefined && v !== null);
      if (values.length === 0) return null as unknown as RawResult<R, D>;
      const sum = values.reduce((acc, v) => acc + this.toNumericValue(v, sumField as string, 'SUM operation'), 0);
      return sum as unknown as RawResult<R, D>;
    }

    if (avgField !== undefined) {
      const fieldType = this.resolveFieldType(clazz, avgField as string);
      const isDateField = fieldType === 'date';
      this.ensureFieldType(
        clazz,
        avgField as string,
        'AVG operation',
        (type) => this.isNumericType(type) || type === 'date',
        'numeric or date'
      );
      if (result.length === 0) return null as unknown as RawResult<R, D>;
      const values = result.map((r) => r[avgField as string]).filter((v) => v !== undefined && v !== null);
      if (values.length === 0) return null as unknown as RawResult<R, D>;
      if (isDateField) {
        const timestamps = values.map((v) => (v instanceof Date ? v.getTime() : new Date(v).getTime()));
        const avgTimestamp = timestamps.reduce((acc, t) => acc + t, 0) / timestamps.length;
        return new Date(avgTimestamp) as unknown as RawResult<R, D>;
      }
      const total = values.reduce((acc, v) => acc + this.toNumericValue(v, avgField as string, 'AVG operation'), 0);
      return (total / values.length) as unknown as RawResult<R, D>;
    }

    if (distinctField !== undefined) {
      const seen = new Set();
      const distinctResults: any[] = [];
      for (const item of result) {
        const value = item[distinctField as string];
        const key = JSON.stringify(value);
        if (!seen.has(key)) {
          seen.add(key);
          distinctResults.push(value);
        }
      }
      return distinctResults as unknown as RawResult<R, D>;
    }

    let count: number;
    let output: any[] | Record<string, any>;
    if (groupBy && groupBy.length) {
      const grouped = this.groupRecords(result, groupBy as (keyof Model)[]);
      count = Object.keys(grouped).length;
      output = this.applyGroupPagination(grouped, skip, limit);
    } else {
      count = result.length;
      let paged = result;
      if (skip) paged = paged.slice(skip);
      if (limit) paged = paged.slice(0, limit);
      output = paged;
    }

    if (select && !(groupBy && groupBy.length)) {
      select = Array.isArray(select) ? select : [select];
      output = (output as any[]).map((row) =>
        Object.entries(row).reduce((acc: Record<string, any>, [key, val]) => {
          if ((select as string[]).includes(key)) acc[key] = val;
          return acc;
        }, {})
      );
    }

    if (docsOnly) return output as unknown as RawResult<R, D>;
    return { data: output, count } as RawResult<R, D>;
  }

  private groupRecords(records: any[], selectors: (keyof Model)[]): Record<string, any> {
    if (!selectors.length) return records as Record<string, any>;
    const [current, ...rest] = selectors;
    const grouped: Record<string, any[]> = {};
    for (const record of records) {
      const key = this.normalizeGroupKey(record[current as string]);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(record);
    }
    if (!rest.length) return grouped;
    const nested: Record<string, any> = {};
    for (const [key, values] of Object.entries(grouped)) nested[key] = this.groupRecords(values, rest);
    return nested;
  }

  private normalizeGroupKey(value: any): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'symbol') return value.toString();
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  private applyGroupPagination(grouped: Record<string, any>, skip?: number, limit?: number): Record<string, any> {
    if (typeof skip === 'undefined' && typeof limit === 'undefined') return grouped;
    const keys = Object.keys(grouped);
    const start = skip ?? 0;
    const end = typeof limit === 'undefined' ? undefined : start + limit;
    const paged: Record<string, any> = {};
    for (const key of keys.slice(start, end)) paged[key] = grouped[key];
    return paged;
  }

  private ensureFieldType(
    clazz: Constructor<Model>,
    field: string,
    context: string,
    predicate: (type: string) => boolean,
    description: string
  ) {
    const type = this.resolveFieldType(clazz, field);
    if (!type || !predicate(type)) {
      throw new QueryError(`${context} requires ${description} attribute, but "${field}" is ${type || 'unknown'}`);
    }
  }

  private resolveFieldType(clazz: Constructor<Model>, field: string): string | undefined {
    const propKey = field as keyof Model<false>;
    const metaType = Metadata.type(clazz, propKey) ?? Metadata.getPropDesignTypes(clazz, propKey)?.designType;
    return this.normalizeMetaType(metaType);
  }

  private normalizeMetaType(metaType: any): string | undefined {
    if (!metaType) return undefined;
    if (typeof metaType === 'string') return metaType.toLowerCase();
    if (typeof metaType === 'function' && metaType.name) return metaType.name.toLowerCase();
    return undefined;
  }

  private isNumericType(type?: string): boolean {
    return type === 'number' || type === 'bigint';
  }

  private toNumericValue(value: any, field: string, context: string): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    throw new QueryError(`${context} on "${field}" requires numeric values, but got ${typeof value}`);
  }

  override parseError<V extends BaseError>(err: Error): V {
    if (err instanceof BaseError) return err as V;
    return new InternalError(err) as V;
  }

  override async flags<M extends Model<boolean>>(
    operation: OperationKeys,
    model: Constructor<M>,
    flags: Partial<RamFlags>
  ): Promise<RamFlags> {
    return Object.assign(
      await super.flags(
        operation,
        model,
        Object.assign({ UUID: flags.UUID || this.config.user || '' + Date.now() }, flags)
      )
    ) as RamFlags;
  }

  Statement<M extends Model<boolean>>(
    overrides?: Partial<AdapterFlags>
  ): RamStatement<M, any, Adapter<any, any, RawRamQuery<M>, RamContext>> {
    return new RamStatement<M, any, Adapter<any, any, RawRamQuery<M>, RamContext>>(this as any, overrides);
  }

  Paginator<M extends Model<boolean>>(query: RawRamQuery, size: number, clazz: Constructor<M>): RamPaginator<M> {
    return new RamPaginator(this as any, query, size, clazz);
  }

  static override decoration(): void {
    super.decoration();
    const createdByKey = PersistenceKeys.CREATED_BY;
    const updatedByKey = PersistenceKeys.UPDATED_BY;
    Decoration.flavouredAs(RamFlavour)
      .for(createdByKey)
      .define(onCreate(createdByOnNgxSessionCreateUpdate), propMetadata(createdByKey, {}), generated(createdByKey))
      .apply();
    Decoration.flavouredAs(RamFlavour)
      .for(updatedByKey)
      .define(onCreateUpdate(createdByOnNgxSessionCreateUpdate), propMetadata(updatedByKey, {}), generated(updatedByKey))
      .apply();
  }
}

NgxSessionAdapter.decoration();
