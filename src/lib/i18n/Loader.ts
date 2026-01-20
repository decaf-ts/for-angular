/**
 * @module module:lib/i18n/Loader
 * @description Internationalization loader and helpers for the for-angular package.
 * @summary Provides an implementation of TranslateLoader (I18nLoader) and helper factories
 * to load translation resources. Also exposes locale utilities used by components to resolve
 * localized keys.
 *
 * @link {@link I18nLoader}
 */
import { inject } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideTranslateParser, provideTranslateService, RootTranslateServiceConfig, TranslateLoader, TranslateParser, TranslationObject } from '@ngx-translate/core';
import { Primitives, sf } from '@decaf-ts/decorator-validation';
import { forkJoin,  Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {I18nResourceConfig} from '../engine/interfaces';
import { FunctionLike, I18nResourceConfigType, KeyValue, AngularProvider } from '../engine/types';
import { cleanSpaces, getLocaleFromClassName } from '../utils';
import en from './data/en.json';
import { I18N_CONFIG_TOKEN } from '../engine/constants';

const libLanguage: Record<string, TranslationObject> = {en};

/**
 * @description Retrieves the locale context for a given class, object, or string.
 * @summary Resolves the locale context by extracting the class name or using the provided suffix.
 *
 * @param {FunctionLike | object | string} clazz - The class, object, or string to derive the locale context from.
 * @param {string} [suffix] - An optional suffix to append to the locale context.
 * @returns {string} - The resolved locale context string.
 */
export function getLocaleContext(clazz: FunctionLike | object | string, suffix?: string): string {
  return getLocaleFromClassName(clazz, suffix);
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
export function getLocaleContextByKey(
  locale: string,
  phrase: string | undefined
): string {
  if (!phrase)
    return locale;
  if (!locale || phrase.includes(`${locale}.`))
    return phrase;
  const parts = phrase.split(' ');
  return `${locale}.${cleanSpaces(parts.join('.'), true)}`;
}

/**
 * @description Factory function for creating an instance of I18nLoader.
 * @summary Configures and returns an I18nLoader instance with the specified HTTP client and translation resources.
 *
 * @param {HttpClient} http - The HTTP client used to fetch translation resources.
 * @returns {TranslateLoader} - An instance of I18nLoader configured with the provided HTTP client and resources.
 */
export function I18nLoaderFactory(http: HttpClient): TranslateLoader {
  const { resources, versionedSuffix } = inject(I18N_CONFIG_TOKEN, { optional: true }) ?? provideDecafI18nLoader().useValue;
  return new I18nLoader(http, resources?.length ? resources : [{ prefix: './app/assets/i18n/', suffix: '.json' }], versionedSuffix);
}

/**
 * @description Provides the I18nLoader configuration.
 * @summary Configures the translation resources and versioned suffix for the I18nLoader.
 *
 * @param {I18nResourceConfigType} [resources=[]] - The translation resources to be used by the loader.
 * @param {boolean} [versionedSuffix=false] - Whether to append a versioned suffix to resource URLs.
 * @returns {object} - The configuration object for the I18nLoader.
 */
export function provideDecafI18nLoader(resources: I18nResourceConfigType = [], versionedSuffix: boolean = false): { provide: typeof I18N_CONFIG_TOKEN; useValue: { resources: I18nResourceConfig[]; versionedSuffix: boolean } } {
  if (!Array.isArray(resources)) {
    resources = [resources];
  }
  return {
    provide: I18N_CONFIG_TOKEN,
    useValue: { resources: [...resources], versionedSuffix },
  };
}

/**
 * @description Custom implementation of TranslateLoader for loading translations.
 * @summary Fetches and merges translation resources, supporting versioned suffixes and recursive merging.
 */
export class I18nLoader implements TranslateLoader {
  /**
   * @param {HttpClient} http - The HTTP client used to fetch translation resources.
   * @param {I18nResourceConfig[]} [resources=[]] - The translation resources to be loaded.
   * @param {boolean} [versionedSuffix=false] - Whether to append a versioned suffix to resource URLs.
   */
  constructor(private http: HttpClient, private resources: I18nResourceConfig[] = [], private versionedSuffix: boolean = false) {}

  /**
   * @description Appends a versioned suffix to the resource URL if enabled.
   * @summary Generates a versioned suffix based on the current date.
   *
   * @param {string} suffix - The original suffix of the resource URL.
   * @returns {string} - The modified suffix with a version string appended.
   */
  private getSuffix(suffix: string): string {
    if (!this.versionedSuffix) {
      return suffix;
    }
    const today = new Date();
    return `${suffix}?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}`;
  }

  /**
   * @description Fetches and merges translations for the specified language.
   * @summary Loads translation resources, merges them recursively, and includes library keys.
   *
   * @param {string} lang - The language code for the translations to load.
   * @returns {Observable<TranslationObject>} - An observable that emits the merged translation object.
   */
  getTranslation(lang: string): Observable<TranslationObject> {
    const libKeys: KeyValue = libLanguage[lang] || libLanguage['en'] || {};
    const httpRequests$ = forkJoin(
      this.resources.map(config =>
        this.http.get<TranslationObject>(`${config.prefix}${lang}${this.getSuffix(config.suffix || '.json')}`)
      )
    );

    /**
     * @description Recursively merges two translation objects.
     * @summary Combines the properties of the source object into the target object.
     *
     * @param {KeyValue} target - The target object to merge into.
     * @param {KeyValue} source - The source object to merge from.
     * @returns {KeyValue} - The merged object.
     */
    function recursiveMerge(target: KeyValue, source: KeyValue): KeyValue {
      for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          recursiveMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
      return target;
    }

    return httpRequests$.pipe(
      map(res => {
        const merged = {
          ...libKeys,
          ...res.reduce((acc: KeyValue, current: KeyValue) => {
            for (const key in current) {
              let value = current[key] || {};
              if (libKeys[key]) {
                value = { ...libKeys[key], ...recursiveMerge(libKeys[key] as KeyValue, current[key] as KeyValue) };
              }
              acc[key] = value;
            }
            return acc;
          }, {}),
        };
        return merged;
      })
    );
  }
}

/**
 * @description Custom implementation of TranslateParser for interpolation.
 * @summary Extends TranslateParser to support string formatting with parameters.
 */
export class I18nParser extends TranslateParser {
  /**
   * @description Interpolates a translation string with parameters.
   * @summary Replaces placeholders in the translation string with parameter values.
   *
   * @param {string} value - The translation string to interpolate.
   * @param {object | string} [params={}] - The parameters to replace placeholders with.
   * @returns {string} - The interpolated translation string.
   */
  interpolate(value: string, params: object | string = {}): string {
    if (typeof params === Primitives.STRING) {
      params = { '0': params };
    }
    return sf(value, ...Object.values(params)).replace(/undefined/g, "");
  }
}

/**
 * @description Provides the internationalization (i18n) configuration for the application.
 * @summary Configures the translation service with a fallback language, default language, custom parser, and loader.
 *
 * @param {RootTranslateServiceConfig} [config={fallbackLang: 'en', lang: 'en'}] - The configuration for the translation service, including fallback and default languages.
 * @param {I18nResourceConfigType} [resources=[]] - The translation resources to be used by the loader.
 * @param {boolean} [versionedSuffix=false] - Whether to append a versioned suffix to resource URLs.
 * @returns {AngularProvider[]} - An array of providers for the translation service and loader.
 */
export function provideDecafI18nConfig(
  config: RootTranslateServiceConfig = { fallbackLang: 'en', lang: 'en' },
  resources: I18nResourceConfigType = [],
  versionedSuffix: boolean = false
): AngularProvider[] {
  return [
    provideHttpClient(),
    provideTranslateService({
      fallbackLang: config.fallbackLang,
      lang: config.lang,
      parser: provideTranslateParser(I18nParser),
      loader: {
        provide: TranslateLoader,
        useFactory: I18nLoaderFactory,
        deps: [HttpClient],
      },
    }),
    provideDecafI18nLoader(resources, versionedSuffix),
  ];
}
