import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { forkJoin,  Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {I18nResourceConfig} from '../engine/interfaces';
import { inject } from '@angular/core';
import { FunctionLike } from '../engine';
import { cleanSpaces, getLocaleFromClassName } from '../helpers';
import en from './data/en.json';
import { I18N_CONFIG_TOKEN } from '../for-angular-common.module';


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

export function provideI18nLoader(resources: I18nResourceConfig | I18nResourceConfig[] = [], versionedSuffix: boolean = false) {
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
