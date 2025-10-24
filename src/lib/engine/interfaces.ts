/**
 * @module module:lib/engine/interfaces
 * @description Type and interface definitions used by the Angular rendering engine.
 * @summary Exposes interfaces for component input metadata, rendering outputs, form events,
 * and supporting types used across the engine and components.
 *
 * @link {@link AngularDynamicOutput}
 */
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { ElementRef, EnvironmentInjector, Injector, Type } from '@angular/core';
import { OrderDirection } from '@decaf-ts/core';
import { AngularFieldDefinition, FieldUpdateMode, KeyValue, StringOrBoolean } from './types';
import { CrudOperationKeys, FieldProperties } from '@decaf-ts/ui-decorators';
import { FormParent } from './types';
import { Model } from '@decaf-ts/decorator-validation';


/**
 * @description Interface for models that can be rendered
 * @summary Defines the basic structure for models that can be rendered by the engine.
 * Contains an optional rendererId that uniquely identifies the rendered instance.
 * @interface IRenderedModel
 * @property {string} [rendererId] - Optional unique ID for the rendered model instance
 * @memberOf module:engine
 */
export interface IRenderedModel {
  rendererId?: string;
}


/**
 * @description Interface for components that hold an ElementRef
 * @summary Defines a component holder interface that provides access to the underlying DOM element through ElementRef
 * @interface IComponentHolder
 * @memberOf module:engine
 */
export interface IComponentHolder {
  /**
   * @description Reference to the component's DOM element
   * @property {ElementRef} component - The ElementRef instance providing access to the native DOM element
   */
  component: ElementRef;
}

/**
 * @description Interface for form components that hold both an ElementRef and a FormGroup
 * @summary Extends IComponentHolder to include a FormGroup for form handling capabilities
 * @interface IFormElement
 * @memberOf module:engine
 */
export interface IFormElement extends IComponentHolder {
  /**
   * @description The Angular FormGroup associated with this form element
   * @property {FormGroup|undefined} formGroup - The form group instance for managing form controls and validation
   */
  formGroup: FormParent | undefined;
}


/**
 * @description Interface for fieldset item representation in the UI.
 * @summary Defines the structure for items displayed in the reorderable list within the fieldset.
 * Each item represents a value added to the fieldset with display properties for the UI.
 * @memberOf module:engine
 */
export interface IFieldSetItem {
  /** @description Sequential index number for ordering items in the list */
  index: number;
  /** @description Primary display text for the item */
  title: string;
  /** @description Optional secondary text providing additional item details */
  description?: string;
}

/**
 * @description Interface for fieldset validation event data.
 * @summary Defines the structure of validation events emitted when form validation occurs.
 * Used for communication between form components and the fieldset container.
 * @memberOf module:engine
 */
export interface IFieldSetValidationEvent {
  /** @description The FormGroup containing the validated form controls */
  formGroup:  FormArray | FormGroup;
  /** @description The current form value being validated */
  value: unknown;
  /** @description Whether the form validation passed or failed */
  isValid: boolean;
}


/**
 * @description Interface for individual filter query items
 * @summary Defines the structure of a single filter criterion in a filter query.
 * Each item represents one condition to be applied to the data, consisting of
 * an index (field name), a condition (comparison operator), and a value to compare against.
 * @interface IFilterQueryItem
 * @property {string} [index] - Optional field name or index to filter on
 * @property {string} [condition] - Optional comparison condition (e.g., 'Equal', 'Contains', 'Greater Than')
 * @property {string} [value] - Optional value to compare the field against
 * @memberOf module:engine
 */
export interface IFilterQueryItem {
  index?: string,
  condition?: string,
  value?: string
};

/**
 * @description Interface for sorting configuration objects
 * @summary Defines the structure for specifying sort criteria including the field
 * to sort by and the direction of the sort (ascending or descending).
 * @interface ISortObject
 * @property {string} value - The field name or property to sort by
 * @property {OrderDirection} direction - The sort direction (ASC or DSC)
 * @memberOf module:engine
 */
export interface ISortObject {
  value: string,
  direction: OrderDirection
};

/**
 * @description Interface for complete filter query configuration
 * @summary Defines the complete structure for filter and sort operations.
 * Combines multiple filter criteria with sorting configuration to provide
 * comprehensive data filtering and ordering capabilities.
 * @interface IFilterQuery
 * @property {IFilterQueryItem[] | undefined} query - Array of filter criteria or undefined for no filtering
 * @property {ISortObject} sort - Sorting configuration specifying field and direction
 * @memberOf module:engine
 */
