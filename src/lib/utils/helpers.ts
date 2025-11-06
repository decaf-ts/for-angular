/**
 * @module module:lib/helpers/utils
 * @description General helper utilities used across the library.
 * @summary Exposes small, reusable utility functions for window/document access, date handling,
 * string manipulation, simple mapping helpers and environment helpers used by UI components
 * and services. This module's functions include `getWindow`, `getWindowDocument`, `formatDate`,
 * `isValidDate`, `itemMapper`, `dataMapper`, and event helpers like `windowEventEmitter`.
 *
 * Do not document individual exports here — functions are documented inline.
 * @link {@link getWindow}
 */

import { isDevMode } from '@angular/core';
import { InjectableRegistryImp, InjectablesRegistry } from '@decaf-ts/injectable-decorators';
import { Primitives } from '@decaf-ts/decorator-validation';
import { KeyValue, StringOrBoolean, } from '../engine/types';
import { FunctionLike } from '../engine/types';
import { getLogger } from '../for-angular-common.module';

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
export function isDevelopmentMode(context: string = 'localhost'): boolean {
  if (!context)
    return isDevMode();
  const win = getWindow();
  return (
    isDevMode() ||
    win?.['env']?.['CONTEXT'].toLowerCase() !== context.toLowerCase() ||
    win?.['location']?.hostname?.includes(context)
  );
}

/**
 * @description Dispatches a custom event to the document window
 * @summary This function creates and dispatches a custom event to the browser window.
 * It's useful for cross-component communication or for triggering application-wide events.
 * The function allows specifying the event name, detail data, and additional event properties.
 *
 * @param {string} name - The name of the custom event to dispatch
 * @param {unknown} detail - The data to include in the event's detail property
 * @param {object} [props] - Optional additional properties for the custom event
 * @return {void}
 *
 * @function windowEventEmitter
 * @memberOf module:for-angular
 */
export function windowEventEmitter(
  name: string,
  detail: unknown,
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
  (getWindow() as Window).dispatchEvent(new CustomEvent(name, data));
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
export function getOnWindowDocument(key: string): Document | undefined {
  const doc = getWindowDocument()?.[key as keyof Document];
  return doc instanceof Document ?
    doc : undefined;
}

/**
 * @description Retrieves the document object from the window
 * @summary This function provides a safe way to access the document object from the window.
 * It uses the getOnWindow function to retrieve the 'document' property from the window object.
 * This is useful for browser environment interactions that need access to the document.
 *
 * @return {Document | undefined} The window's document object, or undefined if it doesn't exist
 *
 * @function getWindowDocument
 * @memberOf module:for-angular
 */
export function getWindowDocument(): Document | undefined {
  return getOnWindow('document') as Document;
}

/**
 * @description Retrieves a property from the window object
 * @summary This function provides a safe way to access properties on the window object.
 * It uses the getWindow function to get a reference to the window, then accesses
 * the specified property. This is useful for browser environment interactions that need
 * to access window properties or APIs.
 *
 * @param {string} key - The name of the property to retrieve from the window object
 * @return {unknown | undefined} The value of the specified property, or undefined if the window or property doesn't exist
 *
 * @function getOnWindow
 * @memberOf module:for-angular
 */
export function getOnWindow(key: string): unknown | undefined {
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
export function setOnWindow(key: string, value: unknown): void {
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
export function getWindow(): Window & KeyValue {
  return (globalThis as KeyValue)?.['window'] as Window & KeyValue;
}

/**
 * @description Retrieves the width of the browser window
 * @summary This function provides a convenient way to get the current width of the browser window.
 * It uses the getOnWindow function to access the 'innerWidth' property of the window object.
 * This is useful for responsive design implementations and viewport-based calculations.
 *
 * @return {number | undefined} The current width of the browser window in pixels
 *
 * @function getWindowWidth
 * @memberOf module:for-angular
 */
export function getWindowWidth(): number {
  return getOnWindow('innerWidth') as number || 0;
}

/**
 * @description Checks if a value is  not undefined
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
 * @param {string|FunctionLike|object} instance - The input to generate the locale from (class name, constructor, or instance)
 * @param {string} [suffix] - Optional string to append to the instance name before processing
 * @return {string} A formatted locale string derived from the input
 *
 * @function getLocaleFromClassName
 * @memberOf module:for-angular
 */
export function getLocaleFromClassName(
  instance: string | FunctionLike | KeyValue,
  suffix?: string
): string {
  if (typeof instance !== Primitives.STRING)
    instance = (instance as FunctionLike).name || (instance as object)?.constructor?.name;

  let name: string | string[] = instance as string;

  if (suffix)
    name = `${instance}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`;

  name = name.replace(/_|-/g, '').replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, index: number) => {
      if (index > 1) word = '.' + word;
      return word.toLowerCase();
    }).split('.');

  if (name.length < 3)
    return name.reverse().join('.');

  const preffix = name[name.length - 1];
  name.pop();
  name = name.join('_');
  return `${preffix}.${name}`;
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
  return (win as Window).navigator.language || "en";
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
export function generateRandomValue(length: number = 8, onlyNumbers: boolean = false): string {
  const chars = onlyNumbers
    ? '0123456789'
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));

  return result;
}


