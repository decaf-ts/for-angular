import { UIKeys } from '@decaf-ts/ui-decorators';
import { VALIDATION_PARENT_KEY } from '@decaf-ts/decorator-validation';
import { ICrudFormOptions, IListEmptyOptions } from './interfaces';

import { ModalOptions } from '@ionic/angular/standalone';

/**
 * @description Angular engine key constants.
 * @summary Contains key strings used by the Angular rendering engine for reflection,
 * dynamic component creation, and other engine operations. These constants provide
 * consistent naming for metadata keys, DOM attributes, and component identification
 * throughout the rendering system.
 * @typedef {Object} AngularEngineKeys
 * @property {string} REFLECT - Prefix for reflection metadata keys
 * @property {string} DYNAMIC - Key for dynamic component identification
 * @property {string} ANNOTATIONS - Key for component annotations
 * @property {string} ECMP - Key for embedded components
 * @property {string} NG_REFLECT - Prefix for Angular reflection attributes
 * @property {string} RENDERED - Prefix for rendered component markers
 * @property {string} MAPPER - Key for property mappers
 * @property {string} CHILDREN - Key for child components
 * @property {string} LISTABLE - Key for listable components
 * @property {string} RENDER - Key for renderable components
 * @property {string} RENDERED_ID - Template for rendered component IDs
 * @property {string} PARENT - Key for comparison decorators and validators
 * @property {string} VALIDATION_PARENT_KEY - Key for validation parent reference
 * @property {string} FLAVOUR - Identifier for the Angular engine flavor
 * @const AngularEngineKeys
 * @memberOf module:lib/engine/constants
 */
export const AngularEngineKeys = {
  REFLECT: `${UIKeys.REFLECT}.angular.`,
  DYNAMIC: 'dynamic-component',
  ANNOTATIONS: '__annotations__',
  ECMP: 'ecmp',
  NG_REFLECT: 'ng-reflect-',
  RENDERED: 'rendered-as-',
  MAPPER: 'mapper',
  CHILDREN: 'children',
  LISTABLE: 'listable',
  RENDER: 'render',
  RENDERED_ID: 'rendered-as-{0}',
  PARENT: '_parent',
  VALIDATION_PARENT_KEY: VALIDATION_PARENT_KEY,
  FLAVOUR: "angular",
  LOADED: 'engineLoaded',
  DARK_PALETTE_CLASS: 'dcf-palette-dark'
} as const;

/**
 * @description Form validation state constants.
 * @summary Contains constants representing the possible validation states of a form.
 * These are used to check and handle form validation throughout the application.
 * The VALID state indicates all form controls pass validation, while INVALID
 * indicates one or more validation errors exist.
 * @typedef {Object} FormConstants
 * @property {string} VALID - Constant representing a valid form state
 * @property {string} INVALID - Constant representing an invalid form state
 * @const FormConstants
 * @memberOf module:lib/engine/constants
 */
export const FormConstants = {
  VALID: 'VALID',
  INVALID: 'INVALID',
} as const;

/**
 * @description Event name constants.
 * @summary Contains constants for standardized event names used throughout the application.
 * These constants ensure consistent event naming across components and make it easier to
 * track and handle events. Each constant represents a specific application event type.
 * @typedef {Object} ComponentEventNames
 * @property {string} BACK_BUTTON_NAVIGATION - Event fired when back button navigation ends
 * @property {string} REFRESH - Event fired when a refresh action occurs
 * @property {string} CLICK - Event fired when a click action occurs
 * @property {string} SUBMIT - Event fired when a form submission occurs
 * @property {string} VALIDATION_ERROR - Event fired when a validation error occurs
 * @property {string} FIELDSET_ADD_GROUP - Event fired when adding a group to a fieldset
 * @property {string} FIELDSET_UPDATE_GROUP - Event fired when updating a fieldset group
 * @property {string} FIELDSET_REMOVE_GROUP - Event fired when removing a fieldset group
 * @const ComponentEventNames
 * @memberOf module:lib/engine/constants
 */
