import { stringFormat } from "@decaf-ts/decorator-validation";
import { LoggerMessage, Callback, LoggerLevelTypes,  } from "./types";
import { isDevelopmentMode } from "./utils";

/**
 * @const LoggerLevels
 *
 * @category utils.logging
 */
const LoggerLevels = {
  ALL: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  CRITICAL: 5
};

function report(message: string, type: LoggerLevelTypes = "info") {
  if(isDevelopmentMode('tst'))
    console[type](message);
}

function getMessage(message: LoggerMessage, _className?: any, ...args: any[]): string {

  if(message instanceof Error)
    message =  message?.message || JSON.stringify(message);

  if(typeof message === 'string')
    message = stringFormat(message, ...args);

  if(_className)
    return`[${(_className instanceof Function ?
      _className?.name : _className?.constructor?.name) || (typeof _className === 'string' ?
          _className : 'Logging')}] - ${message}`;

  return message as string;
}

export function consoleError(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(getMessage(message, _class, ...args), 'error');
}

export function consoleWarn(_class: any, message: LoggerMessage, ...args: any[]) {
  return report( getMessage(message, _class, ...args), 'warn');
}

export function consoleInfo(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(getMessage(message, _class, ...args), 'info');

}

export function consoleLog(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(message as string, 'log');
}

export function consoleDebug(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(message as string, 'debug');
}

export function throwError(_class: any, message: LoggerMessage, ...args: any[]) {
    message = getMessage(message, _class, ...args);
    throw new Error(message);
}

/**
 * Wrapper Class for Logged Errors
 * Will trigger a call to the logger if it hasn't been logged before oo if it's being called at a higher level
 *
 * @param {LoggerMessage} error
 * @param {any} [issuer]
 * @param {number} level defaults to {@link LoggerLevels.ERROR}
 * @param {any[]} [args] arguments to be passed as replacements to the logger
 *
 * @class LoggedError
 * @extends Error
 *
 */
export class LoggedError extends Error {
  /**
   * @property {number} logged
   */
  loggedAt?: number;
  issuer?: any;

  constructor(error: LoggerMessage, issuer: any = undefined, level: number = LoggerLevels.ALL, ...args: any[]) {
      super(error instanceof Error ? error.message : (typeof error === 'string' ? getMessage(error, issuer, ...args) : error));
      this.name = LoggedError.constructor.name;
      this.loggedAt = error instanceof Error && error.name === LoggedError.constructor.name ? error.loggedAt : undefined;
      this.issuer = issuer;

      if ((error as any).loggedAt === undefined || (error as any).loggedAt < level) {
          consoleError(this as LoggerMessage, error);
          this.loggedAt = level;
      }
  }
}


/**
 *
 * @param {string} message
 * @param {number} level
 * @param {Callback} callback
 * @param {any[]} [args]
 *
 * @function loggedCallback
 *
 * @memberOf utils.logging
 */
export function loggedCallback(this: any, message: LoggerMessage, level: number, callback: Callback, ...args: any[]) {
  if (message instanceof LoggedError && message.loggedAt && message.loggedAt >= level)
      return callback(message);
  if (message instanceof LoggedError){
    if (message.loggedAt !== undefined && message.loggedAt < level){
      consoleError(this && this.name !== "loggedCallback" ? this : undefined, message)
      message.loggedAt = level;
    }
    return callback(message);
  }
  const error: LoggedError = new LoggedError(message, this && this.name !== "loggedCallback" ? this : undefined, level, ...args);
  callback(error);
}

/**
*
* @param {LoggerMessage} message
* @param {Callback} callback
* @param {any[]} [args]
*
* @function allCallback
*
* @memberOf utils.logging
*/
export function allCallback(this: any, message: LoggerMessage, callback: Callback, ...args: any[]) {
  loggedCallback.call(this, message, LoggerLevels.ALL, callback, ...args);
}

/**
*
* @param {LoggerMessage} message
* @param {Callback} callback
* @param {any[]} [args]
*
* @function debugCallback
*
* @memberOf utils.logging
*/
export function debugCallback(this: any, message: LoggerMessage, callback: Callback, ...args: any[]) {
  loggedCallback.call(this, message, LoggerLevels.DEBUG, callback, ...args);
}

/**
*
* @param {LoggerMessage} message
* @param {Callback} callback
* @param {any[]} [args]
*
* @function infoCallback
*
* @memberOf utils.logging
*/
export function infoCallback(this: any, message: LoggerMessage, callback: Callback, ...args: any[]) {
  loggedCallback.call(this, message, LoggerLevels.INFO, callback, ...args);
}

/**
*
* @param {LoggerMessage} message
* @param {Callback} callback
* @param {any[]} [args]
*
* @function warningCallback
*
* @memberOf utils.logging
*/
export function warningCallback(this: any, message: LoggerMessage, callback: Callback, ...args: any[]) {
  loggedCallback.call(this, message, LoggerLevels.WARN, callback, ...args);
}

/**
*
* @param {LoggerMessage} message
* @param {Callback} callback
* @param {any[]} [args]
*
* @function errorCallback
*
* @memberOf utils.logging
*/
export function errorCallback(this: any, message: LoggerMessage, callback: Callback, ...args: any[]) {
  loggedCallback.call(this, message, LoggerLevels.ERROR, callback, ...args);
}

/**
*
* @param {LoggerMessage} message
* @param {Callback} callback
* @param {any[]} [args]
*
* @function criticalCallback
*
* @memberOf utils.logging
*/
export function criticalCallback(this: any, message: LoggerMessage, callback: Callback, ...args: any[]) {
  loggedCallback.call(this, message, LoggerLevels.CRITICAL, callback, ...args);
}
