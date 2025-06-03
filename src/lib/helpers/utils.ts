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

/**
 * @description Retrieves the width of the browser window
 * @summary This function provides a convenient way to get the current width of the browser window.
 * It uses the getOnWindow function to access the 'innerWidth' property of the window object.
 * This is useful for responsive design implementations and viewport-based calculations.
 *
 * @return {number} The current width of the browser window in pixels
 *
 * @function getWindowWidth
 * @memberOf module:for-angular
 */
export function getWindowWidth() {
  return getOnWindow('innerWidth');
}

/**
 * @description Checks if a value is not undefined
 * @summary This utility function determines whether a given value is not undefined.
 * It's a simple wrapper that makes code more readable when checking for defined values.
 * The function is particularly useful for checking StringOrBoolean properties that might be undefined.
 *
 * @param {StringOrBoolean | undefined} prop - The property to check
 * @return {boolean} True if the property is not undefined, false otherwise
 *
 * @function isNotUndefined
 * @memberOf module:for-angular
 */
export function isNotUndefined(prop: StringOrBoolean | undefined): boolean {
  return (prop !== undefined) as boolean;
}

/**
 * @description Generates a locale string from a class name or instance
 * @summary This utility function converts a class name or instance into a locale string
 * that can be used for internationalization purposes. It handles different input types
 * (string, function, or object) and applies formatting rules to generate a consistent
 * locale identifier. For short names (less than 3 parts), it reverses the dot-separated
 * string. For longer names, it uses the last part as a prefix and joins the rest with
 * underscores.
 *
 * @param {string|Function|object} instance - The input to generate the locale from (class name, constructor, or instance)
 * @param {string} [suffix] - Optional string to append to the instance name before processing
 * @return {string} A formatted locale string derived from the input
 *
 * @function getLocaleFromClassName
 * @memberOf module:for-angular
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

/**
 * @description Generates a localized string by combining locale and phrase
 * @summary This utility function creates a properly formatted locale string by combining
 * a locale identifier with a phrase. It handles edge cases such as empty phrases,
 * missing locales, and phrases that already include the locale prefix. This function
 * is useful for ensuring consistent formatting of localized strings throughout the application.
 *
 * @param {string} locale - The locale identifier (e.g., 'en', 'fr')
 * @param {string | undefined} phrase - The phrase to localize
 * @return {string} The formatted locale string, or empty string if phrase is undefined
 *
 * @function generateLocaleFromString
 * @memberOf module:for-angular
 */
export function generateLocaleFromString(
  locale: string,
  phrase: string | undefined
) {
  if (!phrase) return '';
  if (!locale || phrase.includes(`${locale}.`)) return phrase;
  return `${locale}.${phrase}`;
}


/**
 * @description Retrieves the current locale language
 * @summary This utility function gets the current locale language based on the user's browser settings.
 * It provides a consistent way to access the user's language preference throughout the application.
 * The function returns the browser's navigator.language value, defaulting to 'en' if not available.
 *
 * @return {string} The current locale language (e.g., 'en', 'fr')
 *
 * @function getLocaleLanguage
 * @memberOf module:for-angular
 */
export function getLocaleLanguage(): string {
  const win = getWindow();
  return win.navigator.language || "en";
  // return win?.[WINDOW_KEYS.LANGUAGE_SELECTED] || (win.navigator.language || '').split('-')[0] || "en";
}



/**
 * @description Generates a random string or number of specified length
 * @summary This utility function creates a random string of a specified length.
 * It can generate either alphanumeric strings (including uppercase and lowercase letters)
 * or numeric-only strings. This is useful for creating random IDs, temporary passwords,
 * or other random identifiers throughout the application.
 *
 * @param {number} [length=8] - The length of the random value to generate
 * @param {boolean} [onlyNumbers=false] - Whether to generate only numeric characters
 * @return {string} A randomly generated string of the specified length and character set
 *
 * @function generateRandomValue
 * @memberOf module:for-angular
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
