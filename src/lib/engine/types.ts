import { IonCheckbox, IonInput, IonSelect, IonTextarea } from '@ionic/angular';
import { TextFieldTypes } from '@ionic/core';
import { Injector, Type } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

export type KeyValue = Record<string, any>;

/**
 * @description Element size options for UI components
 * @summary Defines the possible size values that can be applied to UI elements.
 * These sizes control the dimensions and layout behavior of components.
 * @typedef {('small'|'medium'|'large'|'xlarge'|'2xlarge'|'auto'|'expand'|'block')} ElementSizes
 * @memberOf module:engine
 */
export type ElementSizes =
  | 'small'
  | 'medium'
  | 'large'
  | 'xlarge'
  | '2xlarge'
  | 'auto'
  | 'expand'
  | 'block';

/**
 * @description Basic position options for UI elements
 * @summary Defines the possible position values that can be applied to UI elements.
 * These positions control the alignment and placement of components.
 * @typedef {('left'|'center'|'right'|'top'|'bottom')} ElementPositions
 * @memberOf module:engine
 */
export type ElementPositions = 'left' | 'center' | 'right' | 'top' | 'bottom';

/**
 * @description Extended position options for flex layouts
 * @summary Extends the basic ElementPositions with additional flex-specific position values.
 * These positions are used for controlling alignment and distribution in flex containers.
 * @typedef {(ElementPositions|'stretch'|'middle'|'around'|'between')} FlexPositions
 * @memberOf module:engine
 */
export type FlexPositions =
  | ElementPositions
  | 'stretch'
  | 'middle'
  | 'around'
  | 'between';

/**
 * @description Update mode options for form fields
 * @summary Defines when form field values should be updated in the model.
 * - 'change': Update on every change event
 * - 'blur': Update when the field loses focus
 * - 'submit': Update only when the form is submitted
 * @typedef {('change'|'blur'|'submit')} FieldUpdateMode
 * @memberOf module:engine
 */
export type FieldUpdateMode = 'change' | 'blur' | 'submit';

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
export type AngularDynamicOutput = {
  component: Type<unknown>;
  rendererId?: string;
  inputs?: Record<string, unknown>;
  injector?: Injector;
  content?: Node[][];
  children?: AngularDynamicOutput[];
  instance?: Type<unknown>;
  formGroup?: FormGroup;
  formControl?: FormControl;
};

/**
 * @description Interface for models that can be rendered
 * @summary Defines the basic structure for models that can be rendered by the engine.
 * Contains an optional rendererId that uniquely identifies the rendered instance.
 * @interface RenderedModel
 * @property {string} [rendererId] - Optional unique ID for the rendered model instance
 * @memberOf module:engine
 */
export interface RenderedModel {
  rendererId?: string;
}

/**
 * @description Possible input types for form fields
 * @summary Defines the possible input types that can be used in form fields.
 * Includes standard HTML input types like checkbox, radio, and select,
 * as well as Ionic's TextFieldTypes and textarea.
 * @typedef {('checkbox'|'radio'|'select'|TextFieldTypes|'textarea')} PossibleInputTypes
 * @memberOf module:engine
 */
export type PossibleInputTypes =
  | 'checkbox'
  | 'radio'
  | 'select'
  | TextFieldTypes
  | 'textarea';

/**
 * @description Field definition for Angular components
 * @summary A comprehensive type that combines properties from various Ionic components
 * to define the structure of a field in an Angular form. It omits certain properties
 * from IonInput, picks specific properties from IonSelect, IonTextarea, and IonCheckbox,
 * and adds custom properties like type and className.
 * @typedef {Object} AngularFieldDefinition
 * @property {PossibleInputTypes} type - The type of input field
 * @property {string|string[]} className - CSS class name(s) for the field
 * @property {string} [cancelText] - Text for the cancel button (from IonSelect)
 * @property {string} [interface] - Interface style for select (from IonSelect)
 * @property {string} [selectedText] - Text for selected option (from IonSelect)
 * @property {Object} [interfaceOptions] - Options for the interface (from IonSelect)
 * @property {number} [rows] - Number of rows for textarea (from IonTextarea)
 * @property {number} [cols] - Number of columns for textarea (from IonTextarea)
 * @property {string} [alignment] - Alignment of checkbox (from IonCheckbox)
 * @property {string} [justify] - Justification of checkbox (from IonCheckbox)
 * @property {boolean} [checked] - Whether checkbox is checked (from IonCheckbox)
 * @memberOf module:engine
 */
export type AngularFieldDefinition = Omit<
  IonInput,
  | 'ionInput'
  | 'ionFocus'
  | 'ionChange'
  | 'ionBlur'
  | 'getInputElement'
  | 'setFocus'
  | 'label'
  | 'el'
  | 'z'
  | 'type'
> &
  Pick<
    IonSelect,
    'cancelText' | 'interface' | 'selectedText' | 'interfaceOptions'
  > &
  Pick<IonTextarea, 'rows' | 'cols'> &
  Pick<IonCheckbox, 'alignment' | 'justify' | 'checked'> & {
  type: PossibleInputTypes;
  className: string | string[];
} & Record<string, unknown>;

