import {
  Input,
  Component,
  Inject,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import {
  getInjectablesRegistry,
  getLocaleFromClassName,
} from 'src/lib/helpers/utils';
import { stringToBoolean } from 'src/lib/helpers/utils';
import { Model } from '@decaf-ts/decorator-validation';
import {
  CrudOperations,
  OperationKeys,
  Repository,
} from '@decaf-ts/db-decorators';
import { BaseComponentProps } from './constants';
import { NgxRenderingEngine2 } from './NgxRenderingEngine2';
import { Logger } from '@decaf-ts/logging';
import { getLogger } from '../for-angular.module';

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
 *   participant Engine as NgxRenderingEngine2
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
  template: '',
})
export abstract class NgxBaseComponent implements OnChanges {
  /**
   * @description Reference to the component's element.
   * @summary Provides direct access to the native DOM element of the component through Angular's
   * ViewChild decorator. This reference can be used to manipulate the DOM element directly,
   * apply custom styles, or access native element properties and methods. The element is
   * identified by the 'component' template reference variable.
   *
   * @type {ElementRef}
   */
  @ViewChild('component', { read: ElementRef, static: true })
  component!: ElementRef;

  componentName!: string;

  /**
   * @description Unique identifier for the renderer.
   * @summary A unique identifier used to reference the component's renderer instance.
   * This can be used for targeting specific renderer instances when multiple components
   * are present on the same page.
   *
   * @type {string}
   */
  @Input()
  rendererId!: string;

  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   */
  @Input()
  model!:  Model | undefined;;

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
   */
  @Input()
  pk: string = 'id';

  /**
   * @description Base route for navigation related to this component.
   * @summary Defines the base route path used for navigation actions related to this component.
   * This is often used as a prefix for constructing navigation URLs.
   *
   * @type {string}
   */
  @Input()
  route!: string;

  /**
   * @description Available CRUD operations for this component.
   * @summary Defines which CRUD operations (Create, Read, Update, Delete) are available
   * for this component. This affects which operations can be performed on the data.
   *
   * @default [OperationKeys.READ]
   */
  @Input()
  operations: CrudOperations[] = [OperationKeys.READ];

  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   */
  @Input()
  uid!: string | number;

  /**
   * @description Field mapping configuration.
   * @summary Defines how fields from the data model should be mapped to properties used by the component.
   * This allows for flexible data binding between the model and the component's display logic.
   *
   * @type {Record<string, string>}
   */
  @Input()
  mapper!: Record<string, string>;

  /**
   * @description The locale to be used for translations.
   * @summary Specifies the locale identifier to use when translating component text.
   * This can be set explicitly via input property to override the automatically derived
   * locale from the component name. The locale is typically a language code (e.g., 'en', 'fr')
   * or a language-region code (e.g., 'en-US', 'fr-CA') that determines which translation
   * set to use for the component's text content.
   *
   * @type {string}
   */
  @Input()
  locale!: string;

  /**
   * @description Determines if the component should be translated.
   * @summary Controls whether the component's text content should be processed for translation.
   * When true, the component will attempt to translate text using the specified locale.
   * When false, text is displayed as-is without translation. This property accepts either
   * a boolean value or a string that can be converted to a boolean (e.g., 'true', 'false', '1', '0').
   *
   * @type {StringOrBoolean}
   * @default false
   */
  @Input()
  translatable: StringOrBoolean = false;

  /**
   * @description Additional CSS class names to apply to the component.
   * @summary Allows custom CSS classes to be added to the component's root element.
   * These classes are appended to any automatically generated classes based on other
   * component properties. Multiple classes can be provided as a space-separated string.
   * This provides a way to customize the component's appearance beyond the built-in styling options.
   *
   * @type {string}
   * @default ""
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
   */
  @Input()
  mode: 'ios' | 'md' | undefined = 'md';

  /**
   * @description The locale derived from the component's class name.
   * @summary Stores the automatically derived locale based on the component's class name.
   * This is determined during component initialization and serves as a fallback when no
   * explicit locale is provided via the locale input property. The derivation is handled
   * by the getLocaleFromClassName utility function, which extracts a locale identifier
   * from the component's class name.
   *
   * @type {string}
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
   */
  @Input()
  renderChild: string | StringOrBoolean = true;

  /**
   * @description Flag indicating if the component has been initialized
   * @summary Tracks whether the component has completed its initialization process.
   * This flag is used to prevent duplicate initialization and to determine if
   * certain operations that require initialization can be performed.
   *
   * @type {boolean}
   * @default false
   */
  initialized: boolean = false;

  /**
   * @description Reference to the rendering engine instance
   * @summary Provides access to the NgxRenderingEngine2 singleton instance,
   * which handles the rendering of components based on model definitions.
   * This engine is used to extract decorator metadata and render child components.
   *
   * @type {NgxRenderingEngine2}
   */
  renderingEngine: NgxRenderingEngine2 =
    NgxRenderingEngine2.get() as unknown as NgxRenderingEngine2;

  /**
   * @description Logger instance for the component.
   * @summary Provides logging capabilities for the component, allowing for consistent
   * and structured logging of information, warnings, and errors. This logger is initialized
   * in the ngOnInit method using the getLogger function from the ForAngularModule.
   *
   * The logger is used throughout the component to record important events, debug information,
   * and potential issues. It helps in monitoring the component's behavior, tracking the flow
   * of operations, and facilitating easier debugging and maintenance.
   *
   * @type {Logger}
   * @private
   * @memberOf NgxBaseComponent
   */
  logger!: Logger;

  protected constructor(@Inject('instanceToken') private instance: string) {
    this.componentName = instance;
    this.componentLocale = getLocaleFromClassName(instance);
    this.logger = getLogger(this);
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
    if (!this.translatable) return '';
    if (!this.locale) this.locale = this.componentLocale;
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
      const { props, item } = this.renderingEngine.getDecorators(
        this.model as Model,
        {}
      );
      this.mapper = item?.props!['mapper'] || {};
      this.item = {
        tag: item?.tag || '',
        ...props,
        ...item?.props,
        mapper: this.mapper,
        ...{ route: item?.props!['route'] || this.route },
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
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
  }
}
