/**
 * @module module:lib/engine/types
 * @description Shared type aliases and helper types used by the rendering engine and components.
 * @summary Defines common TypeScript types, typedefs, and unions used across engine, components,
 * and form helpers (e.g., KeyValue, FunctionLike, AngularFieldDefinition, FieldUpdateMode).
 *
 * @link {@link KeyValue}
 */
import { IonCheckbox, IonInput, IonSelect, IonTextarea } from '@ionic/angular';
import { TextFieldTypes } from '@ionic/core';
import { FormArray, FormGroup } from '@angular/forms';
import { FormServiceControl, I18nResourceConfig, InputOption } from './interfaces';
import { Adapter, Repository } from '@decaf-ts/core';
import { Context, RepositoryFlags } from '@decaf-ts/db-decorators';
import { Constructor, Model } from '@decaf-ts/decorator-validation';
import { I } from '@faker-js/faker/dist/airline-CLphikKp';


export type HandlerLike = Record<string, (...args: unknown[]) => unknown | Promise<unknown>>

export interface RawQuery<M extends Model> {
  select: undefined | (keyof M)[];
  from: Constructor<M>;
  where: (el: M) => boolean;
  sort?: (el: M, el2: M) => number;
  limit?: number;
  skip?: number;
}

export type DecafRepositoryAdapter<
  F extends RepositoryFlags = RepositoryFlags,
  C extends Context<F> = Context<F>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = Adapter<any, any, RawQuery<any>, F, C>;

export type DecafRepository<M extends Model> = Repository<
  M,
  RawQuery<M>,
  DecafRepositoryAdapter<RepositoryFlags, Context<RepositoryFlags>>,
  RepositoryFlags,
  Context<RepositoryFlags>
>;


/**
 * @description Generic key-value pair type
 * @summary Represents a generic object with string keys and any type of values.
 * This is commonly used for dynamic data structures where the properties are not known at compile time.
 * @typedef {Record<string, any>} KeyValue
 * @memberOf module:engine
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KeyValue = Record<string, any>;

/**
 * @description Generic function type
 * @summary Represents a function that accepts any number of arguments of any type
 * and returns any type. This is useful for defining function parameters or variables
 * where the exact function signature is not known at compile time.
 * @typedef FunctionLike
 * @memberOf module:engine
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionLike = (...args: any[]) => any;

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
 * @description Option type for CRUD field inputs
 * @summary Represents a union type that can be either a SelectOption or RadioOption.
 * This is used for defining options in form fields that support both select and radio input types.
 * @typedef {(SelectOption|RadioOption)} CrudFieldOption
 * @memberOf module:engine
 */
export type CrudFieldOption = SelectOption | RadioOption;

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



export type FormParent = FormGroup | FormArray;

/**
 * @description Form parent group tuple
 * @summary Represents a tuple containing a FormGroup and its associated string identifier.
 * This is used for managing hierarchical form structures and parent-child relationships.
 * @typedef {[FormParent, string]} FormParentGroup
 * @memberOf module:engine
 */
export type FormParentGroup = [FormParent,  string];

export type I18nResourceConfigType = I18nResourceConfig | I18nResourceConfig[];

