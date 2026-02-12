import { AfterViewInit, Directive, Input } from '@angular/core';
import {
  CrudOperations,
  InternalError,
  IRepository,
  NotFoundError,
  OperationKeys,
  PrimaryKeyType,
} from '@decaf-ts/db-decorators';
import { Repository } from '@decaf-ts/core';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { NgxPageDirective } from './NgxPageDirective';
import { ICrudFormEvent, ILayoutModelContext, IModelComponentSubmitEvent } from './interfaces';
import { CrudEvent, DecafRepository, KeyValue } from './types';
import { Constructor, Metadata } from '@decaf-ts/decoration';
import { getModelAndRepository } from './helpers';

@Directive()
export abstract class NgxModelPageDirective extends NgxPageDirective implements AfterViewInit {
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
  override get repository(): DecafRepository<Model> {
    const modelName = this.modelName || this.model?.constructor?.name;
    try {
      if (!this._repository && modelName) {
        const constructor = Model.get(modelName);
        if (!constructor)
          throw new InternalError('Cannot find model. was it registered with @model?');
        this._repository = Repository.forModel(constructor);
        if (!this.pk) this.pk = Model.pk(constructor) as string;
        this.model = new constructor() as Model;
      }
    } catch (error: unknown) {
      this.log.warn(
        `Error getting repository for model: ${modelName}. ${(error as Error).message}`,
      );
      this._repository = undefined;
      // throw new InternalError((error as Error)?.message || (error as string));
    }
    return this._repository as DecafRepository<Model>;
  }

  override async initialize(): Promise<void> {
    this.refreshing = true;
    await super.initialize();
    this.getLocale(this.modelName as string);
  }

  async ionViewWillEnter(): Promise<void> {
    await this.refresh(this.modelId);
  }

  // /**
  //  * @description Angular lifecycle hook for component initialization.
  //  * @summary Initializes the component by setting up the logger instance using the getLogger
  //  * utility. This ensures that logging is available throughout the component's lifecycle
  //  * for error tracking and debugging purposes.
  //  */
  // async ionViewWillEnter(): Promise<void> {
  //   // await super.ionViewWillEnter();
  // }

  /**
   * @description Refreshes the component data by loading the specified model instance.
   * @summary Loads model data from the repository based on the current operation type.
   * For READ, UPDATE, and DELETE operations, fetches the existing model data using
   * the provided unique identifier. Handles errors gracefully by logging them through
   * the logger instance.
   *
   * @param {string} [uid] - The unique identifier of the model to load; defaults to modelId
   */
  override async refresh(uid?: PrimaryKeyType): Promise<void> {
    this.refreshing = true;
    if (!uid) {
      uid = this.modelId;
    }
    try {
      this._repository = this.repository;
      switch (this.operation) {
        case OperationKeys.READ:
        case OperationKeys.UPDATE:
        case OperationKeys.DELETE:
          {
            await this.handleRead(uid);
          }
          break;
      }
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.errorMessage = error.message;
      }
      this.log.error(error as Error | string);
    }

