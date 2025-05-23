import { UIKeys } from '@decaf-ts/ui-decorators';

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
};

export const FormConstants = {
  VALID: 'VALID',
  INVALID: 'INVALID',
};

export enum EventConstants {
  BACK_BUTTON_NAVIGATION = "backButtonNavigationEndEvent",
  REFRESH_EVENT = "RefreshEvent",
  CLICK_EVENT = "ClickEvent",
  SUBMIT_EVENT = "SubmitEvent",
}

export enum LoggerLevels {
  ALL = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  CRITICAL = 5
};

export enum RouteDirections {
  BACK = "back",
  FORWARD = "forward",
  ROOT = "root",
};


export enum ComponentsTagNames {
  LIST_ITEM = "ngx-decaf-list-item",
  LIST_INFINITE = 'ngx-decaf-list-infinite',
  LIST_PAGINATED = 'ngx-decaf-list-paginated',
}

export enum BaseComponentProps {
  MODEL = "model",
  LOCALE = "locale",
  PK = "pk",
  ITEMS = "items",
  ROUTE = "route",
  OPERATIONS = "operations",
  UID = "uid",
  TRANSLATABLE = 'translatable',
  MAPPER = "mapper",
  INITIALIZED = 'initialized',
}