export interface IFilterQuery {
  query: IFilterQueryItem[] | undefined,
  sort: ISortObject
}


/**
 * @description Component input properties
 * @summary Extends FieldProperties with additional properties specific to Angular components.
 * Includes update mode for form controls and optional FormGroup and FormControl references.
 * @interface IComponentInput
 * @property {FieldUpdateMode} [updateMode] - When the field value should be updated
 * @property {FormGroup} [formGroup] - Optional FormGroup reference
 * @property {FormControl} [formControl] - Optional FormControl reference
 * @memberOf module:engine
 */
export interface IComponentInput extends FieldProperties {
  updateMode?: FieldUpdateMode;
  formGroup?: FormGroup;
  formControl?: FormControl;
  model?: Model | string;
  operation?: CrudOperationKeys | undefined;
}



/**
 * @description Component configuration structure
 * @summary Defines the configuration for dynamically creating Angular components.
 * Contains the component name, input properties, injector, and optional child components.
 * @interface IComponentConfig
 * @property {string} component - The name of the component to render
 * @property {IComponentInput} inputs - The input properties for the component
 * @property {EnvironmentInjector | Injector} injector - The Angular injector for dependency injection
 * @property {IComponentConfig[]} [children] - Optional child component configurations
 * @memberOf module:engine
 */
export interface IComponentConfig {
  component: string;
  inputs: IComponentInput;
  injector: EnvironmentInjector | Injector;
  children?: IComponentConfig[];
}

/**
 * @description Metadata structure for Angular components
 * @summary Defines the structure of metadata for Angular components, including
 * change detection strategy, selector, standalone status, imports, template, and styles.
 * This is used for reflection and dynamic component creation.
 * @interface ComponentMetadata
 * @property {number} changeDetection - The change detection strategy number
 * @property {string} selector - The CSS selector for the component
 * @property {boolean} standalone - Whether the component is standalone
 * @property imports - Array of imported modules/components
 * @property {string} template - The HTML template for the component
 * @property {string[]} styles - Array of CSS styles for the component
 * @memberOf module:engine
 */
export interface ComponentMetadata {
  changeDetection: number;
  selector: string;
  standalone: boolean;
  imports: (new (...args: unknown[]) => unknown)[];
  template: string;
  styles: string[];
}


/**
 * @description Output structure from the Angular rendering engine
 * @summary Defines the structure of the output produced by the NgxRenderingEngine
 * when rendering a component. Contains the component type, inputs, injector,
 * content nodes, and child components.
 * @typedef {Object} AngularDynamicOutput
 * @property {Type<unknown>} component - The Angular component type
 * @property {string} [rendererId] - Optional unique ID for the rendered component
 * @property {Record<string, unknown>} [inputs] - Optional input properties for the component
 * @property {Injector} [injector] - Optional Angular injector for dependency injection
 * @property {Node[][]} [content] - Optional content nodes for projection
 * @property {AngularDynamicOutput[]} [children] - Optional child components
 * @property {Type<unknown>} [instance] - Optional component instance
 * @property {FormGroup} [formGroup] - Optional component FormGroup
 * @property {FormControl} [formControl] - Optional component FormControl
 * @memberOf module:engine
 */
export interface AngularDynamicOutput {
  component?: Type<unknown>;
  rendererId?: string;
  inputs?: Record<string, unknown>;
  injector?: Injector;
  content?: Node[][];
  children?: AngularDynamicOutput[];
  instance?: Type<unknown>;
  formGroup?: FormGroup;
  formControl?: FormControl;
  projectable?: boolean;
}


/**
 * @description Base option type for input components
 * @summary Defines the common structure for options used in select, radio, and checkbox inputs.
 * Contains properties for the display text, value, disabled state, CSS class, and icon.
 * @interface InputOption
 * @property {string} text - The display text for the option
 * @property {string|number} value - The value associated with the option
 * @property {StringOrBoolean} [disabled] - Whether the option is disabled
 * @property {string} [className] - CSS class name for styling the option
 * @property {string} [icon] - Icon to display with the option
 * @memberOf module:engine
 */
