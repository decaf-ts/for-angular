import { isDevMode } from '@angular/core';
import { StringOrBoolean, KeyValue } from '../engine/types';
import { formatDate, isValidDate } from './date';
import { stringToCapitalCase } from './string';
import {
  InjectableRegistryImp,
  InjectablesRegistry,
} from '@decaf-ts/injectable-decorators';



let injectableRegistry: InjectablesRegistry;

/**
 * @description Retrieves the singleton instance of the injectables registry
 * @summary This function implements the singleton pattern for the InjectablesRegistry.
 * It returns the existing registry instance if one exists, or creates a new instance
 * if none exists. The registry is used to store and retrieve injectable dependencies
 * throughout the application.
 *
 * @return {InjectablesRegistry} The singleton injectables registry instance
 *
 * @function getInjectablesRegistry
 * @memberOf module:for-angular
 */
export function getInjectablesRegistry(): InjectablesRegistry {
  if (!injectableRegistry)
    injectableRegistry = new InjectableRegistryImp();
  return injectableRegistry;
}

/**
 * @description Determines if the application is running in development mode
 * @summary This function checks whether the application is currently running in a development
 * environment. It uses Angular's isDevMode() function and also checks the window context
 * and hostname against the provided context parameter. This is useful for enabling
 * development-specific features or logging.
 *
 * @param {string} [context='localhost'] - The context string to check against the current environment
 * @return {boolean} True if the application is running in development mode, false otherwise
 *
 * @function isDevelopmentMode
 * @memberOf module:for-angular
 */
export function isDevelopmentMode(context: string = 'localhost') {
  if (!context)
    return isDevMode();
  return (
    isDevMode() ||
    getWindow()?.['env']?.['CONTEXT'].toLowerCase() !== context.toLowerCase() ||
    (globalThis as any).window.location.hostname.includes(context)
  );
}

/**
 * @description Dispatches a custom event to the document window
 * @summary This function creates and dispatches a custom event to the browser window.
 * It's useful for cross-component communication or for triggering application-wide events.
 * The function allows specifying the event name, detail data, and additional event properties.
 *
 * @param {string} name - The name of the custom event to dispatch
 * @param {any} detail - The data to include in the event's detail property
 * @param {object} [props] - Optional additional properties for the custom event
 * @return {void}
 *
 * @function windowEventEmitter
 * @memberOf module:for-angular
 */
export function windowEventEmitter(
  name: string,
  detail: any,
  props?: object
): void {
  const data = Object.assign(
    {
      bubbles: true,
      composed: true,
      cancelable: false,
      detail: detail,
    },
    props || {}
  );
  getWindow().dispatchEvent(new CustomEvent(name, data));
}
/**
 * @description Retrieves a property from the window's document object
 * @summary This function provides a safe way to access properties on the window's document object.
 * It uses the getWindowDocument function to get a reference to the document, then accesses
 * the specified property. This is useful for browser environment interactions that need
 * to access document properties.
 *
 * @param {string} key - The name of the property to retrieve from the document object
 * @return {any} The value of the specified property, or undefined if the document or property doesn't exist
 *
 * @function getOnWindowDocument
 * @memberOf module:for-angular
 */
export function getOnWindowDocument(key: string) {
  return getWindowDocument()?.[key];
}

/**
 * @description Retrieves the document object from the window
 * @summary This function provides a safe way to access the document object from the window.
 * It uses the getOnWindow function to retrieve the 'document' property from the window object.
 * This is useful for browser environment interactions that need access to the document.
 *
 * @return {Document|undefined} The window's document object, or undefined if it doesn't exist
 *
 * @function getWindowDocument
 * @memberOf module:for-angular
 */
export function getWindowDocument() {
  return getOnWindow('document');
}

/**
 * @description Retrieves a property from the window object
 * @summary This function provides a safe way to access properties on the window object.
 * It uses the getWindow function to get a reference to the window, then accesses
 * the specified property. This is useful for browser environment interactions that need
 * to access window properties or APIs.
 *
 * @param {string} key - The name of the property to retrieve from the window object
 * @return {any} The value of the specified property, or undefined if the window or property doesn't exist
 *
 * @function getOnWindow
 * @memberOf module:for-angular
 */
