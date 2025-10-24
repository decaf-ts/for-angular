/**
 * @module module:lib/i18n/Loader
 * @description Internationalization loader and helpers for the for-angular package.
 * @summary Provides an implementation of TranslateLoader (I18nLoader) and helper factories
 * to load translation resources. Also exposes locale utilities used by components to resolve
 * localized keys.
 *
 * @link {@link I18nLoader}
 */
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideTranslateParser, provideTranslateService, RootTranslateServiceConfig, TranslateLoader, TranslateParser, TranslationObject } from '@ngx-translate/core';
import { forkJoin,  Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {I18nResourceConfig} from '../engine/interfaces';
import { inject } from '@angular/core';
import { FunctionLike, I18nResourceConfigType } from '../engine';
import { cleanSpaces, getLocaleFromClassName } from '../helpers';
import en from './data/en.json';
import { I18N_CONFIG_TOKEN } from '../for-angular-common.module';
import { Primitives, sf } from '@decaf-ts/decorator-validation';


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

export function I18nLoaderFactory(http: HttpClient): TranslateLoader {
  const {resources, versionedSuffix} = inject(I18N_CONFIG_TOKEN, { optional: true }) ?? provideI18nLoader().useValue;
  return new I18nLoader(http, resources?.length ? resources : [{prefix: './app/assets/i18n/', suffix: '.json'}], versionedSuffix);
}

export function provideI18nLoader(resources: I18nResourceConfigType = [], versionedSuffix: boolean = false) {
  if(!Array.isArray(resources))
    resources = [resources];
  return {
    provide: I18N_CONFIG_TOKEN,
    useValue: { resources: [
      ...resources
    ], versionedSuffix}
  }
}

const libLanguage: Record<string, TranslationObject> = {en};

export class I18nLoader implements TranslateLoader {
  constructor(private http: HttpClient, private resources: I18nResourceConfig[] = [], private versionedSuffix: boolean = false) {}

  private getSuffix(suffix: string): string {
    if(!this.versionedSuffix)
      return suffix;
    const today = new Date();
    return `${suffix}?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}` as string;
  }

  getTranslation(lang: string): Observable<TranslationObject> {
    const libKeys = libLanguage[lang] || libLanguage["en"] || {};
    const httpRequests$ = forkJoin(
      this.resources.map(config =>
        this.http.get<TranslationObject>(
          `${config.prefix}${lang}${this.getSuffix(config.suffix)}`
        )
      )
    );

    return httpRequests$.pipe(
      map(res => {
        return {
          ...libKeys,
          ...res.reduce((acc, current) => ({ ...acc, ...current }), {})
        };
      })
    );
  }
}


export class I18nParser extends TranslateParser {
  interpolate(value: string, params: object | string = {}): string {
    if(typeof params === Primitives.STRING)
      params = {"0": params};
   return sf(value, ...Object.values(params));
  }
}

export function provideI18n(
  config: RootTranslateServiceConfig = {fallbackLang: 'en', lang: 'en'},
  resources: I18nResourceConfigType = [],
  versionedSuffix: boolean = false
) {
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
    provideI18nLoader(resources, versionedSuffix)
  ]
}