export const ComponentEventNames = {
  BACK_BUTTON_NAVIGATION: 'backButtonNavigationEndEvent',
  REFRESH: 'RefreshEvent',
  CLICK: 'ClickEvent',
  CHANGE: 'ChangeEvent',
  SUBMIT: 'SubmitEvent',
  VALIDATION_ERROR: 'validationErrorEvent',
  FIELDSET_ADD_GROUP: 'fieldsetAddGroupEvent',
  FIELDSET_UPDATE_GROUP: 'fieldsetUpdateGroupEvent',
  FIELDSET_REMOVE_GROUP: 'fieldsetRemoveGroupEvent',
  THEME_CHANGE: 'themeChangeEvent',
  // FIELDSET_GROUP_VALIDATION: 'fieldsetGroupValidationEvent'
} as const;

/**
 * @description Logger level constants.
 * @summary Defines the logging levels used in the application's logging system.
 * Lower numeric values represent more verbose logging, while higher values represent
 * more critical logs. These levels control which log messages are output based on
 * the configured logging threshold.
 * @enum {number}
 * @readonly
 * @property {number} ALL - Log everything (most verbose)
 * @property {number} DEBUG - Log debug information
 * @property {number} INFO - Log informational messages
 * @property {number} WARN - Log warnings
 * @property {number} ERROR - Log errors
 * @property {number} CRITICAL - Log critical errors (least verbose)
 * @memberOf module:lib/engine/constants
 */
export enum LoggerLevels {
  ALL = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  CRITICAL = 5
};

/**
 * @description Route direction constants.
 * @summary Defines the possible navigation directions in the application.
 * Used for controlling navigation flow and animation directions during route transitions.
 * These constants help maintain consistent navigation behavior throughout the app.
 * @enum {string}
 * @readonly
 * @property {string} BACK - Navigate back to the previous page
 * @property {string} FORWARD - Navigate forward to the next page
 * @property {string} ROOT - Navigate to the root/home page
 * @memberOf module:lib/engine/constants
 */
export enum RouteDirections {
  BACK = 'back',
  FORWARD = 'forward',
  ROOT = 'root',
}


/**
 * @description Component tag name constants.
 * @summary Defines the custom HTML tag names for specialized components used in the application.
 * These tag names are registered with Angular and used for component rendering and identification.
 * Each constant represents the selector for a specific custom component type.
 * @enum {string}
 * @readonly
 * @property {string} LIST_ITEM - Tag name for list item component
 * @property {string} LIST_INFINITE - Tag name for infinite scrolling list component
 * @property {string} LIST_PAGINATED - Tag name for paginated list component
 * @property {string} CRUD_FIELD - Tag name for CRUD form field component
 * @property {string} LAYOUT_COMPONENT - Tag name for layout container component
 * @memberOf module:lib/engine/constants
 */
export enum ComponentsTagNames {
  LIST_ITEM = 'ngx-decaf-list-item',
  LIST_INFINITE = 'ngx-decaf-list-infinite',
  LIST_PAGINATED = 'ngx-decaf-list-paginated',
  CRUD_FIELD = 'ngx-decaf-crud-field',
  LAYOUT_COMPONENT = 'ngx-decaf-layout',
}

/**
 * @description Base component property name constants.
 * @summary Defines the standard property names used by base components throughout the application.
 * These constants ensure consistent property naming across components and facilitate
 * property access, validation, and data binding. Used primarily for component input
 * properties and change detection.
 * @enum {string}
 * @readonly
 * @property {string} MODEL - Property name for the component's data model
 * @property {string} LOCALE - Property name for localization settings
 * @property {string} LOCALE_ROOT - Property name for the locale root identifier
 * @property {string} PK - Property name for primary key
 * @property {string} ITEMS - Property name for collection items
 * @property {string} ROUTE - Property name for routing information
 * @property {string} OPERATIONS - Property name for available operations
 * @property {string} UID - Property name for unique identifier
 * @property {string} TRANSLATABLE - Property name for translation flag
 * @property {string} MAPPER - Property name for property mapper
 * @property {string} INITIALIZED - Property name for initialization state
 * @property {string} COMPONENT_NAME - Property name for component identifier
 * @property {string} PARENT_FORM - Property name for parent component reference
 * @property {string} FORM_GROUP_COMPONENT_PROPS - Property name for form group component properties
 * @memberOf module:lib/engine/constants
 */
export enum BaseComponentProps {
  MODEL = 'model',
  LOCALE = 'locale',
  LOCALE_ROOT = 'locale_root',
  PK = 'pk',
  ITEMS = 'items',
  ROUTE = 'route',
  OPERATIONS = 'operations',
  UID = 'uid',
  TRANSLATABLE = 'translatable',
  MAPPER = 'mapper',
  INITIALIZED = 'initialized',
  COMPONENT_NAME = 'componentName',
  PARENT_FORM = 'parentForm',
  FORM_GROUP_COMPONENT_PROPS = 'componentProps'
}