export function getOnWindow(key: string) {
  return getWindow()?.[key];
}

/**
 * @description Sets a property on the window object
 * @summary This function provides a way to set properties on the window object.
 * It uses the getWindow function to get a reference to the window, then sets
 * the specified property to the provided value. This is useful for storing
 * global data or functions that need to be accessible across the application.
 *
 * @param {string} key - The name of the property to set on the window object
 * @param {any} value - The value to assign to the property
 * @return {void}
 *
 * @function setOnWindow
 * @memberOf module:for-angular
 */
export function setOnWindow(key: string, value: any) {
  getWindow()[key] = value;
}

/**
 * @description Retrieves the global window object
 * @summary This function provides a safe way to access the global window object.
 * It uses globalThis to ensure compatibility across different JavaScript environments.
 * This is the core function used by other window-related utility functions to
 * access the window object.
 *
 * @return {Window} The global window object
 *
 * @function getWindow
 * @memberOf module:for-angular
 */
export function getWindow(): any {
  return (globalThis as any).window as any;
}

export function getWindowWidth() {
  return getOnWindow('innerWidth');
}

export function isNotUndefined(prop: StringOrBoolean | undefined): boolean {
  return (prop !== undefined) as boolean;
}

/**
 * Generates a locale string from a class name or instance.
 *
 * @param instance - The input to generate the locale from. Can be:
 *                   - A string representing a class name
 *                   - A function (class constructor)
 *                   - An object instance
 * @param suffix - Optional. A string to append to the instance name before processing
 * @returns A string representing the generated locale. The format is typically:
 *          For short names (less than 3 parts): reversed dot-separated string
 *          For longer names: last part as prefix, rest joined with underscores
 */
export function getLocaleFromClassName(
  instance: string | Function | object,
  suffix?: string
): string {
  if (typeof instance !== 'string')
    instance =
      (instance as Function).name || (instance as object)?.constructor?.name;

  let name: string | string[] = instance;

  if (suffix) name = `${instance}${stringToCapitalCase(suffix)}`;

  name = name
    .replace(/_|-/g, '')
    .replace(/(?:^\w\_|[A-Z]|\b\w)/g, (word: string, index: number) => {
      if (index > 1) word = '.' + word;
      return word.toLowerCase();
    })
    .split('.');

  if (name.length < 3)
    return name.reverse().join('.');

  let preffix = name[name.length - 1];
  name.pop();
  name = name.join('_');
  return `${preffix}.${name}`;


}

export function generateLocaleFromString(
  locale: string,
  phrase: string | undefined
) {
  if (!phrase) return '';
  if (!locale || phrase.includes(`${locale}.`)) return phrase;
  return `${locale}.${phrase}`;
}


/**
 * Retrieves the current locale language based on the user's browser settings.
 * If a custom locale language is selected, it will be returned instead of the browser's default.
 *
 * @returns {string} The current locale language. Default is 'en' if no custom locale is selected.
 */
export function getLocaleLanguage(): string {
  const win = getWindow();
  return win.navigator.language || "en";
  // return win?.[WINDOW_KEYS.LANGUAGE_SELECTED] || (win.navigator.language || '').split('-')[0] || "en";
}



/**
 * Generates a random string or number of specified length.
 *
 * @param length - The length of the random value to generate. Defaults to 8 characters.
 * @param onlyNumbers - When true, generates a string containing only numeric characters.
 *                      When false, generates an alphanumeric string with both uppercase and lowercase letters.
 * @returns A randomly generated string containing either alphanumeric characters or only numbers,
 *          depending on the onlyNumbers parameter.
 */
export function generateRandomValue(length: number = 8, onlyNumbers = false): string {
  const chars = onlyNumbers
    ? '0123456789'
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));

  return result;
}
