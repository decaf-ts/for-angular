import { Directive, Input } from '@angular/core';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import {
  CrudOperations,
  IRepository,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { AttributeOption, Condition, Observer, OrderDirection, Paginator } from '@decaf-ts/core';
import { DecafComponent } from '@decaf-ts/ui-decorators';
import { DecafRepository, KeyValue } from './types';
import { Constructor, Metadata } from '@decaf-ts/decoration';
import { IFilterQuery } from './interfaces';
import { Subject } from 'rxjs';

@Directive()
export class NgxRepositoryDirective<M extends Model> extends DecafComponent<M> {
  private _context?: DecafRepository<M>;

  /**
   * @description Store query results for the component.
   * @summary Holds an array of `Model` instances returned from repository queries.
   * This is used internally to cache query results that child components may bind to.
   * @type {M[]}
   */
  @Input()
  _query: M[] = [];

  /**
   * @description Backing model data supplied to the component.
   * @summary Holds the raw `Model` instance or a generic key-value payload that child
   * components may bind to. When provided, it represents the contextual data the
   * component should render or mutate.
   * @type {M | M[] | KeyValue | KeyValue[] | undefined}
   */
  @Input()
  _data?: M | M[] | KeyValue | KeyValue[] = {};

  /**
   * @description Data model or model name for component operations.
   * @summary The data model that this component will use for CRUD operations. This can be provided
   * as a Model instance, a model constructor, or a string representing the model's registered name.
   * When set, this property provides the component with access to the model's schema, validation rules,
   * and metadata needed for rendering and data operations.
   * @type {Model | string | undefined}
   * @memberOf module:lib/engine/NgxComponentDirective
   */
  @Input()
  override model!: Model | string | undefined;

  /**
   * @description Primary key value of the current model instance.
   * @summary Specifies the primary key value for the current model record being displayed or
   * manipulated by the component. This identifier is used for CRUD operations that target
   * specific records, such as read, update, and delete operations. The value corresponds to
   * the field designated as the primary key in the model definition.
   * @type {PrimaryKeyType}
   * @memberOf module:lib/engine/NgxComponentDirective
   */
  @Input()
  override modelId: PrimaryKeyType = '';

  /**
   * @description The name of the model class to operate on.
   * @summary Identifies which registered model class this component should work with.
   * This name is used to resolve the model constructor from the global model registry
   * and instantiate the appropriate repository for data operations. The model must
   * be properly registered using the @Model decorator for resolution to work.
   *
   * @type {string}
   */
  @Input()
  modelName!: string;

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
  override filter!: AttributeOption<M>;

  /**
   * @description Model field used when generating the default condition.
   * @summary Indicates which key should be compared to `modelId` when `filter` is not provided.
   * Defaults to the configured primary key so overrides are only needed for custom lookups.
   * @type {string}
   */
  @Input()
  override filterBy!: string;

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
   * @description Subject for debouncing repository observation events.
   * @summary RxJS Subject that collects repository change events and emits them after
   * a debounce period. This prevents multiple rapid repository changes from triggering
   * multiple list refresh operations, improving performance and user experience.
   *
   * @private
   * @type {Subject<any>}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected repositoryObserverSubject: Subject<any> = new Subject<any>();

  /**
   * @description Observer object for repository change notifications.
   * @summary Implements the Observer interface to receive notifications when the
   * underlying data repository changes. This enables automatic list updates when
   * data is created, updated, or deleted through the repository.
   *
   * @private
   * @type {Observer}
   */
  protected repositoryObserver!: Observer;

  override async initialize(): Promise<void> {
    if (this.repository) {
      if (this.filter) {
        this._data = await this.query(this.filter.eq(this.modelId as PrimaryKeyType));
        if (this._data) {
          await this.refresh();
        }
      } else {
        // if (String(this.modelName) === this.model?.constructor.name) {
        //   const model = await this.repository.read(this.modelId as PrimaryKeyType);
        //   if (model) {
        //     await this.refresh(model);
        //   }
        // }
      }
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

  override async refresh(model?: unknown): Promise<void> {
    if (model && Model.isModel(model)) {
      this.model = Model.build(model as M, this.modelName);
      this._data = model;
    }
  }

  protected buildCondition(attr?: keyof M): Condition<M> {
    if (!attr) {
      attr = (this.filterBy || this.pk) as keyof M;
    }
    const condtion = this.filter || Condition.attribute<M>(attr);
    const type = this.getModelPropertyType(this.repository.class, attr as keyof M);
    if (this.modelId) {
      return condtion.eq(
        [Primitives.NUMBER, Primitives.BIGINT].includes(type as Primitives)
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
  ): Promise<M | M[] | PrimaryKeyType | undefined> {
    try {
      const hook = `before${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
      const handler = this.handlers?.[hook] || undefined;
      const model = this.buildTransactionModel(data || {}, repository, operation);
      if (handler && typeof handler === 'function') {
        const result = (await handler.bind(this)(model, repository, this.modelId)) as M | boolean;
        if (result === false) {
          return undefined;
        }
      }
      return model as M;
    } catch (error: unknown) {
      this.log.for(this).error((error as Error)?.message || String(error));
      return undefined;
    }
  }

  protected async transactionEnd<M extends Model>(
    model: M,
    repository: DecafRepository<M>,
    operation: CrudOperations,
  ): Promise<M | M[] | PrimaryKeyType | undefined> {
    try {
      const hook = `after${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
      const handler = this.handlers?.[hook] || undefined;
      if (handler && typeof handler === 'function') {
        const result = (await handler.bind(this)(model, repository, this.modelId)) as M | boolean;
        if (result === false) {
          return undefined;
        }
        return result as M;
      }
      return model;
    } catch (error: unknown) {
      this.log.for(this).error((error as Error)?.message || String(error));
      return undefined;
    }
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
  ): M | M[] | PrimaryKeyType | PrimaryKeyType[] {
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

    const pk = Model.pk(repository.class as Constructor<M>) as string;
    const pkType = Metadata.type(repository.class as Constructor<M>, pk as string).name;
    const modelId = (this.modelId || data[pk]) as Primitives;
    if (!this.modelId) {
      this.modelId = modelId;
    }
    const uid = this.parsePkValue(operation === OperationKeys.DELETE ? data[pk] : modelId, pkType);
    if (operation !== OperationKeys.DELETE) {
      const properties = Metadata.properties(repository.class as Constructor<M>) as string[];
      const relation =
        pk === this.pk
          ? {}
          : properties.includes(this.pk) && !data[this.pk]
            ? { [this.pk]: modelId }
            : {};
      if (!String(data?.[pk] || '').trim().length) {
        data[pk] = undefined;
      }
      return Model.build(
        Object.assign(
          data || {},
          relation,
          modelId && !data[this.pk] ? { [this.pk]: modelId } : {},
        ),
        repository.class.name,
      ) as M;
    }
    return uid as PrimaryKeyType;
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

  /**
   * @description Handles repository observation events with debouncing.
   * @summary Processes repository change notifications and routes them appropriately.
   * For CREATE events with a UID, handles them immediately. For other events,
   * passes them to the debounced observer subject to prevent excessive updates.
   *
   * @param {...unknown[]} args - The repository event arguments including table, event type, and UID
   * @returns {Promise<void>}
   * @memberOf ListComponent
   */
  async handleRepositoryRefresh(...args: unknown[]): Promise<void> {
    const [modelInstance, event, uid] = args;
    if ([OperationKeys.CREATE, OperationKeys.DELETE].includes(event as OperationKeys))
      return this.handleObserveEvent(modelInstance, event, uid as string | number);
    return this.repositoryObserverSubject.next(args);
  }

  async handleObserveEvent(...args: unknown[]): Promise<void> {
    this.log.for(this.handleObserveEvent).info(`Repository change observed with args: ${args}`);
  }
}
