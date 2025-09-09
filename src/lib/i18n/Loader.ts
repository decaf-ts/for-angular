import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {I18nResourceConfig} from '../engine/interfaces';
import { inject, InjectionToken } from '@angular/core';
import { FunctionLike } from '../engine';
import { getLocaleFromClassName } from '../public-apis';
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


export function getLocaleContext(clazz: FunctionLike | object | string) {
  return getLocaleFromClassName(clazz);
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

export class MultiI18nLoader implements TranslateLoader {
  constructor(private http: HttpClient, private resources: I18nResourceConfig[] = [], private versionedSuffix: boolean = false) {}

  // Sources of components

  private getSuffix(suffix: string): string {
    if(!this.versionedSuffix)
      return suffix;
    const today = new Date();
    return `${suffix}?version=${today.getFullYear()}${today.getMonth()}${today.getDay()}` as string;
  }

  getTranslation(lang: string): Observable<TranslationObject> {
    const requests = this.resources.map(config =>
      this.http.get(`${config.prefix}${lang}${this.getSuffix(config.suffix)}`)
    );

    return forkJoin(requests).pipe(
      map(responseArray => {
        return responseArray.reduce((acc, current) => {
          return { ...acc, ...current };
        }, {});
      })
    );
  }
}
