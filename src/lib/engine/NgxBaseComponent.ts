import { Input, Component, Inject, ViewChild, ElementRef, OnInit, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { getInjectablesRegistry, getLocaleFromClassName } from 'src/lib/helpers/utils';
import { stringToBoolean } from 'src/lib/helpers/string';
import { Model } from '@decaf-ts/decorator-validation';
import { CrudOperations, OperationKeys, Repository } from '@decaf-ts/db-decorators';
import { BaseComponentProps } from './constants';
import { NgxRenderingEngine2 } from './NgxRenderingEngine2';
import { consoleInfo } from '../helpers/logging';

export class PaginatedQuery {
  page!: Model[];
  total!: number;
  _currentPage!: number;
}

const RenderingEngine = NgxRenderingEngine2.get("angular") as unknown as NgxRenderingEngine2;

export type ComponentBaseModel =  Model | Repository<Model> | undefined;


/**
 * @description Base component class that provides common functionality for all Decaf components.
 * @summary The NgxBaseComponent serves as the foundation for all Decaf UI components, providing
 * shared functionality for localization, element references, and styling. This abstract class
 * implements common properties and methods that are used across the component library, ensuring
 * consistent behavior and reducing code duplication. Components that extend this class inherit
 * its capabilities for handling translations, accessing DOM elements, and applying custom styling.
 *
 * @param {string} locale - The locale to be used for translations
 * @param {StringOrBoolean} translatable - Whether the component should be translated
 * @param {string} className - Additional CSS classes to apply to the component
 * @param {"ios" | "md" | undefined} mode - Component platform style
 *
 * @class NgxBaseComponent
 * @memberOf module:DecafEngine
 */

@Component({
  standalone: true,
  template: ""
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
   * @memberOf NgxBaseComponent
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
   * @memberOf NgxBaseComponent
   */
  @Input()
  rendererId!: string;

  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Repository<Model> | undefined}
   * @memberOf NgxBaseComponent
   */
  @Input()
  model!: ComponentBaseModel;

  /**
   * Config for list items rendering
   */
  @Input()
  item: Record<string, unknown> = {tag: ""};

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
  pk: string = 'id';

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
   * @type {[CrudOperations]}
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
   * @memberOf NgxBaseComponent
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
   * @memberOf NgxBaseComponent
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
   * @memberOf NgxBaseComponent
   */
  @Input()
  className: string = "";

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
  mode: "ios" | "md" | undefined = "md";

  /**
   * @description The locale derived from the component's class name.
   * @summary Stores the automatically derived locale based on the component's class name.
   * This is determined during component initialization and serves as a fallback when no
   * explicit locale is provided via the locale input property. The derivation is handled
   * by the getLocaleFromClassName utility function, which extracts a locale identifier
   * from the component's class name.
   *
   * @type {string}
   * @memberOf NgxBaseComponent
   */
  componentLocale!: string;

  @Input()
  renderChild: string | StringOrBoolean = true;

  initialized: boolean = false;

  /**
   * @description Creates an instance of NgxBaseComponent.
   * @summary Initializes a new NgxBaseComponent with the provided instance token.
   * The constructor uses the instance token to derive the component's locale using
   * the getLocaleFromClassName utility function. This derived locale is stored in
   * the componentLocale property and serves as a fallback when no explicit locale
   * is provided.
   *
   * @param {string} instance - The instance token used to derive the component locale
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant N as NgxBaseComponent
   *   participant U as Utils
   *
   *   C->>N: constructor(instanceToken)
   *   N->>U: getLocaleFromClassName(instanceToken)
   *   U-->>N: Return derived locale
   *   N->>N: Store in componentLocale
   *
   * @memberOf NgxBaseComponent
   */
  constructor(@Inject('instanceToken') private instance: string) {
    this.componentName = instance;
    this.componentLocale = getLocaleFromClassName(instance);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes[BaseComponentProps.MODEL]) {
      const { currentValue } = changes[BaseComponentProps.MODEL];
      if(currentValue)
        this.getModel(currentValue);
      this.getLocale(this.translatable);
    }
    if (changes[BaseComponentProps.INITIALIZED] || changes[BaseComponentProps.LOCALE] || changes[BaseComponentProps.TRANSLATABLE])
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
   *
   * @memberOf NgxBaseComponent
   */
  getLocale(translatable: StringOrBoolean): string {
    this.translatable = stringToBoolean(translatable);
    if(!this.translatable)
      return "";
    if(!this.locale)
      this.locale = this.componentLocale;
    return this.locale;
  }

  getRoute(): string {
    if(!this.route && this.model instanceof Model)
      this.route = `/model/${this.model?.constructor.name}`;
    return this.route || "";
  }

  getModel(model: string | Model): void {
    if(!(model instanceof Model))
      this.model = getInjectablesRegistry().get(model) as Model;
    this.setModelDefinitions(this.model as Model);
  }

  setModelDefinitions(model: Model): void {
    if(model instanceof Model) {
      this.getRoute();
      const {props, item} = RenderingEngine.getDecorators(this.model as Model, {});
      this.mapper = item?.props!["mapper"] || {};
      this.item = {
       tag: item?.tag || "",
       ... props,
       ... item?.props,
       mapper: this.mapper,
       ... {route: item?.props!["route"]
        || this.route}
      };
    }
  }

  initialize(): void {
    if(this.initialized)
      return;
    this.initialized = true;
    consoleInfo(this, `${this.componentName} Initialized`);
  }

}