export interface InputOption {
  text: string;
  value: string | number;
  disabled?: StringOrBoolean;
  className?: string;
  icon?: string;
}

/**
 * @description Interface for list component refresh events
 * @summary Defines the structure of a refresh event for list components.
 * Contains an array of key-value pairs representing the new data for the list.
 * @interface IListComponentRefreshEvent
 * @property {KeyValue[]} data - Array of key-value pairs representing the new data
 * @memberOf module:engine
 */
export interface IListComponentRefreshEvent {
  data: KeyValue[];
}


/**
 * @description Form service control structure
 * @summary Defines the structure for a form control managed by the form service.
 * Contains the FormGroup control and the associated field properties for rendering.
 * @interface FormServiceControl
 * @property {FormGroup} control - The Angular FormGroup for the control
 * @property {AngularFieldDefinition} props - The field properties for rendering the control
 * @memberOf module:engine
 */
export interface FormServiceControl {
  control: FormGroup;
  props: AngularFieldDefinition;
}


/**
 * @description Interface for list item custom events
 * @summary Defines the structure of custom events triggered by list items.
 * Extends IBaseCustomEvent with additional properties for the action and primary key.
 * @interface ListItemCustomEvent
 * @property {string} action - The action performed on the list item
 * @property {string} [pk] - Optional primary key of the affected item
 * @property {any} data - The data associated with the event (inherited from IBaseCustomEvent)
 * @property {HTMLElement} [target] - The target element (inherited from IBaseCustomEvent)
 * @property {string} [name] - The name of the event (inherited from IBaseCustomEvent)
 * @property {string} component - The component that triggered the event (inherited from IBaseCustomEvent)
 * @memberOf module:engine
 */
export interface ListItemCustomEvent extends IBaseCustomEvent {
  action: string;
  pk?: string;
}


/**
 * @description Base interface for custom events
 * @summary Defines the base structure for custom events in the application.
 * Contains properties for the event data, target element, name, and component.
 * @interface IBaseCustomEvent
 * @property {any} data - The data associated with the event
 * @property {HTMLElement} [target] - The target element that triggered the event
 * @property {string} [name] - The name of the event
 * @property {string} component - The component that triggered the event
 * @memberOf module:engine
 */
export interface IBaseCustomEvent {
  name: string;
  component?: string;
  data?: unknown;
  target?: HTMLElement;
}


/**
 * Configuration for internationalization (i18n) resource file paths.
 *
 * @property prefix - The prefix to be used for the resource file path.
 * @property suffix - The suffix to be appended to the resource file path.
 */
export interface I18nResourceConfig { prefix: string, suffix: string }


/**
 * @description CRUD form event type
 * @summary Extends IBaseCustomEvent to include optional handlers for CRUD form operations.
 * This event type is used for form-related actions like create, read, update, and delete operations.
 * @typedef ICrudFormEvent
 * @property {Record<string, any>} [handlers] - Optional handlers for form operations
 * @memberOf module:engine
 */
export interface ICrudFormEvent extends IBaseCustomEvent {
  handlers?: Record<string, unknown>;
};

/**
 * @description Pagination custom event
 * @summary Event emitted by pagination components to signal page navigation.
 * Extends IBaseCustomEvent and carries a payload with the target page number and navigation direction.
 * @interface IPaginationCustomEvent
 * @memberOf module:engine
 */
export interface IPaginationCustomEvent extends IBaseCustomEvent {
  data: {
    page: number;
    direction: 'next' | 'previous';
  };
}

/**
 * @description Menu item definition
 * @summary Represents a single item in a navigation or contextual menu.
 * Includes the visible label and optional metadata such as accessibility title, target URL, icon, and color.
 * @interface IMenuItem
 * @memberOf module:engine
 */
export interface IMenuItem {
  label: string;
  title?: string;
  url?: string;
  icon?: string;
  color?: string;
}


export interface IFormReactiveSubmitEvent {
  data: Record<string, unknown>;
}

export interface ICrudFormOptions {
  buttons: {
    submit: {
      icon?: string;
      iconSlot?: 'start' | 'end';
      text?: string;
    };
    clear?: {
      icon?: string;
      iconSlot?: 'start' | 'end';
      text?: string;
    };
  };
}


export interface IListEmptyResult {
  title: string;
  subtitle: string;
  showButton: boolean;
  buttonText: string;
  link: string;
  icon: string;
}
