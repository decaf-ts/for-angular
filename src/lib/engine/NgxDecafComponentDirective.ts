/**
 * @module module:lib/engine/NgxDecafComponentDirective
 * @description Base decaf component abstraction providing shared inputs and utilities.
 * @summary NgxDecafComponentDirective is the abstract foundation for Decaf components and provides common
 * inputs (model, mapper, pk, props), logging, repository resolution, and event dispatch helpers.
 * It centralizes shared behavior for child components and simplifies integration with the rendering engine.
 *
 * @link {@link NgxDecafComponentDirective}
 */
import { Directive, ElementRef, EventEmitter, Inject, inject, Input, Output, SimpleChanges, ViewChild, OnChanges, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { LoggedClass, Logger } from '@decaf-ts/logging';
import { DecafRepository, FunctionLike, KeyValue } from './types';
import { IBaseCustomEvent, ICrudFormEvent } from './interfaces';
import { NgxEventHandler } from './NgxEventHandler';
import { Router } from '@angular/router';
import { getLocaleContext } from '../i18n/Loader';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { MenuController } from '@ionic/angular';
import { getModelRepository,  CPTKN } from '../for-angular-common.module';
import { Model, ModelConstructor, Primitives, sf } from '@decaf-ts/decorator-validation';
import { CrudOperations, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { BaseComponentProps } from './constants';
import { UIModelMetadata } from '@decaf-ts/ui-decorators';
import { generateRandomValue } from '../helpers';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

try {
  new NgxRenderingEngine();
} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

@Directive({host: {'[attr.id]': 'uid'}})
export abstract class NgxDecafComponentDirective extends LoggedClass implements OnChanges {


  /**
   * @description Reference to the component's element.
   * @summary Provides direct access to the native DOM element of the component through Angular's
   * ViewChild decorator. This reference can be used to manipulate the DOM element directly,
   * apply custom styles, or access native element properties and methods. The element is
   * identified by the 'component' template reference variable.
   *
   * @type {ElementRef}
   * @memberOf NgxDecafComponentDirective
   */
  @ViewChild('component', { read: ElementRef, static: true })
  component!: ElementRef;


  @Input()
  name!: string;

  @Input()
  childOf!: string | undefined;

  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  uid: string | number = generateRandomValue(16);


  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  model!: Model | string | undefined;


  /**
   * @description The primary data model used for CRUD operations.
   * @summary This input provides the main Model instance that the form interacts with for
   * creating, reading, updating, or deleting records. It serves as the source of schema
   * and validation rules for the form fields, and is required for most operations except
   * for certain read or delete scenarios.
   *
   * @type {Model | undefined}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  modelId!: Model | undefined;


  /**
   * @description Primary key field name for the model.
   * @summary Specifies which field in the model should be used as the primary key.
   * This is typically used for identifying unique records in operations like update and delete.
   *
   * @type {string}
   * @default 'id'
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  pk!: string;

  /**
   * @description Field mapping configuration.
   * @summary Defines how fields from the data model should be mapped to properties used by the component.
   * This allows for flexible data binding between the model and the component's display logic.
   *
   * @type {Record<string, string>}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  mapper: Record<string, string> | FunctionLike = {};


  /**
   * @description Available CRUD operations for this component.
   * @summary Defines which CRUD operations (Create, Read, Update, Delete) are available
   * for this component. This affects which operations can be performed on the data.
   *
   * @default [OperationKeys.READ]
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  operations: CrudOperations[] = [OperationKeys.READ];


  /**
   * @description Primary key field name for the model.
   * @summary Specifies which field in the model should be used as the primary key.
   * This is typically used for identifying unique records in operations like update and delete.
   *
   * @type {number}
   * @default 1
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  row: number = 1;


  /**
   * @description Primary key field name for the model.
   * @summary Specifies which field in the model should be used as the primary key.
   * This is typically used for identifying unique records in operations like update and delete.
   *
   * @type {number}
   * @default 1
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  col: number = 1;


  /**
   * @description Additional CSS class names to apply to the component.
   * @summary Allows custom CSS classes to be added to the component's root element.
   * These classes are appended to any automatically generated classes based on other
   * component properties. Multiple classes can be provided as a space-separated string.
   * This provides a way to customize the component's appearance beyond the built-in styling options.
   *
   * @type {string}
   * @default ""
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  className: string = '';


  /**
   * @description The repository for interacting with the data model.
   * @summary Provides a connection to the data layer for retrieving and manipulating data.
   * This is an instance of the `DecafRepository` class from the `@decaf-ts/core` package,
   * which is initialized in the `repository` getter method.
   *
   * The repository is used to perform CRUD (Create, Read, Update, Delete) operations on the
   * data model, such as fetching data, creating new items, updating existing items, and deleting
   * items. It also provides methods for querying and filtering data based on specific criteria.
   *
   * @type {DecafRepository<Model>}
   * @private
   * @memberOf NgxDecafComponentDirective
   */
  protected _repository?: DecafRepository<Model>;


  /**
   * @description Root component of the Decaf-ts for Angular application
   * @summary This component serves as the main entry point for the application.
   * It sets up the navigation menu, handles routing events, and initializes
   * the application state. It also manages the application title and menu visibility.
   *
   * @private
   * @type {MenuController}
   * @memberOf NgxDecafComponentDirective
   */
  protected menuController: MenuController = inject(MenuController);

   /**
     * @description Angular change detection service.
     * @summary Injected service that provides manual control over change detection cycles.
     * This is essential for ensuring that programmatic DOM changes (like setting accordion
     * attributes) are properly reflected in the component's state and trigger appropriate
     * view updates when modifications occur outside the normal Angular change detection flow.
     *
     * @protected
     * @type {ChangeDetectorRef}
     * @memberOf CrudFormComponent
     */
    protected changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

    /**
     * @description Angular Renderer2 service for safe DOM manipulation.
     * @summary Injected service that provides a safe, platform-agnostic way to manipulate DOM elements.
     * This service ensures proper handling of DOM operations across different platforms and environments,
     * including server-side rendering and web workers.
     *
     * @protected
     * @type {Renderer2}
     * @memberOf CrudFormComponent
     */
    protected renderer: Renderer2 = inject(Renderer2);

    /**
     * @description Translation service for internationalization.
     * @summary Injected service that provides translation capabilities for UI text.
     * Used to translate button labels and validation messages based on the current locale.
     *
     * @protected
     * @type {TranslateService}
     * @memberOf CrudFormComponent
     */
    protected translateService: TranslateService = inject(TranslateService);


  /**
   * @description Logger instance for the component.
   * @summary Provides logging capabilities for the component, allowing for consistent
   * and structured logging of information, warnings, and errors. This logger is initialized
   * in the ngOnInit method using the getLogger function from the ForAngularCommonModule.
   *
   * The logger is used throughout the component to record important events, debug information,
   * and potential issues. It helps in monitoring the component's behavior, tracking the flow
   * of operations, and facilitating easier debugging and maintenance.
   *
   * @type {Logger}
   * @private
   * @memberOf NgxDecafComponentDirective
   */
  logger!: Logger;

  /**
   * @description Event emitter for custom renderer events.
   * @summary Emits custom events that occur within child components or the layout itself.
   * This allows parent components to listen for and respond to user interactions or
   * state changes within the grid layout. Events are passed up the component hierarchy
   * to enable coordinated behavior across the application.
   *
   * @type {EventEmitter<IBaseCustomEvent>}
   * @memberOf NgxDecafComponentDirective
   */
  @Output()
  listenEvent: EventEmitter<IBaseCustomEvent> = new EventEmitter<IBaseCustomEvent>();

  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf NgxDecafComponentDirective
   */
  protected router: Router = inject(Router);


  /**
   * @description Angular Router instance for navigation
   * @summary Injected Router service used for programmatic navigation
   * to other pages after successful login or other routing operations.
   *
   * @private
   * @type {Router}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  locale?: string;


  /**
   * @description Configuration for list item rendering
   * @summary Defines how list items should be rendered in the component.
   * This property holds a configuration object that specifies the tag name
   * and other properties needed to render list items correctly. The tag property
   * identifies which component should be used to render each item in a list.
   * Additional properties can be included to customize the rendering behavior.
   *
   * @type {Record<string, unknown>}
   * @default {tag: ""}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  item: Record<string, unknown> = { tag: '' };

  /**
   * @description Dynamic properties configuration object.
   * @summary Contains key-value pairs of dynamic properties that can be applied to the component
   * at runtime. This flexible configuration object allows for dynamic property assignment without
   * requiring explicit input bindings for every possible configuration option. Properties from
   * this object are parsed and applied to the component instance through the parseProps method,
   * enabling customizable component behavior based on external configuration.
   *
   * @type {Record<string, unknown>}
   * @default {}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  props: Record<string, unknown> = {};


  /**
   * @description Base route for navigation related to this component.
   * @summary Defines the base route path used for navigation actions related to this component.
   * This is often used as a prefix for constructing navigation URLs.
   *
   * @type {string}
   * @memberOf NgxDecafComponentDirective
   */
  @Input()
  route!: string;


  /**
   * @description Flag indicating if the component has been initialized
   * @summary Tracks whether the component has completed its initialization process.
   * This flag is used to prevent duplicate initialization and to determine if
   * certain operations that require initialization can be performed.
   *
   * @type {boolean}
   * @default false
   * @memberOf NgxDecafComponentDirective
   */
  initialized: boolean = false;


  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(CPTKN) protected componentName?: string, @Inject(CPTKN) protected localeRoot?: string) {
		super();
    this.componentName = this.componentName || "NgxDecafComponentDirective";
    if(!this.localeRoot)
      this.localeRoot = this.componentName;
    this.logger = this.log;
	}

  get localeContext(){
		return this.getLocale();
	}

  /**
   * @description Getter for the repository instance.
   * @summary Provides a connection to the data layer for retrieving and manipulating data.
   * This method initializes the `_repository` property if it is not already set, ensuring
   * that a single instance of the repository is used throughout the component.
   *
   * The repository is used to perform CRUD operations on the data model, such as fetching data,
   * creating new items, updating existing items, and deleting items. It also provides methods
   * for querying and filtering data based on specific criteria.
   *
   * @returns {DecafRepository<Model>} The initialized repository instance.
   * @private
   * @memberOf NgxDecafComponentDirective
   */
  protected get repository(): DecafRepository<Model> {
    try {
      if (!this._repository) {
        this._repository = getModelRepository(this.model as Model);
        if (this.model && !this.pk)
          this.pk =
            (this._repository as unknown as DecafRepository<Model>).pk || 'id';
      }
    } catch (error: unknown) {
      throw new InternalError((error as Error)?.message || (error as string));
    }
    return this._repository;
  }

  /**
   * @description Handles changes to component inputs
   * @summary This Angular lifecycle hook is called when input properties change.
   * It responds to changes in the model, locale, or translatable properties by
   * updating the component's internal state accordingly. When the model changes,
   * it calls getModel to process the new model and getLocale to update the locale.
   * When locale or translatable properties change, it calls getLocale to update
   * the translation settings.
   *
   * @param {SimpleChanges} changes - Object containing changed properties
   * @return {void}
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes[BaseComponentProps.MODEL]) {
      const { currentValue } = changes[BaseComponentProps.MODEL];
      if (currentValue)
        this.getModel(currentValue);
      this.locale = this.localeContext;
    }
    if (changes[BaseComponentProps.LOCALE_ROOT] || changes[BaseComponentProps.COMPONENT_NAME])
      this.locale = this.localeContext;
  }


  protected translate(phrase: string | string[], params?: object | string): Promise<string> {
    return new Promise((resolve, reject) => {
      if(typeof params === Primitives.STRING)
        params = {"0": params};
      return firstValueFrom(this.translateService.get(phrase, (params || {}) as object));
    });
  }

  protected async initialize(...args: unknown[]): Promise<void> {
    this.initialized = true;
  }

  protected getLocale(locale?: string): string {
    if (locale || !this.locale) {
      if(locale)
        this.localeRoot = locale;
      this.locale = getLocaleContext(this.localeRoot as string)
    }
    return this.locale as string;
  }

  /**
   * @description Gets the route for the component
   * @summary Retrieves the route path for the component, generating one based on the model
   * if no route is explicitly set. This method checks if a route is already defined, and if not,
   * it creates a default route based on the model's constructor name. The generated route follows
   * the pattern '/model/{ModelName}'. This is useful for automatic routing in CRUD operations.
   *
   * @return {string} The route path for the component, or empty string if no route is available
   */
  getRoute(): string {
    if (!this.route && this.model instanceof Model)
      this.route = `/model/${this.model?.constructor.name}`;
    return this.route || '';
  }


  /**
   * @description Resolves and sets the component's model
   * @summary Processes the provided model parameter, which can be either a Model instance
   * or a string identifier. If a string is provided, it attempts to resolve the actual model
   * from the injectables registry. After resolving the model, it calls setModelDefinitions
   * to configure the component based on the model's metadata.
   *
   * @param {string | Model} model - The model instance or identifier string
   * @return {void}
   */
  getModel<M extends Model>(model: string | Model | ModelConstructor<M>): void {
    if (!(model instanceof Model) && typeof model === Primitives.STRING)
      model = Model.get(model as string) as ModelConstructor<M>;
    this.setModelDefinitions(this.model as Model);
  }

    /**
   * @description Configures component properties based on model metadata
   * @summary Extracts and applies configuration from the model's decorators to set up
   * the component. This method uses the rendering engine to retrieve decorator metadata
   * from the model, then configures the component's mapper and item properties accordingly.
   * It ensures the route is properly set and merges various properties from the model's
   * metadata into the component's configuration.
   *
   * @param {Model} model - The model to extract configuration from
   * @return {void}
   */
  setModelDefinitions(model: Model): void {
    if (model instanceof Model) {
      this.getRoute();
      this.model = model;
      const  engine = NgxRenderingEngine.get() as unknown as NgxRenderingEngine
      const field = engine.getDecorators(this.model as Model, {});
      const { props, item, children } = field;
      this.props = Object.assign(props || {}, { children: children || [] });
      if (item?.props?.['mapper'])
        this.mapper = item?.props!['mapper'] || {};
      this.item = {
        tag: item?.tag || '',
        ...item?.props,
        ...(this.mapper ? { mapper: this.mapper } : {}),
        ...{ route: item?.props?.['route'] || this.route },
      };
    }
  }

  /**
   * @description Parses and applies properties from the props object to the component instance.
   * @summary This method iterates through the properties of the provided instance object
   * and applies any matching properties from the component's props configuration to the
   * component instance. This allows for dynamic property assignment based on configuration
   * stored in the props object, enabling flexible component customization without requiring
   * explicit property binding for every possible configuration option.
   *
   * The method performs a safe property assignment by checking if each key from the instance
   * exists in the props object before applying it. This prevents accidental property
   * overwriting and ensures only intended properties are modified.
   *
   * @param {KeyValue} instance - The component instance object to process
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant B as NgxBaseComponentDirective
   *   participant P as Props Object
   *
   *   C->>B: parseProps(instance)
   *   B->>B: Get Object.keys(instance)
   *   loop For each key in instance
   *     B->>P: Check if key exists in this.props
   *     alt Key exists in props
   *       B->>B: Set this[key] = this.props[key]
   *     else Key not in props
   *       Note over B: Skip this key
   *     end
   *   end
   *
   * @protected
   * @memberOf NgxBaseComponentDirective
   */
  protected parseProps(instance: KeyValue, skip: string[] = []): void {
    Object.keys(instance).forEach((key) => {
      if (Object.keys(this.props).includes(key) && !skip.includes(key)) {
        (this as KeyValue)[key] = this.props[key];
        delete this.props[key];
      }
    });
  }


  /**
   * @description Tracks items in ngFor loops for optimal change detection.
   * @summary Provides a tracking function for Angular's *ngFor directive to optimize rendering
   * performance. This method generates unique identifiers for list items based on their index
   * and content, allowing Angular to efficiently track changes and minimize DOM manipulations
   * during list updates. The tracking function is essential for maintaining component state
   * and preventing unnecessary re-rendering of unchanged items.
   *
   * @param {number} index - The index of the item in the list
   * @param {KeyValue | string | number} item - The item data to track
   * @returns {string | number} A unique identifier for the item
   * @memberOf NgxDecafComponentDirective
   */
  protected trackItemFn(
    index: number,
    item: KeyValue | string | number
  ): string | number {
    return `${index}-${item}`;
  }

	async handleEvent(event: IBaseCustomEvent | ICrudFormEvent | CustomEvent): Promise<void> {
    let name = "";
    const log = this.log.for(this.handleEvent);
    if(event instanceof CustomEvent) {
       if(!event.detail)
        return log.debug(`No handler for event ${name}`);
      name = event.detail?.name;
      event = event.detail;
    }
    const handlers = (event as ICrudFormEvent)?.['handlers'] as Record<string, NgxEventHandler<unknown>> | undefined;
    name = name || (event as IBaseCustomEvent)?.['name'];
    if(handlers && Object.keys(handlers || {})?.length) {
      if(!handlers[name])
        return log.debug(`No handler found for event ${name}`);
      try {
        const clazz = new (handlers as KeyValue)[name](this.router);
        const result = clazz.handle(event);
        return (result instanceof Promise) ?
         await result : result;
      } catch (e: unknown) {
        log.error(`Failed to handle ${name} event`, e as Error)
      }
    }
    this.listenEvent.emit(event as IBaseCustomEvent | ICrudFormEvent);
	}

	// ngOnInit() {
		// this.setColorScheme(MediaService.isDarkMode() ? "dark" : "light");
	// }

	// protected setColorScheme(scheme: "light" | "dark") {}
}