/**
 * @description Converts a string representation of a boolean or a boolean value to a boolean type.
 * @summary This utility function handles conversion of string-based boolean values ('true', 'false')
 * to actual boolean types. It performs case-insensitive string comparison and returns the
 * corresponding boolean value. This is particularly useful when parsing configuration values,
 * URL parameters, or form inputs that may come as strings but need to be used as booleans.
 *
 * @param {'true' | 'false' | boolean} prop - The value to convert. Can be the string 'true', 'false', or a boolean
 * @returns {boolean} The boolean representation of the input value. Returns true if the input is the string 'true' or boolean true, false otherwise
 *
 * @function stringToBoolean
 * @memberOf module:lib/helpers/utils
 */
export function stringToBoolean(prop: 'true' | 'false' | boolean): boolean {
  if (typeof prop === 'string')
    prop = prop.toLowerCase() === 'true' ? true : false;
  return prop;
}


/**
 * @description Checks if a value is a valid Date object.
 * @summary This validation function determines whether a given value represents a valid date.
 * It handles multiple input types including Date objects, timestamp numbers, and date strings.
 * For string inputs, it supports ISO 8601 format (YYYY-MM-DD) with or without time components.
 * The function performs comprehensive validation including regex pattern matching and Date
 * object creation to ensure the date is not only parseable but also represents a real date.
 *
 * @param {string | Date | number} date - The value to check. Can be a Date object, a timestamp number, or a date string
 * @returns {boolean} Returns true if the value is a valid Date object (not NaN), otherwise false
 *
 * @function isValidDate
 * @memberOf module:lib/helpers/utils
 */
export function isValidDate(date: string | Date | number): boolean {
  try {
    return (date instanceof Date && !isNaN(date as unknown as number)) || (() => {
      const testRegex = new RegExp(/^\d{4}-\d{2}-\d{2}$/).test(date as string)
      if (typeof date !== Primitives.STRING || !(date as string)?.includes('T') && !testRegex)
         return false;

     date = (date as string).split('T')[0];
    if (!new RegExp(/^\d{4}-\d{2}-\d{2}$/).test(date))
      return false;

    return !!(new Date(date));
   })();
  } catch(error: unknown) {
    getLogger(isValidDate).error(error as Error | string);
    return false;
  }
}

/**
 * @description Formats a date into a localized string representation.
 * @summary This function converts a date value into a formatted string according to a specified
 * or system locale. It accepts multiple input formats (Date objects, timestamps, or date strings)
 * and returns a consistently formatted date string in DD/MM/YYYY format. If the input date is
 * invalid, the function returns the original input as a string. The function automatically
 * uses the system locale if none is provided and handles string format conversions by replacing
 * forward slashes with hyphens for proper Date parsing.
 *
 * @param {string | Date | number} date - The date to format. Can be a Date object, a timestamp number, or a date string
 * @param {string} [locale] - The locale to use for formatting. If not provided, the system's locale will be used
 * @returns {Date | string} A formatted date string in the format DD/MM/YYYY according to the specified locale,
 *                          or the original input as a string if the date is invalid
 *
 * @function formatDate
 * @memberOf module:lib/helpers/utils
 */
