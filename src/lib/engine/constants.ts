import { UIKeys } from '@decaf-ts/ui-decorators';
import { VALIDATION_PARENT_KEY } from '@decaf-ts/decorator-validation';

/**
 * @description Angular engine key constants
 * @summary Contains key strings used by the Angular rendering engine for reflection,
 * dynamic component creation, and other engine operations.
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
 * @const AngularEngineKeys
 * @memberOf module:engine
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
  FORM_GROUP_COMPONENT_PROPS: 'componentProps'
};

/**
 * @description Form validation state constants
 * @summary Contains constants representing the possible validation states of a form.
 * These are used to check and handle form validation throughout the application.
 * @typedef {Object} FormConstants
 * @property {string} VALID - Constant representing a valid form state
 * @property {string} INVALID - Constant representing an invalid form state
 * @const FormConstants
 * @memberOf module:engine
 */
export const FormConstants = {
  VALID: 'VALID',
  INVALID: 'INVALID',
} as const;

/**
 * @description Event name constants
 * @summary Enum containing constants for event names used throughout the application.
 * These are used to standardize event naming and handling.
 * @enum {string}
 * @readonly
 * @property {string} BACK_BUTTON_NAVIGATION - Event fired when back button navigation ends
 * @property {string} REFRESH_EVENT - Event fired when a refresh action occurs
 * @property {string} CLICK_EVENT - Event fired when a click action occurs
 * @property {string} SUBMIT_EVENT - Event fired when a form submission occurs
 * @memberOf module:engine
 */
export const EventConstants = {
  BACK_BUTTON_NAVIGATION: 'backButtonNavigationEndEvent',
  REFRESH: 'RefreshEvent',
  CLICK: 'ClickEvent',
  SUBMIT: 'SubmitEvent',
  VALIDATION_ERROR: 'validationErrorEvent',
  FIELDSET_ADD_GROUP: 'fieldsetAddGroupEvent',
  FIELDSET_UPDATE_GROUP: 'fieldsetUpdateGroupEvent',
  FIELDSET_REMOVE_GROUP: 'fieldsetRemoveGroupEvent',
  // FIELDSET_GROUP_VALIDATION: 'fieldsetGroupValidationEvent'
} as const;

/**
 * @description Logger level constants
 * @summary Enum defining the logging levels used in the application's logging system.
 * Lower values represent more verbose logging, while higher values represent more critical logs.
 * @enum {number}
 * @readonly
 * @property {number} ALL - Log everything (most verbose)
 * @property {number} DEBUG - Log debug information
 * @property {number} INFO - Log informational messages
 * @property {number} WARN - Log warnings
 * @property {number} ERROR - Log errors
 * @property {number} CRITICAL - Log critical errors (least verbose)
 * @memberOf module:engine
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
 * @description Route direction constants
 * @summary Enum defining the possible navigation directions in the application.
 * Used for controlling navigation flow and animation directions.
 * @enum {string}
 * @readonly
 * @property {string} BACK - Navigate back to the previous page
 * @property {string} FORWARD - Navigate forward to the next page
 * @property {string} ROOT - Navigate to the root/home page
 * @memberOf module:engine
 */
export enum RouteDirections {
  BACK = 'back',
  FORWARD = 'forward',
  ROOT = 'root',
}


/**
 * @description Component tag name constants
 * @summary Enum defining the tag names for custom components used in the application.
 * These tag names are used for component registration and rendering.
 * @enum {string}
 * @readonly
 * @property {string} LIST_ITEM - Tag name for list item component
 * @property {string} LIST_INFINITE - Tag name for infinite scrolling list component
 * @property {string} LIST_PAGINATED - Tag name for paginated list component
 * @memberOf module:engine
 */
export enum ComponentsTagNames {
  LIST_ITEM = 'ngx-decaf-list-item',
  LIST_INFINITE = 'ngx-decaf-list-infinite',
  LIST_PAGINATED = 'ngx-decaf-list-paginated',
}

/**
 * @description Base component property name constants
 * @summary Enum defining the standard property names used by base components in the application.
 * These property names are used for consistent property access across components.
 * @enum {string}
 * @readonly
 * @property {string} MODEL - Property name for the component's data model
 * @property {string} LOCALE - Property name for localization settings
 * @property {string} PK - Property name for primary key
 * @property {string} ITEMS - Property name for collection items
 * @property {string} ROUTE - Property name for routing information
 * @property {string} OPERATIONS - Property name for available operations
 * @property {string} UID - Property name for unique identifier
 * @property {string} TRANSLATABLE - Property name for translation flag
 * @property {string} MAPPER - Property name for property mapper
 * @property {string} INITIALIZED - Property name for initialization state
 * @memberOf module:engine
 */
export enum BaseComponentProps {
  MODEL = 'model',
  LOCALE = 'locale',
  PK = 'pk',
  ITEMS = 'items',
  ROUTE = 'route',
  OPERATIONS = 'operations',
  UID = 'uid',
  TRANSLATABLE = 'translatable',
  MAPPER = 'mapper',
  INITIALIZED = 'initialized',
}


export enum ListComponentsTypes {
  INFINITE = 'infinite',
  PAGINATED = 'paginated',
}

export interface IListEmptyResult {
  title: string;
  subtitle: string;
  showButton: boolean;
  buttonText: string;
  link: string;
  icon: string;
}

