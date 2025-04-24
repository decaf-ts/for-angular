import { isDevMode } from '@angular/core';
import { StringOrBoolean, KeyValue } from '../engine/types';
import { formatDate, isValidDate } from './date';
import { stringToCapitalCase } from './string';
import {
  InjectableRegistryImp,
  InjectablesRegistry,
} from '@decaf-ts/injectable-decorators';

let injectableRegistry: InjectablesRegistry;

export function getInjectablesRegistry(): InjectablesRegistry {
  if (injectableRegistry) injectableRegistry = new InjectableRegistryImp();
  return injectableRegistry;
}

export function isDevelopmentMode(context: string = 'localhost') {
  if (!context) return isDevMode();
  return (
    isDevMode() ||
    getWindow()?.['env']?.['CONTEXT'].toLowerCase() !== context.toLowerCase() ||
    window.location.hostname.includes(context)
  );
}

/**
 * Dispatch custom event to document window
 *
 * @param  {name} string
 * @param  {string|boolean|number|object} detail
 * @returns void
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
export function getOnWindowDocument(key: string) {
  return getWindowDocument()?.[key];
}

export function getWindowDocument() {
  return getOnWindow('document');
}

export function getOnWindow(key: string) {
  return getWindow()?.[key];
}

export function setOnWindow(key: string, value: any) {
  getWindow()[key] = value;
}

export function getWindow() {
  return globalThis.window as Window & KeyValue;
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

  if (name.length < 3) return name.reverse().join('.');
  name.pop();
  return `${name[name.length - 1]}.${name.join('_')}`;
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
  return 'en';
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
