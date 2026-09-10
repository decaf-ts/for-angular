/**
 * @module lib/engine/SessionRamAdapter
 * @description In-memory adapter flavour with opt-in localStorage write-through persistence.
 * @summary Provides {@link SessionRamAdapter}, a thin {@link RamAdapter}
 * extension registered under the `session` alias that hydrates its RAM tables
 * from a localStorage entry on first access and persists a full snapshot after
 * every successful mutation. Replaces the deleted `NgxSessionAdapter` (which
 * re-implemented querying on raw localStorage) with the standard RAM query
 * pipeline.
 * @link {@link SessionRamAdapter}
 */
import { RamAdapter, RamConfig, RamContext, RamStorage } from '@decaf-ts/core/ram';
import type { ContextualArgs } from '@decaf-ts/core/types/index.mjs';
import type { PrimaryKeyType } from '@decaf-ts/db-decorators';
import type { Constructor } from '@decaf-ts/decoration';
import { Model } from '@decaf-ts/decorator-validation';

/**
 * @description localStorage-backed record snapshot format.
 * @summary Serializes one RAM table as an ordered list of `[id, record]`
 * tuples, so `Object.entries` round-trips into `Map` tables on hydration.
 */
type Snapshot = Record<string, [PrimaryKeyType, unknown][]>;

/**
 * @description Extends {@link RamConfig} with the localStorage key backing the adapter.
 * @summary `dbName` names the localStorage entry the adapter hydrates from at boot
 * and persists to on mutations. Defaults to `for-angular` to stay compatible with the
 * previously shipped (and consumed nowhere) `NgxSessionAdapter` storage format.
 */
export interface SessionRamConfig extends RamConfig {
  dbName?: string;
}

/**
 * @description In-memory adapter with localStorage write-through persistence.
 * @summary A thin {@link RamAdapter} extension registered under its own alias
 * (`session`). It hydrates the underlying RAM `Map` storage exactly once, on the
 * first `client` access (RAM storage is memoized by the base `Adapter`), from the
 * localStorage entry named by {@link SessionRamConfig | `conf.dbName`}, and
 * write-through persists the full snapshot after every successful
 * `create` / `update` / `delete` mutation.
 *
 * It deliberately does NOT attempt to re-read localStorage after boot: RAM
 * storage is memoized forever behind the base `Adapter` `client` getter, so
 * localStorage changes originating outside this instance (a second tab, or an
 * external clear) would render inconsistent results and are, by design, not
 * supported. This is an opt-in capability: it is registered under its own
 * `session` alias and is NOT wired into the demo app's boot. No current
 * consumer requires cross-session persistence; if one does, external-write
 * coordination must be designed first.
 *
 * Querying comes straight from {@link RamAdapter} (the full RAM statement,
 * paginator, and query API) — nothing about CRUD, transactions, or queries is
 * re-implemented here.
 * @class SessionRamAdapter
 * @category Engine
 * @example
 * ```typescript
 * const adapter = new SessionRamAdapter({ user: 'user', dbName: 'for-angular' });
 * const repo = new (adapter.repository<User>())(User, adapter);
 * ```
 */
export class SessionRamAdapter extends RamAdapter {
  private readonly persistentDbName: string;

  /**
   * @description Constructs the adapter and names its localStorage entry.
   * @summary Delegates CRUD/query wiring to the base {@link RamAdapter};
   * only the storage key (`dbName`, default `for-angular`) is captured here.
   * @param {SessionRamConfig} [conf] - RAM config plus the backing localStorage key
   * @param {string} [alias] - flavour alias to register the adapter under (default `session`)
   */
  constructor(conf: SessionRamConfig = { user: '', dbName: 'for-angular' }, alias: string = 'session') {
    super({ user: conf?.user }, alias);
    this.persistentDbName = conf?.dbName || 'for-angular';
  }

  /**
   * @description Hydrates RAM storage from localStorage once.
   * @summary Called by the base `Adapter` on the first `client` access; the
   * resulting `Map` is memoized for the adapter's lifetime, so this runs at
   * most once per instance. Missing or unreadable entries hydrate as empty
   * RAM storage rather than failing boot.
   * @return {RamStorage} The hydrated in-memory storage
   */
  protected override getClient(): RamStorage {
    const client: RamStorage = new Map();
    const raw = localStorage.getItem(this.persistentDbName);
    if (!raw) return client;
    const snapshot = JSON.parse(raw) as Snapshot;
    for (const [table, records] of Object.entries(snapshot)) client.set(table, new Map(records));
    return client;
  }

  /**
   * @description Persists the full current storage snapshot to localStorage.
   * @summary Serialization is write-through on successful mutations only; it
   * never writes on reads, so hydration-once semantics stay consistent.
   * @return {void}
   */
  private persistToStorage(): void {
    const snapshot: Snapshot = {};
    for (const [table, records] of this.client.entries()) snapshot[table] = Array.from(records.entries());
    localStorage.setItem(this.persistentDbName, JSON.stringify(snapshot));
  }

  /**
   * @description Creates a record, then write-through persists the snapshot.
   * @summary Delegates to `super.create` and persists the full storage
   * snapshot to localStorage only when the base mutation succeeds.
   * @param {Constructor<M>} clazz - the model class being persisted
   * @param {PrimaryKeyType} id - the primary key of the record
   * @param {Record<string, unknown>} model - the record payload
   * @param {...ContextualArgs<RamContext>} args - contextual arguments
   * @return {Promise<Record<string, unknown>>} the created record
   */
  override async create<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    model: Record<string, unknown>,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, unknown>> {
    const result = await super.create<M>(clazz, id, model, ...args);
    this.persistToStorage();
    return result;
  }

  /**
   * @description Updates a record, then write-through persists the snapshot.
   * @summary Delegates to `super.update` and persists the full storage
   * snapshot to localStorage only when the base mutation succeeds.
   * @param {Constructor<M>} clazz - the model class being persisted
   * @param {PrimaryKeyType} id - the primary key of the record
   * @param {Record<string, unknown>} model - the record payload
   * @param {...ContextualArgs<RamContext>} args - contextual arguments
   * @return {Promise<Record<string, unknown>>} the updated record
   */
  override async update<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    model: Record<string, unknown>,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, unknown>> {
    const result = await super.update<M>(clazz, id, model, ...args);
    this.persistToStorage();
    return result;
  }

  /**
   * @description Deletes a record, then write-through persists the snapshot.
   * @summary Delegates to `super.delete` and persists the full storage
   * snapshot to localStorage only when the base mutation succeeds.
   * @param {Constructor<M>} clazz - the model class being persisted
   * @param {PrimaryKeyType} id - the primary key of the record
   * @param {...ContextualArgs<RamContext>} args - contextual arguments
   * @return {Promise<Record<string, unknown>>} the deleted record
   */
  override async delete<M extends Model>(
    clazz: Constructor<M>,
    id: PrimaryKeyType,
    ...args: ContextualArgs<RamContext>
  ): Promise<Record<string, unknown>> {
    const result = await super.delete<M>(clazz, id, ...args);
    this.persistToStorage();
    return result;
  }
}

/**
 * @description Flavour alias the {@link SessionRamAdapter} registers itself under.
 * @summary Mirrors the constructor's default `alias` argument so consumers
 * can reference the `session` flavour symbolically.
 */
export const SESSION_RAM_FLAVOUR = 'session';
