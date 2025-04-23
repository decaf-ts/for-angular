import { UIKeys } from '@decaf-ts/ui-decorators';

export const AngularEngineKeys = {
  REFLECT: `${UIKeys.REFLECT}.angular.`,
  DYNAMIC: 'dynamic-component',
  ANNOTATIONS: '__annotations__',
  ECMP: 'ecmp',
  NG_REFLECT: 'ng-reflect-',
  RENDERED: 'rendered-as-',
  RENDERED_ID: 'rendered-as-{0}',
};

export const FormConstants = {
  VALID: 'VALID',
  INVALID: 'INVALID',
};

export enum EventConstants {
  BACK_BUTTON_NAVIGATION = "BackButtonNavigationEndEvent"
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

