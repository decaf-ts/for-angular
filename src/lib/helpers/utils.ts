import { isDevMode } from "@angular/core";
import { StringOrBoolean, KeyValue } from "../engine/types";
import { formatDate, isValidDate } from "./date";
import { stringToCapitalCase } from "./string";
import { InjectableRegistryImp, InjectablesRegistry} from "@decaf-ts/injectable-decorators";

let injectableRegistry: InjectablesRegistry;

export function getInjectablesRegistry(): InjectablesRegistry {
  if(injectableRegistry)
    injectableRegistry = new InjectableRegistryImp();
  return injectableRegistry;
}

export function isDevelopmentMode(context: string = "localhost") {
  if(!context)
    return isDevMode();
  return isDevMode() || getWindow()?.['env']?.['CONTEXT'].toLowerCase() !== context.toLowerCase() || window.location.hostname.includes(context);
};


/**
 * Dispatch custom event to document window
 *
 * @param  {name} string
 * @param  {string|boolean|number|object} detail
 * @returns void
 */
export function windowEventEmitter(name: string, detail: any, props?: object): void {
  const data = Object.assign({
      bubbles: true,
      composed: true,
      cancelable: false,
      detail: detail
    }, props || {});
  getWindow().dispatchEvent(new CustomEvent(name, data));
}
export function getOnWindowDocument(key: string) {
  return getWindowDocument()?.[key];
}

export function getWindowDocument()  {
  return getOnWindow("document");
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


export function isNotUndefined(prop: StringOrBoolean | undefined) {
  return (prop !== undefined) as boolean;
}

export function itemMapper(item: KeyValue, mapper: KeyValue, props?: KeyValue) {
  return Object.entries(mapper).reduce((accum: KeyValue, [key, value]) => {
    const arrayValue = value.split(".");
    if (!value) {
      accum[key] = value;
    } else {
      if (arrayValue.length === 1) {
        accum[key] = item?.[value] || value;
      } else {
        let val;

        for (let _value of arrayValue)
          val = !val ? item[_value] : (typeof val === 'string' ? JSON.parse(val) : val)[_value];

        if (isValidDate(new Date(val)))
          val = `${formatDate(val)}`;

        accum[key] = (val === null || val === undefined) ? value : val;
      }
    }
    return Object.assign({}, props || {}, accum);
  }, {});
}

export function dataMapper<T>(data: any[], mapper: KeyValue, props?: KeyValue) {
  if(!data || !data.length)
      return [];
  // consoleInfo(dataMapper, `Mapping data with mapper ${JSON.stringify(mapper)}`);
  return data.reduce((accum: T[], curr) => {
    let item = itemMapper(curr, mapper, props) as T;
    const hasValues = [... new Set(Object.values(item as T[]))].filter(value => value).length > 0;
    // caso o item filtrado não possua nenhum valor, passar o objeto original
    accum.push(hasValues ? item : curr);
    return accum;
  }, []);
}

export function queryInArray(results: KeyValue[], query: string) {
  return results.filter((item: KeyValue) =>
    Object.values(item).some(value => value.toString().toLowerCase().includes((query as string)?.toLowerCase()))
  );
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
export function getLocaleFromClassName(instance: string | Function | object, suffix?: string): string {
  if(typeof instance !== 'string')
    instance = (instance as Function).name || (instance as object)?.constructor?.name;

  let name: string | string[] = instance;

  if(suffix)
    name = `${instance}${stringToCapitalCase(suffix)}`;

  name = name.replace(/_|-/g, '').replace(/(?:^\w\_|[A-Z]|\b\w)/g, (word: string, index: number) => {
      if(index > 1)
        word = '.'+word;
      return word.toLowerCase();
  }).split('.');

  if(name.length < 3)
    return name.reverse().join('.');
  name.pop();
  return `${name[name.length - 1]}.${name.join('_')}`;
}

export function generateLocaleFromString(locale: string, phrase: string | undefined) {
  if(!phrase)
    return "";
  if(!locale || phrase.includes(`${locale}.`))
    return phrase;
  return `${locale}.${phrase}`;
}

/**
 *
 * Get selected language setted by locale service on window
 */
export function getLocaleLanguage() {
  const win = getWindow();
  return "en";
  // return win?.[WINDOW_KEYS.LANGUAGE_SELECTED] || (win.navigator.language || '').split('-')[0] || "en";
}


/**
 * Generate random string
 *
 * @param  {number=8} length
 */
export function generateRandomValue(stringLength: number = 8, onlyNumbers = false) {
  const chars = onlyNumbers ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = "";
  for(let i = 0; i < stringLength; i++ )
    result += chars.charAt(Math.floor(Math.random() * chars.length));

  return result;
}