/**
 * @description List component type constants.
 * @summary Defines the available types for list components, determining their
 * pagination and scrolling behavior. Used to configure list rendering strategies.
 * @enum {string}
 * @readonly
 * @property {string} INFINITE - Infinite scroll list type
 * @property {string} PAGINATED - Paginated list type with page navigation
 * @memberOf module:lib/engine/constants
 */
export enum ListComponentsTypes {
  INFINITE = 'infinite',
  PAGINATED = 'paginated',
}

/**
 * @description CSS class name constants.
 * @summary Contains predefined CSS class names used for consistent styling
 * across components. These constants help maintain a unified visual language
 * and make it easier to apply standard styles.
 * @typedef {Object} CssClasses
 * @property {string} BUTTONS_CONTAINER - CSS class for button container elements
 * @const CssClasses
 * @memberOf module:lib/engine/constants
 */
export const CssClasses = {
  BUTTONS_CONTAINER: 'buttons-container',
};

/**
 * @description Default options for reactive CRUD forms.
 * @summary Provides default configuration for form buttons in CRUD operations.
 * Includes default text labels for submit and clear buttons, which can be
 * overridden by individual form implementations.
 * @type {ICrudFormOptions}
 * @property {Object} buttons - Configuration for form action buttons
 * @property {Object} buttons.submit - Submit button configuration
 * @property {string} buttons.submit.text - Default text for submit button
 * @property {Object} buttons.clear - Clear button configuration
 * @property {string} buttons.clear.text - Default text for clear button
 * @const DefaultFormReactiveOptions
 * @memberOf module:lib/engine/constants
 */
export const DefaultFormReactiveOptions: ICrudFormOptions = {
  buttons: {
    submit: {
      text: 'Submit',
    },
    clear: {
      text: 'Clear',
    },
  },
};


/**
 * @description Default options for empty list state display.
 * @summary Provides default configuration for displaying empty state in list components
 * when no data is available. Includes default text for title and subtitle, icon name,
 * button text and visibility settings. These defaults can be overridden by individual
 * list component implementations to customize the empty state presentation.
 * @type {IListEmptyOptions}
 * @property {string} title - Default translation key for empty list title
 * @property {string} subtitle - Default translation key for empty list subtitle
 * @property {boolean} showButton - Whether to show action button in empty state
 * @property {string} icon - Default Ionic icon name for empty state
 * @property {string} buttonText - Default translation key for button text
 * @property {string} link - Default navigation link (empty string)
 * @const DefaultListEmptyOptions
 * @memberOf module:lib/engine/constants
 */
export const DefaultListEmptyOptions = {
  title: 'empty.title',
  subtitle: 'empty.subtitle',
  showButton: false,
  icon: 'folder-open-outline',
  buttonText: 'locale.empty.button',
  link: ''
} as IListEmptyOptions


export const DefaultModalOptions = {
    component: "",
    showBackdrop: true,
    backdropDismiss: false,
    animated: true,
    canDismiss: true,
    showBackdropTapClose: true,
    focusTrap: true,
} as ModalOptions;

export const ActionRoles = {
  cancel: 'cancel',
  confirm: 'confirm',
  submit: 'submit',
  clear: 'clear',
  back: 'back'
} as const;

export const WindowColorSchemes = {
  light: 'light',
  dark: 'dark',
  undefined: 'undefined'
} as const;

export const ElementSizes = {
  xsmall: 'xsmall',
  small: 'small',
  medium: 'medium',
  default: 'default',
  large: 'large',
  xLarge: 'xlarge',
  '2xLarge': '2xlarge',
  auto: 'auto',
  expand: 'expand',
  block: 'block',
} as const;


export const ElementPositions =  {
  left: 'left',
  center: 'center',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
} as const;


export const LayoutGridGaps = {
  small: 'small',
  medium: 'medium',
  large: 'large',
  collapse: 'collapse',
  none: ''
} as const;


export const ListItemPositions = {
  uid: 'uid',
  title: 'title',
  description: 'description',
  info: 'info',
  subinfo: 'subinfo',
} as const;

