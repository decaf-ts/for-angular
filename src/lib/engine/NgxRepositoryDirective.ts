import { Directive, Input } from '@angular/core';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import {
  CrudOperations,
  IRepository,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { AttributeOption, Condition, EventIds, OrderDirection, Paginator } from '@decaf-ts/core';
import { DecafComponent } from '@decaf-ts/ui-decorators';
import { DecafRepository, KeyValue } from './types';
import { Constructor, Metadata } from '@decaf-ts/decoration';
import { IFilterQuery } from './interfaces';

@Directive()
export class NgxRepositoryDirective<M extends Model> extends DecafComponent<M> {
  private _context?: DecafRepository<M>;

  /**
   * @description Primary key field name for the data model.
   * @summary Specifies which field in the model should be used as the primary key.
   * This is typically used for identifying unique records in operations like update and delete.
   * If not explicitly set, it defaults to the repository's configured primary key or 'id'.
   * @type {string}
   */
  @Input()
  override pk!: string;

  /**
   * @description Pre-built filtering expression applied to repository queries.
   * @summary Supply a custom `AttributeOption` to control how records are constrained. When omitted,
   * the directive derives a condition from `filterBy` or `pk`, comparing it against `modelId`.
   * @type {AttributeOption<M>}
   */
  @Input()
  filter!: AttributeOption<M>;

  /**
   * @description Model field used when generating the default condition.
   * @summary Indicates which key should be compared to `modelId` when `filter` is not provided.
   * Defaults to the configured primary key so overrides are only needed for custom lookups.
   * @type {keyof M}
   */
  @Input()
  filterBy!: keyof M;

  /**
   * @description Primitive type descriptor for the primary key.
   * @summary Helps coerce `modelId` to the proper primitive before executing queries, ensuring numeric
   * identifiers are handled correctly when the repository expects number-based keys.
   * @type {string}
   */
  pkType!: string;

  /**
   * @description The current search query value.
   * @summary Stores the text entered in the search bar. This is used to filter
   * the list data or to send as a search parameter when fetching new data.
   *
   * @type {string | undefined}
   * @memberOf ListComponent
   */
  searchValue?: string | IFilterQuery | undefined;

  /**
   * @description The starting index for data fetching.
   * @summary Specifies the index from which to start fetching data. This is used
   * for pagination and infinite scrolling to determine which subset of data to load.
   *
   * @type {number}
   * @default 0
   */
  @Input()
  start: number = 0;

  /**
   * @description The number of items to fetch per page or load operation.
   * @summary Determines how many items are loaded at once during pagination or
   * infinite scrolling. This affects the size of data chunks requested from the source.
   *
   * @type {number}
   * @default 10
   */
  @Input()
  limit: number = 10;

  /**
   * @description Sorting parameters for data fetching.
   * @summary Specifies how the fetched data should be sorted. This can be provided
   * as a string (field name with optional direction) or a direct object.
   *
   * @type {OrderDirection}
   * @default OrderDirection.DSC
   */
  @Input()
  sortDirection: OrderDirection = OrderDirection.DSC;

  /**
   * @description Sorting parameters for data fetching.
   * @summary Specifies how the fetched data should be sorted. This can be provided
   * as a string (field name with optional direction) or a direct object.
   *
   * @type {string | KeyValue | undefined}
   */
  @Input()
  sortBy!: string;

  /**
   * @description Available field indexes for filtering operations.
   * @summary Defines the list of field names that users can filter by. These represent
   * the data properties available for filtering operations. Each index corresponds to
   * a field in the data model that supports comparison operations.
   *
   * @type {string[]}
   * @default []
   */
  @Input()
  indexes: string[] = [];

  /**
   * @description Backing model data supplied to the component.
   * @summary Holds the raw `Model` instance or a generic key-value payload that child
   * components may bind to. When provided, it represents the contextual data the
   * component should render or mutate.
   * @type {M | M[] | KeyValue | KeyValue[] | undefined}
   */
  @Input()
  protected _data?: M | M[] | KeyValue | KeyValue[] = {};

  override async initialize(): Promise<void> {
    if (this.repository && this.filter) {
      this._data = await this.query(this.filter.eq(this.modelId as PrimaryKeyType));
    }
  }

  set context(context: DecafRepository<M>) {
    this._context = context;
  }

  from(repository: IRepository<M>): NgxRepositoryDirective<M> {
    this.context = repository as DecafRepository<M>;
    return this;
  }

  override get repository(): DecafRepository<M> {
    if (!this._context) {
      return super.repository as DecafRepository<M>;
    }
    return this._context;
  }

  protected buildCondition(attr?: keyof M): Condition<M> {
    if (!attr) {
      attr = (this.filterBy || this.pk) as keyof M;
    }
    const condtion = this.filter || Condition.attribute<M>(attr);
    const type = this.getModelPropertyType(this.repository.class, attr as keyof M);
    if (this.modelId) {
      return condtion.eq(
        [Primitives.NUMBER, Primitives.BIGINT].includes(this.pkType as Primitives)
          ? Number(this.modelId)
          : (this.modelId as PrimaryKeyType),
      );
    }
    return condtion.dif(null);
  }

  async read(uid: PrimaryKeyType): Promise<M> {
    return (await this.repository.read(uid)) as M;
  }

  async delete(data: PrimaryKeyType | PrimaryKeyType[] | M[], pk: PrimaryKeyType): Promise<void> {
    if (Array.isArray(data)) {
      if (pk && this._context) {
        pk = Model.pk(this._context.class) as PrimaryKeyType;
      }
      data = data
        .map((item) => (item as KeyValue)[pk as string | number])
        .filter(Boolean) as PrimaryKeyType[];
    } else {
      data = [data] as PrimaryKeyType[];
    }
    await this.repository.deleteAll(data as PrimaryKeyType[]);
  }

  async query(
    condtion?: Condition<M>,
    sortBy: keyof M = (this.sortBy || this.pk) as keyof M,
    sortDirection: OrderDirection = this.sortDirection,
  ): Promise<M[]> {
    if (!condtion) {
      condtion = this.buildCondition();
    }
    return (await this.repository.query(condtion as Condition<M>, sortBy, sortDirection)) as M[];
  }

  async paginate(
    limit: number = this.limit,
    sortDirection: OrderDirection = this.sortDirection,
    condition?: Condition<M>,
  ): Promise<Paginator<M>> {
    if (!condition) {
      condition = this.buildCondition();
    }
    return await this.repository
      .select()
      .where(condition)
      .orderBy([(this.sortBy || this.pk) as keyof M, sortDirection])
      .paginate(limit);
  }

  protected async transactionBegin<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
    operation: CrudOperations,
  ): Promise<M | M[] | EventIds> {
    const hook = `before${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
    const handler = this.handlers?.[hook] || undefined;
    const model = this.buildTransactionModel(data || {}, repository, operation);
    if (handler && typeof handler === 'function') {
      (await handler.bind(this)(model, repository, this.modelId)) as M;
    }
    return model as M;
  }

  /**
   * @description Parses and transforms form data for repository operations.
   * @summary Converts raw form data into the appropriate format for repository operations.
   * For DELETE operations, returns the primary key value (string or number). For CREATE
   * and UPDATE operations, builds a complete model instance using the Model.build method
   * with proper primary key assignment for updates.
   *
   * @param {Partial<Model>} data - The raw form data to be processed
   * @return {Model | string | number} Processed data ready for repository operations
   * @private
   */
  protected buildTransactionModel<M extends Model>(
    data: KeyValue | KeyValue[],
    repository: DecafRepository<M>,
    operation?: CrudOperations,
  ): M | M[] | EventIds {
    if (!operation) {
      operation = this.operation as CrudOperations;
    }
    operation = (
      [OperationKeys.READ, OperationKeys.DELETE].includes(operation)
        ? OperationKeys.DELETE
        : operation.toLowerCase()
    ) as CrudOperations;

    if (Array.isArray(data))
      return data.map((item) => this.buildTransactionModel(item, repository, operation)) as M[];

    const pk = Model.pk(repository.class as Constructor<M>);
    const pkType = Metadata.type(repository.class as Constructor<M>, pk as string).name;
    const modelId = (this.modelId || data[pk as string]) as Primitives;
    if (!this.modelId) this.modelId = modelId;
    const uid = this.parsePkValue(
      operation === OperationKeys.DELETE ? data[pk as string] : modelId,
      pkType,
    );
    if (operation !== OperationKeys.DELETE) {
      const properties = Metadata.properties(repository.class as Constructor<M>) as string[];
      const relation =
        pk === this.pk
          ? {}
          : properties.includes(this.pk as string) && !data[this.pk as string]
            ? { [this.pk as string]: modelId }
            : {};
      return Model.build(
        Object.assign(
          data || {},
          relation,
          modelId && !data[this.pk] ? { [this.pk]: modelId } : {},
        ),
        repository.class.name,
      ) as M;
    }
    return uid as EventIds;
  }

  protected getIndexes(model: M): string[] {
    this.indexes = Object.keys(Model.indexes((model || this.model) as Model) || {});
    return this.indexes;
  }

  protected parsePkValue(value: PrimaryKeyType, type: string): PrimaryKeyType {
    return [Primitives.NUMBER, Primitives.BIGINT].includes(type.toLowerCase() as Primitives)
      ? Number(value)
      : value;
  }

  protected getModelConstrutor(model: string | Model): Constructor<Model> | undefined {
    return Model.get(typeof model === Primitives.STRING ? String(model) : model?.constructor.name);
  }

  protected getModelProperties(clazz: Constructor<M>): (keyof M)[] {
    return Metadata.properties(clazz) as (keyof M)[];
  }

  protected getModelPropertyType(constructor: Constructor<M>, prop: keyof M): string {
    return Metadata.type(constructor as Constructor<M>, prop as string).name;
  }

  protected getModelPkType(clazz: Constructor<M>): string {
    return this.getModelPropertyType(clazz, Model.pk(clazz) as keyof M);
  }
}