/**
 * @description String or boolean representation of a boolean value
 * @summary Represents a value that can be either a boolean or a string representation of a boolean.
 * This is useful for handling attribute values that can be specified as either strings or booleans.
 * @typedef {('true'|'false'|boolean)} StringOrBoolean
 * @memberOf module:engine
 */
export type StringOrBoolean = 'true' | 'false' | boolean;

/**
 * @description Option type for select inputs
 * @summary Extends the InputOption interface with a selected property to indicate
 * whether the option is selected by default.
 * @memberOf module:engine
 */
export type SelectOption = InputOption & { selected?: boolean };

/**
 * @description Option type for radio inputs
 * @summary Extends the InputOption interface with a checked property to indicate
 * whether the option is checked by default.
 * @memberOf module:engine
 */
export type RadioOption = InputOption & { checked?: boolean };

/**
 * @description Option type for checkbox inputs
 * @summary Alias for RadioOption, as checkbox options have the same structure as radio options.
 * @typedef {RadioOption} CheckboxOption
 * @memberOf module:engine
 */
export type CheckboxOption = RadioOption;

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
 * @description Target options for HTML forms
 * @summary Defines the possible target values for HTML forms, including standard targets
 * like '_blank', '_self', '_parent', and '_top', as well as custom string values.
 * @typedef {('_blank'|'_self'|'_parent'|'_top'|string)} HTMLFormTarget
 * @memberOf module:engine
 */
export type HTMLFormTarget = '_blank' | '_self' | '_parent' | '_top' | string;

// export interface IListItemProp {
//   render?: string | boolean;
//   translateProps?: string | string[];
//   button?: StringOrBoolean;
//   icon?: string;
//   iconSlot?: 'start' | 'end';
//   title?: string;
//   descritpion?: string;
//   info?: string;
//   subinfo?: string;
// }

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

export type FormServiceControl = {
  control: FormGroup;
  props: AngularFieldDefinition;
};

/**
 * @description Type for form service controls
 * @summary Defines the structure of form controls managed by the form service.
 * It's a nested record where the outer key is the form group name, the inner key
 * is the control name, and the value contains the form group and field properties.
 * @typedef {Record<string, Record<string, { control: FormGroup; props: AngularFieldDefinition }>>} FormServiceControls
 * @memberOf module:engine
 */
export type FormServiceControls = Record<
  string,
  Record<string, FormServiceControl>
>;

/**
 * @description Interface for model render custom events
 * @summary Defines the structure of custom events triggered during model rendering.
 * Contains the event detail, component name, and event name.
 * @interface ModelRenderCustomEvent
 * @property {BaseCustomEvent} detail - The detailed event information
 * @property {string} component - The component that triggered the event
 * @property {string} name - The name of the event
 * @memberOf module:engine
 */
export interface ModelRenderCustomEvent {
  detail: BaseCustomEvent;
  component: string;
  name: string;
}

/**
 * @description Interface for list item custom events
 * @summary Defines the structure of custom events triggered by list items.
 * Extends BaseCustomEvent with additional properties for the action and primary key.
 * @interface ListItemCustomEvent
 * @property {string} action - The action performed on the list item
 * @property {string} [pk] - Optional primary key of the affected item
 * @property {any} data - The data associated with the event (inherited from BaseCustomEvent)
 * @property {HTMLElement} [target] - The target element (inherited from BaseCustomEvent)
 * @property {string} [name] - The name of the event (inherited from BaseCustomEvent)
 * @property {string} component - The component that triggered the event (inherited from BaseCustomEvent)
 * @memberOf module:engine
 */
export interface ListItemCustomEvent extends BaseCustomEvent {
  action: string;
  pk?: string;
}

/**
 * @description Base interface for custom events
 * @summary Defines the base structure for custom events in the application.
 * Contains properties for the event data, target element, name, and component.
 * @interface BaseCustomEvent
 * @property {any} data - The data associated with the event
 * @property {HTMLElement} [target] - The target element that triggered the event
 * @property {string} [name] - The name of the event
 * @property {string} component - The component that triggered the event
 * @memberOf module:engine
 */
export interface BaseCustomEvent {
  data: any;
  target?: HTMLElement;
  name?: string;
  component: string;
}

/**
 * @description Base interface for custom events
 * @summary Defines the base structure for custom events in the application.
 * Contains properties for the event data, target element, name, and component.
 * @interface BaseCustomEvent
 * @property {any} data - The data associated with the event
 * @property {HTMLElement} [target] - The target element that triggered the event
 * @property {string} [name] - The name of the event
 * @property {string} component - The component that triggered the event
 * @memberOf module:engine
 */
export type CrudFormEvent = BaseCustomEvent & {
  handlers?: Record<string, any>;
};// export type CrudFormEvent = BaseCustomEvent & {handlers?: Record<string, (...args: any[]) => any | Promise<any>>}
