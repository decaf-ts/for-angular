import { Component, inject, Input, OnInit } from '@angular/core';
import {
  InternalError,
  IRepository,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import { Repository } from '@decaf-ts/core';
import { Model } from '@decaf-ts/decorator-validation';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent } from '@ionic/angular/standalone';
import { BaseCustomEvent, EventConstants, KeyValue } from 'src/lib/engine';
import { RouterService } from 'src/app/services/router.service';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { DecafRepository } from 'src/lib/engine/types';
import { Logger } from '@decaf-ts/logging';
import { getLogger } from 'src/lib/for-angular-common.module';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';

/**
 * @description Angular component page for CRUD operations on dynamic model entities.
 * @summary The ModelPage component provides a comprehensive interface for performing Create, Read, Update,
 * and Delete operations on any registered model entity within the Decaf framework. This component dynamically
 * adapts to different model types and operations, providing a unified interface for data manipulation. It
 * integrates with the repository pattern for data access, supports real-time data refresh, and provides user
 * feedback through toast notifications and navigation management.
 *
 * Key features include:
 * - Dynamic model resolution based on model name
 * - Support for all CRUD operations with operation-specific UI adaptation
 * - Automatic repository instantiation and management
 * - Integration with Angular routing for navigation flow
 * - Error handling with comprehensive logging
 * - Real-time data refresh and cache management
 * - Toast notifications for user feedback
 * - Responsive layout with Ionic components
 *
 * @param {OperationKeys} operation - The CRUD operation to perform (CREATE, READ, UPDATE, DELETE)
 * @param {string} modelName - The name of the model class to operate on
 * @param {string} modelId - The unique identifier of the model instance for read/update/delete operations
 *
 * @class ModelPage
 * @example
 * ```typescript
 * // Usage in routing configuration
 * {
 *   path: 'user/:modelId',
 *   component: ModelPage,
 *   data: {
 *     modelName: 'User',
 *     operation: OperationKeys.READ
 *   }
 * }
 *
 * // Direct component usage
 * <app-model
 *   modelName="Product"
 *   [operation]="OperationKeys.CREATE"
 *   (submit)="handleSubmit($event)">
 * </app-model>
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant U as User
 *   participant MP as ModelPage
 *   participant R as Repository
 *   participant RS as RouterService
 *   participant T as ToastComponent
 *   participant L as Logger
 *
 *   U->>MP: Navigate to page
 *   MP->>MP: ngOnInit()
 *   MP->>L: Initialize logger
 *
 *   MP->>MP: ionViewWillEnter()
 *   MP->>MP: Set allowed operations
 *   MP->>MP: refresh(modelId)
 *
 *   alt Operation is READ/UPDATE/DELETE
 *     MP->>R: handleGet(modelId)
 *     R->>R: read(modelId)
 *     R-->>MP: Return model data
 *     MP->>MP: Set model
 *   end
 *
 *   U->>MP: Submit form
 *   MP->>MP: handleEvent(submitEvent)
 *   MP->>MP: handleSubmit(event)
 *   MP->>MP: parseData(event.data)
 *
 *   alt Operation is CREATE
 *     MP->>R: create(data)
 *   else Operation is UPDATE
 *     MP->>R: update(data)
 *   else Operation is DELETE
 *     MP->>R: delete(data)
 *   end
 *
 *   R-->>MP: Return operation result
 *   MP->>R: refresh(modelName, operation, modelId)
 *   MP->>RS: backToLastPage()
 *   MP->>T: inform(success message)
 *
 *   alt Error occurs
 *     MP->>L: error(error)
 *     MP->>MP: throw Error
 *   end
 */
