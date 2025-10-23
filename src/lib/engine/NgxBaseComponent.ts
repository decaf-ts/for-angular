import {
  Input,
  Inject,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
  Component,
} from '@angular/core';
import { KeyValue, StringOrBoolean } from './types';
import {
  generateRandomValue,
  getInjectablesRegistry,
  stringToBoolean,
} from '../helpers/utils';
import { getLocaleContext } from '../i18n/Loader';
import { Model } from '@decaf-ts/decorator-validation';
import {
  CrudOperations,
  InternalError,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import { BaseComponentProps } from './constants';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { getModelRepository } from '../for-angular-common.module';
import { DecafRepository, FunctionLike } from './types';
import { NgxDecafComponent } from './NgxDecafComponent';

/**
 * @description Base component class that provides common functionality for all Decaf components.
 * @summary The NgxBaseComponent serves as the foundation for all Decaf UI components, providing
 * shared functionality for localization, element references, and styling. This abstract class
 * implements common properties and methods that are used across the component library, ensuring
 * consistent behavior and reducing code duplication. Components that extend this class inherit
 * its capabilities for handling translations, accessing DOM elements, and applying custom styling.
 *
 * @template M - The model type that this component works with
 * @param {string} instance - The component instance token used for identification
 * @param {string} locale - The locale to be used for translations
 * @param {StringOrBoolean} translatable - Whether the component should be translated
 * @param {string} className - Additional CSS classes to apply to the component
 * @param {"ios" | "md" | undefined} mode - Component platform style
 *
 * @component NgxBaseComponent
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-my-component',
 *   templateUrl: './my-component.component.html',
 *   styleUrls: ['./my-component.component.scss']
 * })
 * export class MyComponent extends NgxBaseComponent {
 *   constructor(@Inject('instanceToken') instance: string) {
 *     super(instance);
 *   }
 *
 *   ngOnInit() {
 *     this.initialize();
 *     // Component-specific initialization
 *   }
 * }
 * ```
 * @mermaid
 * sequenceDiagram
 *   participant App as Application
 *   participant Comp as Component
 *   participant Base as NgxBaseComponent
 *   participant Engine as NgxRenderingEngine
 *
 *   App->>Comp: Create component
 *   Comp->>Base: super(instance)
 *   Base->>Base: Set componentName & componentLocale
 *
 *   App->>Comp: Set @Input properties
 *   Comp->>Base: ngOnChanges(changes)
 *
 *   alt model changed
 *     Base->>Base: getModel(model)
 *     Base->>Engine: getDecorators(model, {})
 *     Engine-->>Base: Return decorator metadata
 *     Base->>Base: Configure mapper and item
 *     Base->>Base: getLocale(translatable)
 *   else locale/translatable changed
 *     Base->>Base: getLocale(translatable)
 *   end
 *
 *   App->>Comp: ngOnInit()
 *   Comp->>Base: initialize()
 *   Base->>Base: Set initialized flag
 */
@Component({
  standalone: true,
  template: '<div></div>',
  host: { '[attr.id]': 'uid' },
})
export abstract class NgxBaseComponent extends NgxDecafComponent implements OnChanges {
  /**
   * @description Reference to the component's element.
   * @summary Provides direct access to the native DOM element of the component through Angular's
   * ViewChild decorator. This reference can be used to manipulate the DOM element directly,
   * apply custom styles, or access native element properties and methods. The element is
   * identified by the 'component' template reference variable.
   *
   * @type {ElementRef}
   * @memberOf NgxBaseComponent
   */
  @ViewChild('component', { read: ElementRef, static: true })
  component!: ElementRef;

  /**
   * @description Unique identifier for the renderer.
   * @summary A unique identifier used to reference the component's renderer instance.
   * This can be used for targeting specific renderer instances when multiple components
   * are present on the same page.
   *
   * @type {string}
   * @memberOf NgxBaseComponent
   */
  @Input()
  rendererId!: string;



   /**
   * @description The display name or title of the fieldset section.
   * @summary Sets the legend or header text that appears in the accordion header. This text
   * provides a clear label for the collapsible section, helping users understand what content
   * is contained within. The name is displayed prominently and serves as the clickable area
   * for expanding/collapsing the fieldset.
   *
   * @type {string}
   * @memberOf NgxBaseComponent
   */
  @Input()
  name?: string;

    /**
   * @description The parent component identifier for hierarchical fieldset relationships.
   * @summary Specifies the parent component name that this fieldset belongs to in a hierarchical
   * form structure. This property is used for event bubbling and establishing parent-child
   * relationships between fieldsets in complex forms with nested structures.
   *
   * @type {string}
   * @default 'Child'
   * @memberOf FieldsetComponent
   */
  @Input()
  childOf?: string;



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
   * @memberOf NgxBaseComponent
   */
  protected _repository?: DecafRepository<Model>;

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
   * @memberOf NgxBaseComponent
   */
  @Input()
  props: Record<string, unknown> = {};

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
   * @memberOf NgxBaseComponent
   */
  @Input()
  item: Record<string, unknown> = { tag: '' };

  /**
   * @description Primary key field name for the model.
   * @summary Specifies which field in the model should be used as the primary key.
   * This is typically used for identifying unique records in operations like update and delete.
   *
   * @type {string}
   * @default 'id'
   * @memberOf NgxBaseComponent
   */
  @Input()
  pk!: string;

  /**
   * @description Base route for navigation related to this component.
   * @summary Defines the base route path used for navigation actions related to this component.
   * This is often used as a prefix for constructing navigation URLs.
   *
   * @type {string}
   * @memberOf NgxBaseComponent
   */
  @Input()
  route!: string;

  /**
   * @description Available CRUD operations for this component.
   * @summary Defines which CRUD operations (Create, Read, Update, Delete) are available
   * for this component. This affects which operations can be performed on the data.
   *
   * @default [OperationKeys.READ]
   * @memberOf NgxBaseComponent
   */
  @Input()
  operations: CrudOperations[] = [OperationKeys.READ];

  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   * @memberOf NgxBaseComponent
   */
  @Input()
  uid!: string | number;

  /**
   * @description Field mapping configuration.
   * @summary Defines how fields from the data model should be mapped to properties used by the component.
   * This allows for flexible data binding between the model and the component's display logic.
   *
   * @type {Record<string, string>}
   * @memberOf NgxBaseComponent
   */
  @Input()
  mapper: Record<string, string> | FunctionLike = {};


  /**
   * @description Determines if the component should be translated.
   * @summary Controls whether the component's text content should be processed for translation.
   * When true, the component will attempt to translate text using the specified locale.
   * When false, text is displayed as-is without translation. This property accepts either
   * a boolean value or a string that can be converted to a boolean (e.g., 'true', 'false', '1', '0').
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf NgxBaseComponent
   */
  @Input()
  translatable: StringOrBoolean = true;

  /**
   * @description Additional CSS class names to apply to the component.
   * @summary Allows custom CSS classes to be added to the component's root element.
   * These classes are appended to any automatically generated classes based on other
   * component properties. Multiple classes can be provided as a space-separated string.
   * This provides a way to customize the component's appearance beyond the built-in styling options.
   *
   * @type {string}
   * @default ""
   * @memberOf NgxBaseComponent
   */
  @Input()
  className: string = '';

  /**
   * @description Component platform style.
   * @summary Controls the visual appearance of the component based on platform design guidelines.
   * The 'ios' mode follows iOS design patterns, while 'md' (Material Design) follows Android/Google
   * design patterns. This property affects various visual aspects such as animations, form elements,
   * and icons. Setting this property allows components to maintain platform-specific styling
   * for a more native look and feel.
   *
   * @type {("ios" | "md" | undefined)}
   * @default "md"
   * @memberOf NgxBaseComponent
   */
  @Input()
  mode: 'ios' | 'md' | undefined = 'md';

  /**
   * @description The locale derived from the component's class name.
   * @summary Stores the automatically derived locale based on the component's class name.
   * This is determined during component initialization and serves as a fallback when no
   * explicit locale is provided via the locale input property. The derivation is handled
   * by the getLocaleContext utility function, which extracts a locale identifier
   * from the component's class name.
   *
   * @type {string}
   * @memberOf NgxBaseComponent
   */
  componentLocale!: string;

  /**
   * @description Controls whether child components should be rendered
   * @summary Determines if child components should be rendered by the component.
   * This can be set to a boolean value or a string that can be converted to a boolean.
   * When true, child components defined in the model will be rendered. When false,
   * child components will be skipped. This provides control over the rendering depth.
   *
   * @type {string | StringOrBoolean}
   * @default true
   * @memberOf NgxBaseComponent
   */
  @Input()
  renderChild: string | StringOrBoolean = true;



  /**
   * @description Reference to the rendering engine instance
   * @summary Provides access to the NgxRenderingEngine singleton instance,
   * which handles the rendering of components based on model definitions.
   * This engine is used to extract decorator metadata and render child components.
   *
   * @type {NgxRenderingEngine}
   */
  renderingEngine: NgxRenderingEngine =
    NgxRenderingEngine.get() as unknown as NgxRenderingEngine;


  /**
   * @description Creates an instance of NgxBaseComponent.
   * @summary Initializes a new instance of the base component with the provided instance token.
   * This constructor sets up the fundamental properties required by all Decaf components,
   * including the component name, locale settings, and logging capabilities. The instance
   * token is used for component identification and locale derivation.
   *
   * The constructor performs the following initialization steps:
   * 1. Sets the componentName from the provided instance token
   * 2. Derives the componentLocale from the class name using utility functions
   * 3. Initializes the logger instance for the component
   *
   * @param {string} instance - The component instance token used for identification
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular
   *   participant C as Component
   *   participant B as NgxBaseComponent
   *   participant U as Utils
   *   participant L as Logger
   *
   *   A->>C: new Component(instance)
   *   C->>B: super(instance)
   *   B->>B: Set componentName = instance
   *   B->>U: getLocaleContext(instance)
   *   U-->>B: Return derived locale
   *   B->>B: Set componentLocale
   *   B->>L: getLogger(this)
   *   L-->>B: Return logger instance
   *   B->>B: Set logger
   *
   * @memberOf NgxBaseComponent
   */
  // eslint-disable-next-line @angular-eslint/prefer-inject
  protected constructor(@Inject('instanceToken') protected instance: string) {
    super();
    this.componentName = instance;
    this.componentLocale = getLocaleContext(instance);
    this.getLocale(this.translatable);
    this.uid = generateRandomValue(12);
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
   * @memberOf NgxBaseComponent
   */
  protected get repository(): DecafRepository<Model> {
    try {
      if (!this._repository) {
        this._repository = getModelRepository(this.childOf || this.model as Model);
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
      if (currentValue) this.getModel(currentValue);
      this.getLocale(this.translatable);
    }
    if (
      changes[BaseComponentProps.INITIALIZED] ||
      changes[BaseComponentProps.LOCALE] ||
      changes[BaseComponentProps.TRANSLATABLE]
    )
    this.getLocale(this.translatable);
  }

  /**
   * @description Gets the appropriate locale string based on the translatable flag and available locales.
   * @summary Determines which locale string to use for translation based on the translatable flag
   * and available locale settings. This method first converts the translatable parameter to a boolean
   * using the stringToBoolean utility function. If translatable is false, it returns an empty string,
   * indicating no translation should be performed. If translatable is true, it checks for an explicitly
   * provided locale via the locale property. If no explicit locale is available, it falls back to the
   * componentLocale derived from the component's class name.
   *
   * @param {StringOrBoolean} translatable - Whether the component should be translated
   * @return {string} The locale string to use for translation, or empty string if not translatable
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant N as NgxBaseComponent
   *   participant S as StringUtils
   *
   *   C->>N: getLocale(translatable)
   *   N->>S: stringToBoolean(translatable)
   *   S-->>N: Return boolean value
   *   N->>N: Store in this.translatable
   *   alt translatable is false
   *     N-->>C: Return empty string
   *   else translatable is true
   *     alt this.locale is defined
   *       N-->>C: Return this.locale
   *     else this.locale is not defined
   *       N-->>C: Return this.componentLocale
   *     end
   *   end
   */
  getLocale(translatable: StringOrBoolean): string {
    this.translatable = stringToBoolean(translatable);
    if (!this.translatable)
      return '';
    if (!this.locale)
      this.locale = this.componentLocale;
    return this.locale;
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
  getModel(model: string | Model): void {
    if (!(model instanceof Model))
      this.model = getInjectablesRegistry().get(model) as Model;
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
      const field = this.renderingEngine.getDecorators(this.model as Model, {});
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
   * @description Initializes the component
   * @summary Performs one-time initialization of the component. This method checks if
   * the component has already been initialized to prevent duplicate initialization.
   * When called for the first time, it sets the initialized flag to true and logs
   * an initialization message with the component name. This method is typically called
   * during the component's lifecycle setup.
   */
  async initialize(parseProps: boolean = true, skip?: string[]): Promise<void> {
    if(!this.initialized && parseProps)
      return this.parseProps(this, skip || []);
    this.initialized = true;
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
   *   participant B as NgxBaseComponent
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
   * @memberOf NgxBaseComponent
   */
  protected parseProps(instance: KeyValue, skip: string[]): void {
    Object.keys(instance).forEach((key) => {
      if (Object.keys(this.props).includes(key) && !skip.includes(key)) {
        (this as KeyValue)[key] = this.props[key];
        delete this.props[key];
      }
    });
    if(!this.initialized)
      this.initialized = true;
  }
}