export function formatDate(date: string | Date | number, locale?: string | undefined): Date | string {

  if (!locale)
    locale = getLocaleLanguage();

  if (typeof date === 'string' || typeof date === 'number')
    date = new Date(typeof date === 'string' ? date.replace(/\//g, '-') : date);

  if (!isValidDate(date))
    return `${date}` as string;
  const r = date.toLocaleString(locale, {
      year: "numeric",
      day: "2-digit",
      month: '2-digit'
  });


  return r;
}

/**
 * @description Attempts to parse a date string, Date object, or number into a valid Date object.
 * @summary This function provides robust date parsing functionality that handles the specific
 * format "DD/MM/YYYY HH:MM:SS:MS". It first validates the input date, and if already valid,
 * returns it as-is. For string inputs, it parses the date and time components separately,
 * extracts numeric values, and constructs a new Date object. The function includes validation
 * to ensure the resulting Date object is valid and logs a warning if parsing fails.
 * Returns null for invalid or unsupported date formats.
 *
 * @param {string | Date | number} date - The date to parse. Can be a Date object, a timestamp number,
 *                                        or a date string in the format "DD/MM/YYYY HH:MM:SS:MS"
 * @returns {Date | null} A valid Date object if parsing is successful, or null if the date is invalid
 *                        or doesn't match the expected format
 *
 * @function parseToValidDate
 * @memberOf module:lib/helpers/utils
 */
export function parseToValidDate(date: string | Date | number): Date | null {
  if (isValidDate(date))
    return date as Date;

  if (!`${date}`.includes('/'))
    return null;

  const [dateString, timeString] = (date as string).split(' ');
  const [day, month, year] = dateString.split('/').map(Number);
  const [hours, minutes, seconds, milliseconds] = timeString.split(':').map(Number);
  date = new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);

  if (!isValidDate(date)) {
    console.warn('parseToValidDate - Invalid date format', date);
    return null;
  }

  return date;
}


/**
 * @description Maps an item object using a provided mapper object and optional additional properties.
 * @summary This function transforms a source object into a new object based on mapping rules defined
 * in the mapper parameter. It supports dot notation for nested property access (e.g., 'user.name.first')
 * and handles various data types including strings and complex objects. For date values, it automatically
 * formats them using the formatDate function. The function also allows merging additional properties
 * into the result. When a mapped value is null or undefined, it uses the original mapper value as
 * a fallback.
 *
 * @param {KeyValue} item - The source object to be mapped
 * @param {KeyValue} mapper - An object that defines the mapping rules. Keys represent the new property names,
 *                            and values represent the path to the corresponding values in the source object
 * @param {KeyValue} [props] - Optional additional properties to be included in the mapped object
 * @returns {KeyValue} A new object with properties mapped according to the mapper object and including any additional properties
 *
 * @function itemMapper
 * @memberOf module:lib/helpers/utils
 */
export function itemMapper(item: KeyValue, mapper: KeyValue, props?: KeyValue): KeyValue {
  return Object.entries(mapper).reduce((accum: KeyValue, [key, value]) => {
    const arrayValue = (value as string).split('.');
    if (!value) {
      accum[key] = value;
    } else {
      if (arrayValue.length === 1) {
        accum[key] = item?.[value as string] || (value !== key ? value : "");
      } else {
        let val;

        for (const _value of arrayValue)
          val = !val
            ? item[_value]
            : (typeof val === 'string' ? JSON.parse(val) : val)[_value];

        if (isValidDate(new Date(val))) val = `${formatDate(val)}`;

        accum[key] = val === null || val === undefined ? value : val;
      }
    }
    return Object.assign({}, props || {}, accum);
  }, {});
}

/**
 * @description Maps an array of data objects using a provided mapper object.
 * @summary This function transforms an array of objects by applying mapping rules to each item
 * using the itemMapper function. It processes each element in the data array and creates
 * new mapped objects based on the mapper configuration. The function includes validation
 * to ensure meaningful data: if a mapped item contains only null/undefined values, it
 * preserves the original item instead. This prevents data loss during transformation.
 * Returns an empty array if the input data is null, undefined, or empty.
 *
 * @template T - The type of the resulting mapped items
 * @param {T[]} data - The array of data objects to be mapped
 * @param {KeyValue} mapper - An object that defines the mapping rules
 * @param {KeyValue} [props] - Additional properties to be included in the mapped items
 * @returns {T[]} The array of mapped items. If an item in the original array does not have any non-null values after mapping,
 *                the original item is returned instead
 *
 * @function dataMapper
 * @memberOf module:lib/helpers/utils
 */
export function dataMapper<T>(data: T[], mapper: KeyValue, props?: KeyValue): T[] {
  if (!data || !data.length) return [];
  return data.reduce((accum: T[], curr) => {
    const item = itemMapper(curr as KeyValue, mapper, props) as T;
    const hasValues =
      [...new Set(Object.values(item as T[]))].filter((value) => value).length >
      0;
    accum.push(hasValues ? item : curr);
    return accum;
  }, []);
}

/**
 * @description Removes focus from the currently active DOM element
 * @summary This utility function blurs the currently focused element in the document,
 * effectively removing focus traps that might prevent proper navigation or keyboard
 * interaction. It safely accesses the document's activeElement and calls blur() if
 * an element is currently focused. This is useful for accessibility and user experience
 * improvements, particularly when closing modals or dialogs.
 *
 * @return {void}
 *
 * @function removeFocusTrap
 * @memberOf module:for-angular
 */
export function removeFocusTrap(): void {
  const doc = getWindowDocument();
  if (doc?.activeElement)
    (doc.activeElement as HTMLElement)?.blur();
}

/**
 * @description Cleans and normalizes whitespace in a string value
 * @summary This utility function trims leading and trailing whitespace from a string
 * and replaces multiple consecutive whitespace characters with a single space.
 * Optionally converts the result to lowercase for consistent text processing.
 * This is useful for normalizing user input, search terms, or data sanitization.
 *
 * @param {string} value - The string value to clean and normalize
 * @param {boolean} [lowercase=false] - Whether to convert the result to lowercase
 * @return {string} The cleaned and normalized string
 *
 * @function cleanSpaces
 * @memberOf module:for-angular
 */
export function cleanSpaces(value: string = "", lowercase: boolean = false): string {
  value = `${value}`.trim().replace(/\s+/g, ' ');
  return lowercase ? value.toLowerCase() : value;
}


/**
 * @description Determines if the user's system is currently in dark mode
 * @summary This function checks the user's color scheme preference using the CSS media query
 * '(prefers-color-scheme: dark)'. It returns a boolean indicating whether the system is
 * currently set to dark mode. This is useful for implementing theme-aware functionality
 * and adjusting UI elements based on the user's preferred color scheme.
 *
 * @return {Promise<boolean>} True if the system is in dark mode, false otherwise
 *
 * @function isDarkMode
 * @memberOf module:for-angular
 */
export async function isDarkMode(): Promise<boolean> {
  const {matches} = getWindow().matchMedia('(prefers-color-scheme: dark)');
  return matches;
}

/**
 * @description Filters out strings containing or not containing a specific substring from an array or space-separated string.
 * @summary This function removes or retains strings based on whether they include the specified substring.
 * If the input is a single string, it is split into an array using spaces as delimiters before filtering.
 *
 * @param {string | string[]} original - The input string or array of strings to filter.
 * @param {string} value - The substring to filter by.
 * @param {boolean} [contain=true] - Determines the filtering behavior. If true, retains strings containing the substring; otherwise, removes them.
 * @returns {string} A string that contains or excludes the specified substring based on the `contain` parameter.
 *
 * @function filterString
 * @memberOf module:lib/helpers/utils
 */
export function filterString(original: string | string[], value: string, contain: boolean = true): string {
  if (typeof original === Primitives.STRING)
    original = (original as string).split(' ');
   return ((original as string[]).filter(str =>
    contain ?
      str.includes(value) : !str.includes(value)
  ) || []).join(' ');
}
