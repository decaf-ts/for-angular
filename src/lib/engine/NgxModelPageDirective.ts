import { Directive, Input } from '@angular/core';
import {
  InternalError,
  IRepository,
  NotFoundError,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import { EventIds, Repository } from '@decaf-ts/core';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { NgxPageDirective } from './NgxPageDirective';
import { ComponentEventNames } from './constants';
import { IBaseCustomEvent, IModelPageCustomEvent } from './interfaces';
import { KeyValue, DecafRepository } from './types';
import { Constructor, Metadata } from '@decaf-ts/decoration';
import { getModelAndRepository } from '../for-angular-common.module';

@Directive()
export abstract class NgxModelPageDirective extends NgxPageDirective {
  /**
   * @description Primary key value of the current model instance.
   * @summary Specifies the primary key value for the current model record being displayed or
   * manipulated by the component. This identifier is used for CRUD operations that target
   * specific records, such as read, update, and delete operations. The value corresponds to
   * the field designated as the primary key in the model definition.
   * @type {EventIds}
   * @memberOf module:lib/engine/NgxComponentDirective
   */
  @Input()
  override modelId!: EventIds;

  /**
   * @description The CRUD operation type to be performed on the model.
   * @summary Specifies which operation (Create, Read, Update, Delete) this component instance
   * should perform. This determines the UI behavior, form configuration, and available actions.
   * The operation affects form validation, field availability, and the specific repository
   * method called during data submission.
   *
   * @type {OperationKeys.CREATE | OperationKeys.READ | OperationKeys.UPDATE | OperationKeys.DELETE}
   * @default OperationKeys.READ
   *  @memberOf ModelPage
   */
  @Input()
  override operation:
    | OperationKeys.CREATE
    | OperationKeys.READ
    | OperationKeys.UPDATE
    | OperationKeys.DELETE = OperationKeys.READ;

  /**
   * @description The name of the model class to operate on.
   * @summary Identifies which registered model class this component should work with.
   * This name is used to resolve the model constructor from the global model registry
   * and instantiate the appropriate repository for data operations. The model must
   * be properly registered using the @Model decorator for resolution to work.
   *
   * @type {string}
   *  @memberOf ModelPage
   */
  @Input()
  modelName!: string;

  /**
   * @description Array of operations allowed for the current model instance.
   * @summary Dynamically determined list of operations that are permitted based on
   * the current context and model state. Initially contains CREATE and READ operations,
   * with UPDATE and DELETE added when a modelId is present. This controls which
   * action buttons are displayed and which operations are accessible to the user.
   *
   * @type {OperationKeys[]}
   * @default [OperationKeys.CREATE, OperationKeys.READ]
   * @memberOf ModelPage
   */
  allowedOperations: OperationKeys[] = [
    OperationKeys.CREATE,
    OperationKeys.READ,
  ];

  /**
   * @description Current model data loaded from the repository.
   * @summary Stores the raw data object representing the current model instance retrieved
   * from the repository. This property holds the actual data values for the model being
   * displayed or edited, and is set to undefined when no data is available or when an
   * error occurs during data loading.
   * @type {KeyValue | undefined}
   * @default undefined
   * @memberOf NgxModelPageDirective
   */
  modelData: KeyValue | undefined = undefined;

  /**
   * @description Error message from failed operations.
   * @summary Stores error messages that occur during repository operations such as
   * data loading, creation, update, or deletion. When set, this indicates an error
   * state that should be displayed to the user. Cleared on successful operations.
   * @type {string | undefined}
   * @default undefined
   * @memberOf NgxModelPageDirective
   */
  errorMessage: string | undefined = undefined;

  // constructor(@Inject(CPTKN) hm: boolean = true, @Inject(CPTKN) protected toastController?: ToastController) {
  //   super("NgxModelPageDirective");
  // }

  override get pageTitle(): string {
    if (!this.modelName && this.model instanceof Model)
      this.modelName = this.model?.constructor?.name || '';
    if (!this.operation)
      return this.title ? this.title : `Listing ${this.modelName}`;
    const operation =
      this.operation.charAt(0).toUpperCase() +
      this.operation.slice(1).toLowerCase();
    return this.modelName ? `${operation} ${this.modelName}` : this.title;
  }
  /**
   * @description Lazy-initialized repository getter with model resolution.
   * @summary Creates and returns a repository instance for the specified model name.
   * Resolves the model constructor from the global registry, instantiates the repository,
   * and creates a new model instance. Throws an InternalError if the model is not
   * properly registered with the @Model decorator.
   *
   * @return {DecafRepository<Model>} The repository instance for the current model
   *
   * @throws {InternalError} When the model is not found in the registry
   */
  override get repository(): DecafRepository<Model> | undefined {
    try {
      if (!this._repository) {
        const constructor = Model.get(this.modelName);
        if (!constructor)
          throw new InternalError(
            'Cannot find model. was it registered with @model?'
          );
        this._repository = Repository.forModel(constructor);
        if (!this.pk) this.pk = Model.pk(constructor) as string;
        this.model = new constructor() as Model;
      }
    } catch (error: unknown) {
      this.log.warn(
        `Error getting repository for model: ${this.modelName}. ${(error as Error).message}`
      );
      this._repository = undefined;
      // throw new InternalError((error as Error)?.message || (error as string));
    }
    return this._repository as DecafRepository<Model>;
  }

  /**
   * @description Angular lifecycle hook for component initialization.
   * @summary Initializes the component by setting up the logger instance using the getLogger
   * utility. This ensures that logging is available throughout the component's lifecycle
   * for error tracking and debugging purposes.
   */
  async ionViewWillEnter(): Promise<void> {
    // await super.ionViewWillEnter();
    if (this.modelId)
      this.allowedOperations = this.allowedOperations.concat([
        OperationKeys.UPDATE,
        OperationKeys.DELETE,
      ]);
    this.getLocale(this.modelName as string);
    await this.refresh(this.modelId);
    this.initialized = true;
  }

  /**
   * @description Refreshes the component data by loading the specified model instance.
   * @summary Loads model data from the repository based on the current operation type.
   * For READ, UPDATE, and DELETE operations, fetches the existing model data using
   * the provided unique identifier. Handles errors gracefully by logging them through
   * the logger instance.
   *
   * @param {string} [uid] - The unique identifier of the model to load; defaults to modelId
   */
  override async refresh(uid?: EventIds): Promise<void> {
    if (!uid)
      uid = this.modelId;
    try {
      this._repository = this.repository;
      switch (this.operation) {
        case OperationKeys.READ:
        case OperationKeys.UPDATE:
        case OperationKeys.DELETE:
          this.model = (await this.handleGet(uid || this.modelId)) as Model;
          break;
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.errorMessage = error.message;
      }
      this.log.error(error as Error | string);
    }
  }

  /**
   * @description Generic event handler for component events.
   * @summary Processes incoming events from child components and routes them to appropriate
   * handlers based on the event name. Currently handles SUBMIT events by delegating to
   * the submit method. This centralized event handling approach allows for easy
   * extension and consistent event processing.
   *
   * @param {IBaseCustomEvent} event - The event object containing event data and metadata
   */
  override async handleEvent(
    event: IBaseCustomEvent,
    repository?: DecafRepository<Model>
  ): Promise<void> {
    const { name } = event;
    switch (name) {
      case ComponentEventNames.SUBMIT:
        await this.submit(event, repository);
        break;
    }
  }

  /**
   * @description Handles form submission events for CRUD operations.
   * @summary Processes form submission by executing the appropriate repository operation
   * based on the current operation type. Handles CREATE, UPDATE, and DELETE operations,
   * processes the form data, refreshes the repository cache, navigates back to the previous
   * page, and displays success notifications. Comprehensive error handling ensures robust
   * operation with detailed logging.
   *
   * @param {IBaseCustomEvent} event - The submit event containing form data
   * @return {Promise<IModelPageCustomEvent|void>} Promise that resolves on success or throws on error
   */
  override async submit(
    event: IBaseCustomEvent,
    repository?: DecafRepository<Model>,
    redirect: boolean = false
  ): Promise<IModelPageCustomEvent | void> {
    try {
      if (!repository) repository = this._repository as DecafRepository<Model>;

      // const pk = this.pk || Model.pk(repository.class as Constructor<Model>);
      const operation = this.operation;
      const { data } = event;
      if (data) {
        const model = this.parseData(data || {}, operation, repository);
        let result;
        switch (operation) {
          case OperationKeys.CREATE:
            result = await (!Array.isArray(model)
              ? repository.create(model as unknown as Model)
              : repository.createAll(model as unknown as Model[]));
            break;
          case OperationKeys.UPDATE:
            result = await (!Array.isArray(model)
              ? repository.update(model as unknown as Model)
              : repository.updateAll(model as unknown as Model[]));
            break;
          case OperationKeys.DELETE:
            result = await (!Array.isArray(model)
              ? repository.delete(model as string | number)
              : repository.deleteAll(model as string[] | number[]));
            break;
        }

        const message = await this.translate(
          !Array.isArray(result)
            ? `operations.${operation}.${result ? 'success' : 'error'}`
            : `operations.multiple`
        );

        if (result) {
          // repository.refresh(this.modelName, this.operation, this.modelId as EventIds);
          if (redirect) this.location.back();
        }
        return {
          ...event,
          success: result ? true : false,
          message,
        };
      }
    } catch (error: unknown) {
      this.log.for(this.submit).error(
        `Error during ${this.operation} operation: ${
          error instanceof Error ? error.message : (error as string)
        }`
      );
      return {
        ...event,
        success: false,
        message: error instanceof Error ? error.message : (error as string),
      };
    }
  }


  /**
   * @description Retrieves a model instance from the repository by unique identifier.
   * @summary Fetches a specific model instance using the repository's read method.
   * Handles both string and numeric identifiers by automatically converting numeric
   * strings to numbers. If no identifier is provided, logs an informational message
   * and navigates back to the previous page. Returns undefined for missing instances.
   *
   * @param {string} uid - The unique identifier of the model instance to retrieve
   * @return {Promise<Model | undefined>} Promise resolving to the model instance or undefined
   */
  async handleGet(
    uid?: EventIds,
    repository?: IRepository<any>,
    modelName?: string
  ): Promise<Model | undefined> {
    if (!uid) {
      this.log.info(
        'No key passed to model page read operation, backing to last page'
      );
      this.location.back();
      return undefined;
    }

    if(!modelName)
      modelName = this.modelName;

    const getRepository = async (
      modelName: string,
      parent?: string,
      model?: KeyValue
    ): Promise<DecafRepository<Model> | undefined> => {
      if (this._repository) return this._repository as DecafRepository<Model>;
      const constructor = Model.get(modelName);
      if (constructor) {
        const properties = Metadata.properties(
          constructor as Constructor<Model>
        ) as string[];
        // if (!model) model = {} as KeyValue;
        for (const prop of properties) {
          const type = Metadata.type(
            constructor as Constructor<Model>,
            prop
          ).name;
          const context = getModelAndRepository(type as string);
          if (!context) return getRepository(type, prop, model);
          const { repository } = context;
          if (modelName === this.modelName) {
            const data = await this.handleGet(uid, repository, modelName);
            this.model = Model.build({ [prop]: data }, modelName);
          }

          // else {
          //   model[prop as string] = Model.build({}, type);
          // }
        }
        // (this.model as KeyValue)[parent as string] = Model.build(
        //   model,
        //   modelName
        // );
      }
    };

    repository = (repository ||
      (await getRepository(modelName as string))) as IRepository<Model>;
    if (!repository) return this.model as Model;
    const type = Metadata.type(repository.class, Model.pk(repository.class) as string).name;
    try {
      const result = await (repository).read(
        ([Primitives.NUMBER, Primitives.BIGINT].includes(type.toLowerCase())
          ? Number(uid)
          : uid) as string
      );
      return result;
    } catch (error: unknown) {
      this.log
        .for(this.handleGet)
        .info(
          `Error getting model instance with id ${uid}: ${(error as Error).message}`
        );
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
  private parseData(
    data: KeyValue | KeyValue[],
    operation: OperationKeys,
    repository: DecafRepository<Model>
  ): Model | Model[] | EventIds {
    operation = (
      operation === OperationKeys.READ
        ? OperationKeys.DELETE
        : operation.toLowerCase()
    ) as OperationKeys;

    if (Array.isArray(data)) {
      data = data.map((item) =>
        this.parseData(item, operation, repository as DecafRepository<Model>)
      );
      return data as Model[];
    }

    let uid = this.modelId as EventIds;
    const pk = Model.pk(repository.class as Constructor<Model>);
    const type = Metadata.type(repository.class as Constructor<Model>, pk).name;
    uid = [Primitives.NUMBER, Primitives.BIGINT].includes(type.toLowerCase())
      ? Number(uid)
      : uid;
    if (operation !== OperationKeys.DELETE)
      return Model.build(
        this.modelId ? Object.assign(data, { [pk]: uid }) : data,
        repository.class.name
      ) as Model;
    return uid as EventIds;
  }
}
