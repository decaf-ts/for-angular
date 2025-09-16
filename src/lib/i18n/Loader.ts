import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { forkJoin, from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {I18nResourceConfig} from '../engine/interfaces';
import { inject, InjectionToken } from '@angular/core';
import { FunctionLike, KeyValue } from '../engine';
import { cleanSpaces, getLocaleFromClassName } from '../helpers';
import en from './data/en.json';
export class I18nLoader {
  static loadFromHttp(http: HttpClient): TranslateLoader {
    function getSuffix() {
      const today = new Date();
      return `.json?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}` as string;
    }

    return new (class extends TranslateHttpLoader {
      override getTranslation(lang: string): Observable<TranslationObject> {
        const res = super.getTranslation(lang);
        return res;
      }
    })(http, './assets/i18n/', getSuffix());
  }
}


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

export const I18N_CONFIG_TOKEN = new InjectionToken<{resources: I18nResourceConfig[]; versionedSuffix: false}>('I18N_CONFIG_TOKEN');

export function I18nLoaderFactory(http: HttpClient): TranslateLoader {
  const {resources, versionedSuffix} = inject(I18N_CONFIG_TOKEN, { optional: true }) ?? getI18nLoaderFactoryProviderConfig().useValue;
  return new MultiI18nLoader(http, resources, versionedSuffix);
}

export function getI18nLoaderFactoryProviderConfig(resources: I18nResourceConfig | I18nResourceConfig[] = [], versionedSuffix: boolean = false) {
  if(!Array.isArray(resources))
    resources = [resources];
  return {
    provide: I18N_CONFIG_TOKEN,
    useValue: { resources: [
      { prefix: './assets/i18n/', suffix: '.json' },
      ...resources
    ], versionedSuffix}
  }
}

const libLanguage: Record<string, TranslationObject> = {en};

export class MultiI18nLoader implements I18nLoader {
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

  // getTranslation(lang: string): Observable<TranslationObject> {
  //   const libLanguage = (async () => await import(`./data/${lang}.json`).then(mod => mod.default))();

  //   const httpRequests$: Observable<TranslationObject[]> = forkJoin(
  //     this.resources.map(config =>
  //       this.http.get<TranslationObject>(`${config.prefix}${lang}${this.getSuffix(config.suffix)}`)
  //     )
  //   );

  //   return from(libLanguage).pipe(
  //     switchMap(libKeys =>
  //       httpRequests$.pipe(
  //         map(res => {
  //           console.log('loaded component language keys');
  //           console.log(libKeys);
  //           return {
  //             ...libKeys,
  //             ...res.reduce((acc, current) => ({ ...acc, ...current }), {})
  //           };
  //         })
  //       )
  //     )
  //   );
  // }
}
