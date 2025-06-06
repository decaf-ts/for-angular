import { stringFormat } from "@decaf-ts/decorator-validation";
import { isDevelopmentMode } from "./utils";
import { MiniLogger, LogLevel } from "@decaf-ts/logging";
import { KeyValue } from "../engine";
export type LoggerMessage = Error & {loggedAt?: number} | string | KeyValue | KeyValue[];

const defaultLoggerConfig = {
  level: LogLevel.info,
  logLevel: true,
  timestamp: false
};
const Logger = new MiniLogger('for-angular', defaultLoggerConfig);


function report(_class: string, message: LoggerMessage, level: LogLevel | 'warn' = LogLevel.info) {
  if(isDevelopmentMode()) {
    if(level === 'warn') {
      console.warn(message)
    } else {
      const logger = Logger.for(getClassName(_class));
      logger[level](typeof message === 'object' ? JSON.stringify(message, null, 1) : message);
    }
  }
}

function getClassName(_class: any): string {
  return (_class instanceof Function ?
        _class?.name : _class?.constructor?.name) || (typeof _class === 'string' ?
            _class : '');
}

function getMessage(message: LoggerMessage, _class?: any, ...args: any[]): string {

  if(message instanceof Error)
    message =  message?.message || message;

  if(typeof message === 'string')
    message = stringFormat(message, ...args);

  // if(_class)
  //   return`[${(_class instanceof Function ?
  //     _class?.name : _class?.constructor?.name) || (typeof _class === 'string' ?
  //         _class : 'Logging')}] - ${message}`;

  return message as string;
}

export function consoleError(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(_class, getMessage(message, _class, ...args), LogLevel.error);
}

export function consoleWarn(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(_class, getMessage(message, _class, ...args), "warn");
}

export function consoleInfo(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(_class, getMessage(message, _class, ...args), LogLevel.info);

}

export function consoleLog(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(_class, getMessage(message, _class, ...args), LogLevel.info);
}

export function consoleDebug(_class: any, message: LoggerMessage, ...args: any[]) {
  return report(_class, message as string, LogLevel.debug);
}

export function throwError(_class: any, message: LoggerMessage, ...args: any[]) {
    message = getMessage(message, _class, ...args);
    throw new Error(message);
}