    this.refreshing = false;
  }

  /**
   * @description Enables CRUD operations except those specified.
   * @summary Sets the allowed CRUD operations for the component, excluding any operations provided in the 'except' array.
   *
   * @param {OperationKeys[]} except - Array of operations to exclude from the allowed operations.
   */
  protected enableCrudOperations(except: OperationKeys[] = []): CrudOperations[] {
    const operations = [
      OperationKeys.CREATE,
      OperationKeys.READ,
      OperationKeys.UPDATE,
      OperationKeys.DELETE,
    ] as CrudOperations[];
    if (!except?.length) {
      this.operations = [...operations];
    } else {
      this.operations = operations.filter((op) => !except.includes(op));
    }
    return this.operations;
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
  override async handleEvent<M extends Model>(
    event: CrudEvent<M>,
    repository?: DecafRepository<M>,
  ): Promise<void> {
    const { name, role, handler, data, modelId, handlers } = event;
    if (!this.modelId && modelId) {
      this.modelId = modelId;
    }
    if (handler && role) {
      this.handlers = handlers || {};
      return await handler.bind(this)(event, data || {}, role);
    }
    switch (name) {
      case ComponentEventNames.Submit:
        await this.submit(event, true, repository);
        break;
      default:
        this.listenEvent.emit(event);
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
  // private buildModel<M extends Model>(
  //   data: KeyValue | KeyValue[],
  //   repository: DecafRepository<M>,
  //   operation?: OperationKeys,
  // ): M | M[] | EventIds {
  //   if (!operation) operation = this.operation;
  //   operation = (
  //     [OperationKeys.READ, OperationKeys.DELETE].includes(operation)
  //       ? OperationKeys.DELETE
  //       : operation.toLowerCase()
  //   ) as OperationKeys;

  //   if (Array.isArray(data))
  //     return data.map((item) => this.buildModel(item, repository, operation)) as M[];

  //   const pk = Model.pk(repository.class as Constructor<M>);
  //   const pkType = Metadata.type(repository.class as Constructor<M>, pk as string).name;
  //   const modelId = (this.modelId || data[pk as string]) as Primitives;
  //   if (!this.modelId) this.modelId = modelId;
  //   const uid = this.parsePkValue(
  //     operation === OperationKeys.DELETE ? data[pk as string] : modelId,
  //     pkType,
  //   );
  //   if (operation !== OperationKeys.DELETE) {
  //     const properties = Metadata.properties(repository.class as Constructor<M>) as string[];
  //     const relation =
  //       pk === this.pk
  //         ? {}
  //         : properties.includes(this.pk as string) && !data[this.pk as string]
  //           ? { [this.pk as string]: modelId }
  //           : {};
  //     return Model.build(
  //       Object.assign(
  //         data || {},
  //         relation,
  //         modelId && !data[this.pk] ? { [this.pk]: modelId } : {},
  //       ),
  //       repository.class.name,
  //     ) as M;
  //   }
  //   return uid as EventIds;
  // }

  async getTransactionRepository<M extends Model>(
    event: CrudEvent<M>,
    repo: DecafRepository<M>,
  ): Promise<DecafRepository<M>> {
    if (!repo) {
      repo = this._repository as DecafRepository<M>;
    }
    if (!repo || repo?.class?.name !== this.model?.constructor?.name) {
      const { context } = (await this.process(
        event,
        this.model as M,
        false,
      )) as ILayoutModelContext;
      if (context) {
        // parse data from main model to event
        event.data = context.data as M;
        return context.repository as DecafRepository<M>;
      }
    }
    if (!repo) {
      repo = this.repository as DecafRepository<M>;
    }
    return repo;
  }

  // async beginTransaction<M extends Model>(
  //   data: M,
  //   repository: DecafRepository<M>,
  //   operation: CrudOperations,
  // ): Promise<M | M[] | EventIds> {
  //   const hook = `before${operation.charAt(0).toUpperCase() + operation.slice(1)}`;
  //   const handler = this.handlers?.[hook] || undefined;
  //   const model = this.buildModel(data || {}, repository, operation);
  //   if (handler && typeof handler === 'function') {
  //     (await handler.bind(this)(model, repository, this.modelId)) as M;
  //   }
  //   return model as M;
  // }

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
  async handleRead<M extends Model>(
    uid?: PrimaryKeyType,
    repository?: IRepository<M>,
    modelName?: string,
  ): Promise<Model | undefined> {
    if (!uid) {
      this.log.info('No key passed to model page read operation, backing to last page');
      return undefined;
    }

    if (!modelName) {
      modelName = this.modelName;
      if (!modelName && this.model?.constructor)
        this.modelName = modelName = this.model.constructor.name;
    }
    const getRepository = async (
      modelName: string,
      acc: KeyValue = {},
      parent: string = '',
    ): Promise<DecafRepository<Model> | void> => {
      if (this._repository) {
        return this._repository as DecafRepository<Model>;
      }
      const constructor = Model.get(modelName);
      if (constructor) {
        const properties = this.getModelProperties(constructor);
        for (const prop of properties) {
          const type = this.getModelPropertyType(constructor, prop);
          const context = getModelAndRepository(type) || getModelAndRepository(prop);
          if (!context) {
            acc[prop] = {};
            return getRepository(type, acc, prop);
          }
          const { repository, model, pk, pkType } = context;
          if (!this.pk) {
            this.pk = pk;
            this.pkType = pkType;
          }
          uid = this.parsePkValue(uid as PrimaryKeyType, this.pkType);
          if (!this.modelId) {
            this.modelId = uid as PrimaryKeyType;
          }
          if (modelName === this.modelName) {
            const data = await repository.read(uid as PrimaryKeyType);
            acc[prop] = data;
            const _model =
              (await this.transactionEnd(data as Model, repository, OperationKeys.READ)) ||
              Model.build(data, model.constructor.name as string);
            this.name = prop;
            this.model = Model.build({ [prop]: _model }, modelName);
          } else {
            // model[parent] = {
            //   ...model[parent],
            //   [prop]: data,
            // };
          }
        }
        // this._data = model;
        // this.changeDetectorRef.detectChanges();
        // this.model = Model.build(model, this.modelName as string);
        // this.changeDetectorRef.detectChanges();
      }
    };
    repository = (repository || (await getRepository(modelName as string))) as IRepository<M>;
    if (!repository) {
      return this.model as M;
    }
    try {
      if (!this.pk) this.pk = Model.pk(repository.class) as string;
      return await repository.read(
        this.parsePkValue(uid as Primitives, this.getModelPkType(repository.class)),
      );
    } catch (error: unknown) {
      this.log
        .for(this.handleRead)
        .info(`Error getting model instance with id ${uid}: ${(error as Error).message}`);
      return undefined;
    }
  }

  async process<M extends Model>(
    event: CrudEvent<M>,
    model?: M,
    submit: boolean = false,
  ): Promise<ILayoutModelContext | IModelComponentSubmitEvent<M>> {
    const result = { models: {} } as ILayoutModelContext;
    const eventData = event.data as KeyValue;
    const iterate = async (
      evt: ICrudFormEvent & { data: KeyValue },
      model: string | M,
      parent?: string,
    ) => {
      const constructor = this.getModelConstrutor(model);
      if (constructor) {
        const properties = Metadata.properties(constructor) as string[];
        const promises = properties.map(async (prop) => {
          const type = Metadata.type(constructor as Constructor<Model>, prop).name;
          let data =
            evt.data?.[prop] || (parent ? eventData?.[parent as string][prop] : eventData?.[prop]);
          if (data) {
            if (parent || Array.isArray(data)) data = [...Object.values(data)];
            const context = getModelAndRepository(type) || getModelAndRepository(prop);
            evt = { ...evt, data };
            if (!context) {
              await iterate(evt, type, prop);
            } else {
              const { repository, model, pk, pkType } = context;
              if (!this.pk) {
                this.pk = pk;
              }
              if (!result.context) {
                result.context = {
                  repository,
                  model,
                  pk: pk,
                  pkType: pkType,
                  data,
                };
                if (!this.modelId) {
                  this.modelId = (data as KeyValue)[pk];
                }
              } else {
                Object.assign(result.context.data, {
                  [prop]: Array.isArray(data) ? this.buildTransactionModel(data, repository) : data,
                });
              }
              Object.assign(result.models, {
                [prop]: {
                  model,
                  data,
                  repository: repository,
                  pk,
                },
              });
              delete (evt.data as KeyValue)?.[prop];
              evt = { ...evt, data: evt.data };
            }
          }
        });
        await Promise.all(promises);
      }
    };
    if (!model) {
      model = this.model as M;
    }
    await iterate(event, model);
    return result;
    // return (await this.batchOperation(result)) as IModelComponentSubmitEvent<M>;
  }

  /**
   * @description Handles form submission events for CRUD operations.
   * @summary Processes form submission by executing the appropriate repository operation
   * based on the current operation type. Handles CREATE, UPDATE, and DELETE operations,
   * processes the form data, refreshes the repository cache, navigates back to the previous
   * page, and displays success notifications. Comprehensive error handling ensures robust
   * operation with detailed logging.
   *
   * @param {CrudEvent<M>} event - The submit event containing form data
   * @return {Promise<IModelComponentSubmitEvent|void>} Promise that resolves on success or throws on error
   */
  override async submit<M extends Model>(
    event: CrudEvent<M>,
    redirect: boolean = false,
    repo?: DecafRepository<M>,
    pk?: keyof M,
  ): Promise<IModelComponentSubmitEvent<M>> {
    let success = false;
    let message = '';
    let result = null;
    try {
      const repository = await this.getTransactionRepository<M>(event, repo!);
      const { data, role } = event;
      const operation = (role || this.operation) as CrudOperations;
      if (data) {
        if (!pk) {
          pk = Model.pk(repository.class) as keyof M;
        }
        if (!this.modelId) {
          this.modelId = data?.[pk] as PrimaryKeyType;
        }
        const model = await this.transactionBegin(data, repository, operation);
        if (!model) {
          return {
            success: false,
            aborted: true,
            model: null,
            message: 'Operation aborted by before hook',
          };
        }

        switch (operation) {
          case OperationKeys.CREATE:
            result = await (!Array.isArray(model)
              ? repository.create(model as M)
              : repository.createAll(model as M[]));
            break;
          case OperationKeys.UPDATE: {
            const models = (!Array.isArray(model) ? [model] : model) as M[];
            for (const m of models) {
              const uid = m[pk as keyof M] as PrimaryKeyType;
              const check = uid ? await repository.read(uid as PrimaryKeyType) : false;
              result = await (!check ? repository.create(m as M) : repository.update(m as M));
            }
            break;
          }
          case OperationKeys.DELETE:
            result = await (!Array.isArray(model)
              ? repository.delete(model as PrimaryKeyType)
              : repository.deleteAll(model as []));
            break;
        }
        success = result ? true : false;
        if (success) {
          if ((result as KeyValue)?.[this.pk]) {
            this.modelId = (result as KeyValue)[this.pk];
          }
          if (redirect) {
            this.location.back();
          }
        }
        message = await this.translate(`operations.${operation}.${result ? 'success' : 'error'}`, {
          '0': repository.class.name || pk,
          '1': this.modelId || '',
        });
      }
    } catch (error: unknown) {
      this.log
        .for(this.submit)
        .error(
          `Error during ${this.operation} operation: ${
            error instanceof Error ? error.message : (error as string)
          }`,
        );
      message = error instanceof Error ? error.message : (error as string);
    }
    return { ...event, success, message, model: result, aborted: false };
  }

  // async batchOperation(context: ILayoutModelContext, redirect: boolean = false): Promise<any> {
  // const { data, repository, pk } = context.context;
  // return data;
  // return await this.submit({data}, false, repository, pk);
  // const result: boolean[] = [];
  // let resultMessage = '';
  // const promises = Object.keys(models).map(async(m) => {
  //   const {model, repository} = models[m];
  //   const {success} = await this.submit({data: model}, false, repository as IRepository<Model>);
  //   if(success)
  //     resultMessage = await this.translate('operations.multiple.success');
  //   result.push(success);
  // })
  // await Promise.all(promises);
  // const success = result.every((r: boolean) => r);
  // if (success && redirect)
  //   this.location.back();
  // return {...{data: models}, success, message: resultMessage};
  // }
}