@Component({
  standalone: true,
  selector: 'app-model',
  templateUrl: './model.page.html',
  imports: [ModelRendererComponent, HeaderComponent, ContainerComponent, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
  styleUrls: ['./model.page.scss'],
})
export class ModelPage implements OnInit {

  /**
   * @description The CRUD operation type to be performed on the model.
   * @summary Specifies which operation (Create, Read, Update, Delete) this component instance
   * should perform. This determines the UI behavior, form configuration, and available actions.
   * The operation affects form validation, field availability, and the specific repository
   * method called during data submission.
   *
   * @type {OperationKeys.CREATE | OperationKeys.READ | OperationKeys.UPDATE | OperationKeys.DELETE}
   * @default OperationKeys.READ
   * @memberOf ModelPage
   */
  @Input()
  operation:
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
   * @memberOf ModelPage
   */
  @Input()
  modelName!: string;

  /**
   * @description The unique identifier of the model instance.
   * @summary For READ, UPDATE, and DELETE operations, this identifies the specific
   * model instance to operate on. The ID is used to fetch existing data from the
   * repository and populate forms for editing or display. For CREATE operations,
   * this value is typically undefined as a new instance is being created.
   *
   * @type {string}
   * @memberOf ModelPage
   */
  @Input()
  modelId!: string;

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
  allowedOperations: OperationKeys[] = [OperationKeys.CREATE, OperationKeys.READ];

  /**
   * @description The current model instance being operated on.
   * @summary Holds the model data for the current operation. For READ and UPDATE operations,
   * this contains the data loaded from the repository. For CREATE operations, this holds
   * a new instance of the model class. The model structure and validation rules are
   * determined by the class definition and decorators.
   *
   * @type {Model | undefined}
   * @memberOf ModelPage
   */
  model!: Model | undefined;

  /**
   * @description Logger instance for error tracking and debugging.
   * @summary Provides logging capabilities for tracking errors, debugging information,
   * and operational events within the component. The logger is initialized using the
   * getLogger utility and is used throughout the component for comprehensive error
   * tracking and debugging support.
   *
   * @type {Logger}
   * @private
   * @memberOf ModelPage
   */
  private logger!: Logger;

  /**
   * @description Repository instance for data access operations.
   * @summary Private repository instance used for performing CRUD operations on the model.
   * This is lazily initialized through the repository getter method, which resolves the
   * appropriate repository based on the model name and ensures proper model registration.
   *
   * @type {IRepository<Model> | undefined}
   * @private
   * @memberOf ModelPage
   */
  private _repository?: IRepository<Model>;

  /**
   * @description Router service for navigation management.
   * @summary Injected service that handles navigation operations, particularly for
   * returning to the previous page after successful operations. This service provides
   * a consistent navigation experience and maintains the application's routing flow.
   *
   * @type {RouterService}
   * @private
   * @memberOf ModelPage
   */
  private routerService: RouterService = inject(RouterService);

  /**
   * @description Lazy-initialized repository getter with model resolution.
   * @summary Creates and returns a repository instance for the specified model name.
   * Resolves the model constructor from the global registry, instantiates the repository,
   * and creates a new model instance. Throws an InternalError if the model is not
   * properly registered with the @Model decorator.
   *
   * @return {IRepository<Model>} The repository instance for the current model
   * @throws {InternalError} When the model is not found in the registry
   * @memberOf ModelPage
   */
  private get repository(): IRepository<Model> {
    if (!this._repository) {
      const constructor = Model.get(this.modelName);
      if (!constructor)
        throw new InternalError(
          'Cannot find model. was it registered with @model?',
        );
      this._repository = Repository.forModel(constructor);
      this.model = new constructor() as Model;
    }
    return this._repository;
  }

  /**
   * @description Angular lifecycle hook for component initialization.
   * @summary Initializes the component by setting up the logger instance using the getLogger
   * utility. This ensures that logging is available throughout the component's lifecycle
   * for error tracking and debugging purposes.
   *
   * @memberOf ModelPage
   */
  ngOnInit(): void {
    this.logger = getLogger(this);
  }

  /**
   * @description Ionic lifecycle hook executed when the view is about to enter.
   * @summary Configures the allowed operations based on the presence of a modelId and
   * refreshes the component data. If a modelId is provided, UPDATE and DELETE operations
   * are added to the allowed operations array, enabling full CRUD functionality for
   * existing model instances.
   *
   * @memberOf ModelPage
   */
  async ionViewWillEnter(): Promise<void> {
    if(this.modelId)
      this.allowedOperations =  this.allowedOperations.concat([OperationKeys.UPDATE, OperationKeys.DELETE]);
    await this.refresh(this.modelId);
  }

  /**
   * @description Refreshes the component data by loading the specified model instance.
   * @summary Loads model data from the repository based on the current operation type.
   * For READ, UPDATE, and DELETE operations, fetches the existing model data using
   * the provided unique identifier. Handles errors gracefully by logging them through
   * the logger instance.
   *
   * @param {string} [uid] - The unique identifier of the model to load; defaults to modelId
   * @memberOf ModelPage
   */
  async refresh(uid?: string) {
    if(!uid)
      uid = this.modelId;
    try {
      this._repository = this.repository;
      switch(this.operation){
        case OperationKeys.READ:
        case OperationKeys.UPDATE:
        case OperationKeys.DELETE:
          this.model = await this.handleGet(uid);
        break;
      }
    } catch (error: unknown) {
      this.logger.error(error as Error | string);
    }
  }

  /**
   * @description Generic event handler for component events.
   * @summary Processes incoming events from child components and routes them to appropriate
   * handlers based on the event name. Currently handles SUBMIT events by delegating to
   * the handleSubmit method. This centralized event handling approach allows for easy
   * extension and consistent event processing.
   *
   * @param {BaseCustomEvent} event - The event object containing event data and metadata
   * @memberOf ModelPage
   */
  async handleEvent(event: BaseCustomEvent) {
    const { name } = event;
    switch (name) {
      case EventConstants.SUBMIT:
        await this.handleSubmit(event);
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
   * @param {BaseCustomEvent} event - The submit event containing form data
   * @return {Promise<void | Error>} Promise that resolves on success or throws on error
   * @throws {Error} Re-throws repository errors with proper error message handling
   * @memberOf ModelPage
   */
  async handleSubmit(event: BaseCustomEvent): Promise<void | Error> {
    try {
      const repo = this._repository as IRepository<Model>;
      const data = this.parseData(event.data as KeyValue);
      const result = this.operation === OperationKeys.CREATE ?
        await repo.create(data as Model) : this.operation === OperationKeys.UPDATE ?
          await repo.update(data as Model) : repo.delete(data as string | number);
      if(result) {
        (repo as DecafRepository<Model>).refresh(this.modelName, this.operation, this.modelId);
        this.routerService.backToLastPage();
        await getNgxToastComponent().inform(`${this.operation} Item successfully`);
      }
    } catch (error: unknown) {
      this.logger.error(error as Error | string);
      throw new Error((error as Error)?.message || error as string);
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
   * @memberOf ModelPage
   */
  async handleGet(uid: string): Promise<Model | undefined> {
    if (!uid) {
      this.logger.info('No key passed to model page read operation, backing to last page');
      this.routerService.backToLastPage();
      return undefined;
    }
    const result = await (this._repository as IRepository<Model>).read(isNaN(Number(uid)) ? uid : Number(uid));
    return result ?? undefined;
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
   * @memberOf ModelPage
   */
  private parseData(data: Partial<Model>): Model | string | number {
      const repo = this._repository as IRepository<Model>;
      let uid: number | string = this.modelId;
      if(repo.pk === 'id' as keyof Model)
        uid = Number(uid);
      if(this.operation !== OperationKeys.DELETE)
        return Model.build(this.modelId ? Object.assign(data, {[repo.pk]: uid}) : data, this.modelName) as Model;
      return uid;
  }
}
