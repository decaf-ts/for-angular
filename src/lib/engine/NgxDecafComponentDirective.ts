/**
 * @module lib/engine/NgxDecafComponentDirective
 * @description Base decaf component abstraction providing shared inputs and utilities.
 * @summary NgxDecafComponentDirective is the abstract foundation for Decaf components and provides common
 * inputs (model, mapper, pk, props), logging, repository resolution, and event dispatch helpers.
 * It centralizes shared behavior for child components and simplifies integration with the rendering engine.
 * @link {@link NgxDecafComponentDirective}
 */
import { Directive, ElementRef, EventEmitter, Inject, inject, Input, Output, SimpleChanges, ViewChild, OnChanges, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LoggedClass, Logger } from '@decaf-ts/logging';
import { Model, ModelConstructor, Primitives } from '@decaf-ts/decorator-validation';
import { CrudOperations, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { DecafRepository, FunctionLike, KeyValue } from './types';
import { IBaseCustomEvent, ICrudFormEvent } from './interfaces';
import { NgxEventHandler } from './NgxEventHandler';
import { getLocaleContext } from '../i18n/Loader';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { MenuController } from '@ionic/angular';
import { getModelRepository,  CPTKN } from '../for-angular-common.module';
import { BaseComponentProps } from './constants';
import { generateRandomValue } from '../helpers';
import { EventIds } from '@decaf-ts/core';

try {
  new NgxRenderingEngine();
} catch (e: unknown) {
  throw new Error(`Failed to load rendering engine: ${e}`);
}

/**
 * @description Base directive for Decaf components in Angular applications.
 * @summary Abstract base class that provides common functionality for all Decaf components.
 * This directive establishes a foundation for component development by offering shared inputs
 * (model, mapper, pk, props), logging infrastructure, repository access, event handling, and
 * internationalization support. It implements OnChanges to respond to input property changes
 * and includes utilities for navigation, localization, and dynamic property binding. All Decaf
 * components should extend this directive to inherit its foundational capabilities.
 * @class NgxDecafComponentDirective
 * @extends {LoggedClass}
 * @implements {OnChanges}
 * @memberOf module:lib/engine/NgxDecafComponentDirective
 */
@Directive({host: {'[attr.id]': 'uid'}})
export abstract class NgxDecafComponentDirective extends LoggedClass implements OnChanges {


  /**
   * @description Reference to the component's native DOM element.
   * @summary Provides direct access to the native DOM element of the component through Angular's
   * ViewChild decorator. This reference can be used to manipulate the DOM element directly,
   * apply custom styles, or access native element properties and methods. The element is
   * identified by the 'component' template reference variable.
   * @type {ElementRef}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @ViewChild('component', { read: ElementRef, static: true })
  component!: ElementRef;


  /**
   * @description Name identifier for the component instance.
   * @summary Provides a string identifier that can be used to name or label the component
   * instance. This name can be used for debugging purposes, logging, or to identify specific
   * component instances within a larger application structure. It serves as a human-readable
   * identifier that helps distinguish between multiple instances of the same component type.
   * @type {string}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  name!: string;

  /**
   * @description Parent component identifier for hierarchical component relationships.
   * @summary Specifies the identifier of the parent component in a hierarchical component structure.
   * This property establishes a parent-child relationship between components, allowing for
   * proper nesting and organization of components within a layout. It can be used to track
   * component dependencies and establish component hierarchies for rendering and event propagation.
   * @type {string | undefined}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  childOf!: string | undefined;

  /**
   * @description Unique identifier for the component instance.
   * @summary A unique identifier automatically generated for each component instance.
   * This UID is used for DOM element identification, component tracking, and debugging purposes.
   * By default, it generates a random 16-character value, but it can be explicitly set via input.
   * @type {string | number}
   * @default generateRandomValue(16)
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  uid: string | number = generateRandomValue(16);


  /**
   * @description Data model or model name for component operations.
   * @summary The data model that this component will use for CRUD operations. This can be provided
   * as a Model instance, a model constructor, or a string representing the model's registered name.
   * When set, this property provides the component with access to the model's schema, validation rules,
   * and metadata needed for rendering and data operations.
   * @type {Model | string | undefined}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  model!: Model | string | undefined;


  /**
   * @description Primary key value of the current model instance.
   * @summary Specifies the primary key value for the current model record being displayed or
   * manipulated by the component. This identifier is used for CRUD operations that target
   * specific records, such as read, update, and delete operations. The value corresponds to
   * the field designated as the primary key in the model definition.
   * @type {EventIds}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  modelId?: EventIds;


  /**
   * @description Primary key field name for the data model.
   * @summary Specifies which field in the model should be used as the primary key.
   * This is typically used for identifying unique records in operations like update and delete.
   * If not explicitly set, it defaults to the repository's configured primary key or 'id'.
   * @type {string}
   * @default 'id'
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  pk!: string;

  /**
   * @description Field mapping configuration object or function.
   * @summary Defines how fields from the data model should be mapped to properties used by the component.
   * This allows for flexible data binding between the model and the component's display logic. Can be
   * provided as a static object mapping or as a function for dynamic mapping transformations.
   * @type {Record<string, string> | FunctionLike}
   * @default {}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  mapper: Record<string, string> | FunctionLike = {};

  /**
   * @description Available CRUD operations for this component instance.
   * @summary Defines which CRUD operations (Create, Read, Update, Delete) are available
   * for this component. This affects which operations can be performed on the data and
   * which operation buttons are displayed in the UI. By default, only READ operations are enabled.
   * @type {CrudOperations[]}
   * @default [OperationKeys.READ]
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  operations: CrudOperations[] = [OperationKeys.READ];


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
  operation:
  | OperationKeys.CREATE
  | OperationKeys.READ
  | OperationKeys.UPDATE
  | OperationKeys.DELETE = OperationKeys.READ;

  /**
   * @description Row position in a grid-based layout system.
   * @summary Specifies the row position of this component when rendered within a grid-based layout.
   * This property is used for positioning components in multi-row, multi-column layouts and helps
   * establish the component's vertical placement within the grid structure.
   * @type {number}
   * @default 1
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  row: number = 1;


  /**
   * @description Column position in a grid-based layout system.
   * @summary Specifies the column position of this component when rendered within a grid-based layout.
   * This property is used for positioning components in multi-row, multi-column layouts and helps
   * establish the component's horizontal placement within the grid structure.
   * @type {number}
   * @default 1
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  col: number = 1;


  /**
   * @description Additional CSS class names for component styling.
   * @summary Allows custom CSS classes to be added to the component's root element.
   * These classes are appended to any automatically generated classes based on other
   * component properties. Multiple classes can be provided as a space-separated string.
   * This provides a way to customize the component's appearance beyond the built-in styling options.
   * @type {string}
   * @default ""
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  className: string = '';


  /**
   * @description Repository instance for data layer operations.
   * @summary Provides a connection to the data layer for retrieving and manipulating data.
   * This is an instance of the DecafRepository class, initialized lazily in the repository getter.
   * The repository is used to perform CRUD (Create, Read, Update, Delete) operations on the
   * data model and provides methods for querying and filtering data based on specific criteria.
   * @type {DecafRepository<Model>}
   * @private
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected _repository?: DecafRepository<Model>;


  /**
   * @description Ionic menu controller service for menu management.
   * @summary Injected service that provides programmatic control over Ionic menu components.
   * This service allows the component to open, close, toggle, and manage menu states within
   * the application. It provides access to menu functionality for implementing navigation
   * and layout features that require menu interaction.
   * @protected
   * @type {MenuController}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected menuController: MenuController = inject(MenuController);

  /**
   * @description Angular change detection service for manual change detection control.
   * @summary Injected service that provides manual control over change detection cycles.
   * This is essential for ensuring that programmatic DOM changes (like setting accordion
   * attributes) are properly reflected in the component's state and trigger appropriate
   * view updates when modifications occur outside the normal Angular change detection flow.
   * @protected
   * @type {ChangeDetectorRef}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  /**
   * @description Angular Renderer2 service for platform-agnostic DOM manipulation.
   * @summary Injected service that provides a safe, platform-agnostic way to manipulate DOM elements.
   * This service ensures proper handling of DOM operations across different platforms and environments,
   * including server-side rendering and web workers, without direct DOM access.
   * @protected
   * @type {Renderer2}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected renderer: Renderer2 = inject(Renderer2);

  /**
   * @description Translation service for application internationalization.
   * @summary Injected service that provides translation capabilities for UI text.
   * Used to translate button labels, validation messages, and other text content based
   * on the current locale setting, enabling multilingual support throughout the application.
   * @protected
   * @type {TranslateService}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected translateService: TranslateService = inject(TranslateService);


  /**
   * @description Logger instance for structured component logging.
   * @summary Provides logging capabilities for the component, allowing for consistent
   * and structured logging of information, warnings, and errors. This logger is inherited
   * from the LoggedClass and provides access to structured logging functionality.
   * The logger is used throughout the component to record important events, debug information,
   * and potential issues, facilitating easier debugging and maintenance.
   * @type {Logger}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  logger!: Logger;

  /**
   * @description Event emitter for custom component events.
   * @summary Emits custom events that occur within child components or the component itself.
   * This allows parent components to listen for and respond to user interactions or
   * state changes. Events are passed up the component hierarchy to enable coordinated
   * behavior across the application.
   * @type {EventEmitter<IBaseCustomEvent>}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Output()
  listenEvent: EventEmitter<IBaseCustomEvent> = new EventEmitter<IBaseCustomEvent>();

  /**
   * @description Angular Router instance for programmatic navigation.
   * @summary Injected Router service used for programmatic navigation between routes
   * in the application. This service enables navigation to different views and operations,
   * handles route parameters, and manages the browser's navigation history.
   * @protected
   * @type {Router}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected router: Router = inject(Router);


  /**
   * @description Current locale identifier for component internationalization.
   * @summary Specifies the locale code (e.g., 'en-US', 'pt-BR') used for translating UI text
   * and formatting data according to regional conventions. This property can be set to override
   * the default application locale for this specific component instance, enabling per-component
   * localization when needed.
   * @type {string | undefined}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  locale?: string;


  /**
   * @description Configuration for list item rendering behavior.
   * @summary Defines how list items should be rendered in the component.
   * This property holds a configuration object that specifies the tag name
   * and other properties needed to render list items correctly. The tag property
   * identifies which component should be used to render each item in a list.
   * Additional properties can be included to customize the rendering behavior.
   * @type {Record<string, unknown>}
   * @default {tag: ""}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  item: Record<string, unknown> = { tag: '' };

  /**
   * @description Dynamic properties configuration for runtime customization.
   * @summary Contains key-value pairs of dynamic properties that can be applied to the component
   * at runtime. This flexible configuration object allows for dynamic property assignment without
   * requiring explicit input bindings for every possible configuration option. Properties from
   * this object are parsed and applied to the component instance through the parseProps method,
   * enabling customizable component behavior based on external configuration.
   * @type {Record<string, unknown>}
   * @default {}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  props: Record<string, unknown> = {};


  /**
   * @description Base route path for component navigation.
   * @summary Defines the base route path used for navigation actions related to this component.
   * This is often used as a prefix for constructing navigation URLs when transitioning between
   * different operations or views. The route helps establish the component's position in the
   * application's routing hierarchy.
   * @type {string}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  @Input()
  route!: string;


  /**
   * @description Initialization status flag for the component.
   * @summary Tracks whether the component has completed its initialization process.
   * This flag is used to prevent duplicate initialization and to determine if
   * certain operations that require initialization can be performed.
   * @type {boolean}
   * @default false
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  initialized: boolean = false;


  /**
   * @description Component name identifier for logging and localization contexts.
   * @summary Stores the component's name which is used as a key for logging contexts
   * and as a base for locale resolution. Can be injected via the CPTKN token or defaults
   * to "NgxDecafComponentDirective" if not provided.
   * @protected
   * @type {string | undefined}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected componentName?: string;

  /**
   * @description Root key for component locale context resolution.
   * @summary Defines the base key used to resolve localization contexts for this component.
   * If not explicitly provided, it defaults to the component's name. This key is used to
   * load appropriate translation resources and locale-specific configurations.
   * @protected
   * @type {string | undefined}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected localeRoot?: string;

  /**
   * @description Reference to CRUD operation constants for template usage.
   * @summary Exposes the OperationKeys enum to the component template, enabling
   * conditional rendering and behavior based on operation types. This protected
   * readonly property ensures that template logic can access operation constants
   * while maintaining encapsulation and preventing accidental modification.
   * @protected
   * @readonly
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected readonly OperationKeys = OperationKeys;


  /**
   * @description Angular Location service.
   * @summary Injected service that provides access to the browser's URL and history.
   * This service is used for interacting with the browser's history API, allowing
   * for back navigation and URL manipulation outside of Angular's router.
   *
   * @private
   * @type {Location}
   */
  protected location: Location = inject(Location);


  /**
   * @description Constructor for NgxDecafComponentDirective.
   * @summary Initializes the directive by setting up the component name, locale root,
   * and logger. Calls the parent LoggedClass constructor and configures localization
   * context. The component name and locale root can be optionally injected via the
   * CPTKN token, otherwise defaults are used.
   * @param {string} [componentName] - Optional component name for identification and logging
   * @param {string} [localeRoot] - Optional locale root key for internationalization
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(CPTKN) componentName?: string, @Inject(CPTKN) localeRoot?: string) {
		super();
    this.componentName = componentName || "NgxDecafComponentDirective";
    this.localeRoot = localeRoot;
    if(!this.localeRoot && this.componentName)
      this.localeRoot = this.componentName;
    if(this.localeRoot)
      this.getLocale(this.localeRoot);
    this.logger = this.log;
	}

  /**
   * @description Getter for the current locale context identifier.
   * @summary Returns the current locale identifier by calling the getLocale method.
   * This property provides convenient access to the component's active locale setting.
   * @returns {string} The current locale identifier
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  get localeContext(){
		return this.getLocale();
	}

  /**
   * @description Getter for the data repository instance.
   * @summary Lazily initializes and returns the DecafRepository instance for the current model.
   * This getter ensures the repository is created only when needed and reused for subsequent
   * access. It also automatically sets the primary key field if not explicitly configured.
   * @protected
   * @returns {DecafRepository<Model>} The repository instance for the current model
   * @throws {InternalError} If repository initialization fails
   * @memberOf module:lib/engine/NgxDecafComponentDirective
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
   * @description Angular lifecycle hook for handling input property changes.
   * @summary Responds to changes in component input properties, specifically monitoring changes
   * to the model, locale root, and component name properties. When the model changes, it triggers
   * model initialization and locale context updates. When locale-related properties change,
   * it updates the component's locale setting accordingly.
   * @param {SimpleChanges} changes - Object containing the changed properties with their previous and current values
   * @return {void}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
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

  /**
   * @description Translates text phrases using the translation service.
   * @summary Provides a promise-based wrapper around the translation service to translate
   * UI text based on the current locale. Supports both single phrases and arrays of phrases,
   * and accepts optional parameters for template interpolation. When a string parameter is
   * provided, it's automatically converted to an object format for the translation service.
   * @protected
   * @param {string | string[]} phrase - The translation key or array of keys to translate
   * @param {object | string} [params] - Optional parameters for interpolation in translated text
   * @return {Promise<string>} A promise that resolves to the translated text
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected translate(phrase: string | string[], params?: object | string): Promise<string> {
    return new Promise((resolve) => {
      if(typeof params === Primitives.STRING)
        params = {"0": params};
      return resolve(firstValueFrom(this.translateService.get(phrase, (params || {}) as object)));
    });
  }

  /**
   * @description Initializes the component asynchronously with custom logic.
   * @summary Abstract initialization method that can be overridden by child components to perform
   * custom initialization logic. By default, it simply sets the initialized flag to true.
   * Child components can extend this method to load data, configure settings, or perform
   * other setup operations required before the component is fully functional.
   * @protected
   * @param {...unknown[]} args - Variable number of arguments that can be used by child implementations
   * @return {Promise<void>} A promise that resolves when initialization is complete
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async initialize(...args: unknown[]): Promise<void> {
    this.initialized = true;
  }

  /**
   * @description Retrieves or sets the locale context for the component.
   * @summary Gets the locale identifier from the locale context system. If a locale parameter
   * is provided, it updates the localeRoot property and resolves the new locale context.
   * If no locale is currently set, it initializes it from the localeRoot.
   * @protected
   * @param {string} [locale] - Optional locale identifier to set
   * @return {string} The current locale identifier
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected getLocale(locale?: string): string {
    if (locale || !this.locale) {
      if(locale)
        this.localeRoot = locale;
      this.locale = getLocaleContext(this.localeRoot as string)
    }
    return this.locale as string;
  }

  /**
   * @description Retrieves or generates the route path for the component.
   * @summary Gets the navigation route associated with this component. If no route is explicitly
   * set and a model is available, it automatically generates a route based on the model's
   * class name using the pattern `/model/{ModelName}`. Returns an empty string if neither
   * a route nor a model is available.
   * @return {string} The route path for this component
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  getRoute(): string {
    if (!this.route && this.model instanceof Model)
      this.route = `/model/${this.model?.constructor.name}`;
    return this.route || '';
  }

  /**
   * @description Resolves and initializes a model from various input formats.
   * @summary Accepts a model in multiple formats (string name, Model instance, or ModelConstructor)
   * and resolves it to a Model instance. When a string is provided, it looks up the model
   * by name in the Model registry. After resolution, it delegates to setModelDefinitions
   * to complete the model initialization and configuration.
   * @template M - The model type extending from Model
   * @param {string | Model | ModelConstructor<M>} model - The model to resolve and initialize
   * @return {void}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  getModel<M extends Model>(model: string | Model | ModelConstructor<M>): void {
    if (!(model instanceof Model) && typeof model === Primitives.STRING)
      model = Model.get(model as string) as ModelConstructor<M>;
    this.setModelDefinitions(this.model as Model);
  }

  /**
   * @description Configures component properties based on model decorators and metadata.
   * @summary Extracts rendering configuration from the model's decorators using the rendering
   * engine. This includes props, item configuration, and child component definitions. It sets
   * up the mapper for field transformations, configures the item renderer with appropriate
   * properties, and establishes the route for navigation. This method bridges the model's
   * decorator metadata with the component's runtime configuration.
   * @param {Model} model - The model instance to extract definitions from
   * @return {void}
   * @memberOf module:lib/engine/NgxDecafComponentDirective
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
   * The method performs a safe property assignment by checking if each key from the instance
   * exists in the props object before applying it. This prevents accidental property
   * overwriting and ensures only intended properties are modified.
   * @param {KeyValue} instance - The component instance object to process
   * @param {string[]} [skip=[]] - Array of property names to skip during parsing
   * @return {void}
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant D as NgxDecafComponentDirective
   *   participant P as Props Object
   *
   *   C->>D: parseProps(instance, skip)
   *   D->>D: Get Object.keys(instance)
   *   loop For each key in instance
   *     D->>D: Check if key in skip array
   *     alt Key not in skip
   *       D->>P: Check if key exists in this.props
   *       alt Key exists in props
   *         D->>D: Set this[key] = this.props[key]
   *         D->>P: delete this.props[key]
   *       else Key not in props
   *         Note over D: Skip this key
   *       end
   *     end
   *   end
   * @protected
   * @memberOf module:lib/engine/NgxDecafComponentDirective
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
   * @description Tracks items in ngFor loops for optimal change detection performance.
   * @summary Provides a tracking function for Angular's *ngFor directive to optimize rendering
   * performance. This method generates unique identifiers for list items based on their index
   * and content, allowing Angular to efficiently track changes and minimize DOM manipulations
   * during list updates. The tracking function is essential for maintaining component state
   * and preventing unnecessary re-rendering of unchanged items.
   * @protected
   * @param {number} index - The index of the item in the list
   * @param {KeyValue | string | number} item - The item data to track
   * @return {string | number} A unique identifier for the item
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  protected trackItemFn(
    index: number,
    item: KeyValue | string | number
  ): string | number {
    return `${index}-${item}`;
  }

  /**
   * @description Handles custom events from child components or DOM elements.
   * @summary Processes custom events by extracting event handlers and delegating to appropriate
   * handler classes. Supports both CustomEvent format with detail property and direct event
   * objects. If specific handlers are defined in the event, it instantiates the handler class
   * and invokes its handle method. If no handler is found or defined, the event is emitted
   * up the component hierarchy via the listenEvent output.
   * @param {IBaseCustomEvent | ICrudFormEvent | CustomEvent} event - The event to handle
   * @return {Promise<void>} A promise that resolves when event handling is complete
   * @mermaid
   * sequenceDiagram
   *   participant C as Child Component
   *   participant D as NgxDecafComponentDirective
   *   participant H as Event Handler
   *   participant P as Parent Component
   *
   *   C->>D: handleEvent(event)
   *   alt Event is CustomEvent
   *     D->>D: Extract event.detail
   *   end
   *   D->>D: Get event name and handlers
   *   alt Handlers defined
   *     alt Handler exists for event
   *       D->>H: new Handler(router)
   *       D->>H: handle(event)
   *       H-->>D: return result
   *     else No handler found
   *       D->>D: log.debug("No handler found")
   *     end
   *   else No handlers
   *     D->>P: listenEvent.emit(event)
   *   end
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
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

  /**
   * @description Determines if a specific operation is allowed in the current context.
   * @summary This method checks if an operation is included in the list of available
   * CRUD operations and if it's not the current operation (unless the current operation
   * is CREATE). This is used to enable/disable or show/hide operation buttons in the UI.
   * Returns false if the operations array is undefined or the operation is not in the list.
   * @param {string} operation - The operation to check
   * @return {boolean} True if the operation is allowed, false otherwise
   * @mermaid
   * sequenceDiagram
   *   participant D as NgxDecafComponentDirective
   *   participant U as UI
   *
   *   U->>D: isAllowed(operation)
   *   alt operations is undefined
   *     D-->>U: Return false
   *   else
   *     D->>D: Check if operation is in operations
   *     D->>D: Check if operation is not current operation
   *     D-->>U: Return result
   *   end
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  isAllowed(operation: string): boolean {
    if(!this.operations)
      return false;
    return this.operations.includes(operation as CrudOperations) && (this.operation !== OperationKeys.CREATE && ((this.operation || "").toLowerCase() !== operation || !this.operation));
  }


  /**
   * @description Navigates to a different operation for the current model.
   * @summary This method constructs a navigation URL based on the component's base route,
   * the requested operation, and optionally a model ID. It then uses the Angular router
   * service to navigate to the constructed URL. This is typically used when switching
   * between different CRUD operations (create, read, update, delete) on a model.
   * The URL format is: {route}/{operation}/{id?}
   * @param {string} operation - The operation to navigate to (e.g., 'create', 'read', 'update', 'delete')
   * @param {string} [id] - Optional model ID to include in the navigation URL
   * @return {Promise<boolean>} A promise that resolves to true if navigation was successful
   * @mermaid
   * sequenceDiagram
   *   participant U as UI
   *   participant D as NgxDecafComponentDirective
   *   participant R as Router
   *
   *   U->>D: Click operation button
   *   D->>D: changeOperation(operation, id)
   *   D->>D: Construct navigation URL
   *   Note over D: URL: {route}/{operation}/{id?}
   *   D->>R: navigateByUrl(page)
   *   R->>R: Navigate to new route
   *   R-->>D: Return navigation result
   *   D-->>U: Display new operation view
   * @memberOf module:lib/engine/NgxDecafComponentDirective
   */
  async changeOperation(operation: string, id?: string): Promise<boolean> {
    let page = `${this.route}/${operation}/`.replace('//', '/');
    if(!id)
      id = this.modelId as string;
    if(this.modelId)
        page = `${page}${this.modelId || id}`;
    return this.router.navigateByUrl(page);
  }
}
