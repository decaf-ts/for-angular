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
import { Model } from '@decaf-ts/decorator-validation';
import { ActionRoles, ListItemPositions, WindowColorSchemes } from './constants';
import {
  DecafComponent,
  HTML5InputTypes,
  UIFunctionLike,
  ElementPositions,
  ElementSizes,
  LayoutGridGaps,
} from '@decaf-ts/ui-decorators';
import { Constructor } from '@decaf-ts/decoration';
import { EnvironmentProviders, Provider } from '@angular/core';
import { NgxComponentDirective } from './NgxComponentDirective';

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
  C extends Context<F> = Context<F>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = Adapter<any, any, RawQuery<any>, any>;

export type DecafRepository<M extends Model> = Repository<
  M,
  DecafRepositoryAdapter<RepositoryFlags, Context>
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
export type FunctionLike = UIFunctionLike;

/**
 * @description Element size options for UI components
 * @summary Defines the possible size values that can be applied to UI elements.
 * These sizes control the dimensions and layout behavior of components.
 * @typedef ElementSize
 * @memberOf module:engine
 */
export type ElementSize = (typeof ElementSizes)[keyof typeof ElementSizes];

/**
 * @description Basic position options for UI elements
 * @summary Defines the possible position values that can be applied to UI elements.
 * These positions control the alignment and placement of components.
 * @typedef {('left'|'center'|'right'|'top'|'bottom')} ElementPosition
 * @memberOf module:engine
 */
export type ElementPosition = (typeof ElementPositions)[keyof typeof ElementPositions];

/**
 * @description Extended position options for flex layouts
 * @summary Extends the basic ElementPosition with additional flex-specific position values.
 * These positions are used for controlling alignment and distribution in flex containers.
 * @typedef {(ElementPosition |'stretch'|'middle'|'around'|'between')} FlexPosition
 * @memberOf module:engine
 */
export type FlexPosition = ElementPosition | 'stretch' | 'middle' | 'around' | 'between';

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

export type HTML5InputType = (typeof HTML5InputTypes)[keyof typeof HTML5InputTypes];

/**
 * @description Possible input types for form fields
 * @summary Defines the possible input types that can be used in form fields.
 * Includes standard HTML input types like checkbox, radio, and select,
 * as well as Ionic's TextFieldTypes and textarea.
 * @typedef {TextFieldTypes | HTML5InputType} PossibleInputTypes
 * @memberOf module:engine
 */
export type PossibleInputTypes = TextFieldTypes | HTML5InputType;

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
  Pick<IonSelect, 'cancelText' | 'interface' | 'selectedText' | 'interfaceOptions'> &
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

/**
 * @description Type for form service controls
 * @summary Defines the structure of form controls managed by the form service.
 * It's a nested record where the outer key is the form group name, the inner key
 * is the control name, and the value contains the form group and field properties.
 * @typedef {Record<string, Record<string, { control: FormGroup; props: AngularFieldDefinition }>>} FormServiceControls
 * @memberOf module:engine
 */
export type FormServiceControls = Record<string, Record<string, FormServiceControl>>;

export type FormParent = FormGroup | FormArray;

/**
 * @description Form parent group tuple
 * @summary Represents a tuple containing a FormGroup and its associated string identifier.
 * This is used for managing hierarchical form structures and parent-child relationships.
 * @typedef {[FormParent, string]} FormParentGroup
 * @memberOf module:engine
 */
export type FormParentGroup = [FormParent, string];

/**
 * @description Represents the configuration for internationalization resources.
 * @summary This type can either be a single `I18nResourceConfig` object or an array of such objects.
 * @typedef {I18nResourceConfig | I18nResourceConfig[]} I18nResourceConfigType
 * @memberOf module:lib/engine/types
 */
export type I18nResourceConfigType = I18nResourceConfig | I18nResourceConfig[];

/**
 * @description Represents the possible color schemes for a window.
 * @summary This type is derived from the `WindowColorSchemes` constant, allowing only its defined keys as values.
 * @typedef {typeof WindowColorSchemes[keyof typeof WindowColorSchemes]} WindowColorScheme
 * @memberOf module:lib/engine/types
 */
export type WindowColorScheme = (typeof WindowColorSchemes)[keyof typeof WindowColorSchemes];

/**
 * @description Represents the possible roles for an action.
 * @summary This type is derived from the `ActionRoles` constant, allowing only its defined keys as values.
 * @typedef {typeof ActionRoles[keyof typeof ActionRoles]} ActionRole
 * @memberOf module:lib/engine/types
 */
export type ActionRole = (typeof ActionRoles)[keyof typeof ActionRoles];

/**
 * @description Represents the possible grid gap values for a layout.
 * @summary This type is derived from the `LayoutGridGaps` constant, allowing only its defined keys as values.
 * @typedef {typeof LayoutGridGaps[keyof typeof LayoutGridGaps]} LayoutGridGap
 * @memberOf module:lib/engine/types
 */
export type LayoutGridGap = (typeof LayoutGridGaps)[keyof typeof LayoutGridGaps];

/**
 * @description Represents the possible positions for a list item.
 * @summary This type is derived from the `ListItemPositions` constant, allowing only its defined keys as values.
 * @typedef {typeof ListItemPositions[keyof typeof ListItemPositions]} ListItemPosition
 * @memberOf module:lib/engine/types
 */
export type ListItemPosition = (typeof ListItemPositions)[keyof typeof ListItemPositions];

/**
 * @description Represents an Angular dependency injection provider.
 * @summary This type is a union of Angular's `EnvironmentProviders` and `Provider` types, allowing for flexible DI configuration.
 * @typedef {EnvironmentProviders | Provider} AngularProvider
 * @memberOf module:lib/engine/types
 */
export type AngularProvider = EnvironmentProviders | Provider;

export type PropsMapperFn<T extends NgxComponentDirective> = Record<
  keyof T,
  (instance: T, ...args: unknown[]) => Promise<UIFunctionLike>
>;

export type DecafComponentConstructor = DecafComponent<Model>;
