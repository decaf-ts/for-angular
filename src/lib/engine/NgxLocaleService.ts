import { inject, Injectable } from '@angular/core';
import { ILocaleObject, ILocaleService, LocaleType } from './NgxBaseComponent';
import { TranslateService } from '@ngx-translate/core';
import { Primitives } from '@decaf-ts/decorator-validation';
import { firstValueFrom } from 'rxjs';
import { getLogger } from '../for-angular.module';
import { FunctionLike, KeyValue } from './types';
import { getLocaleFromClassName } from '../helpers';

@Injectable({
  providedIn: 'root'
})
export class NgxLocaleService implements ILocaleService {

  private translateService: TranslateService = inject(TranslateService);
  private currentLocaleKey!: string;

  async initialize(language: string, fallbackLanguage: string): Promise<void> {
    this.translateService.addLangs([language, fallbackLanguage]);
    this.translateService.setDefaultLang(fallbackLanguage);
    await firstValueFrom(this.translateService.use(language)) as ILocaleObject;
    getLogger(this.initialize).info(`Locale initialized with language: ${language} and fallback: ${fallbackLanguage}`);
  }

  private parseLocaleKey(key: string): string {
    if (this.currentLocaleKey && !key.includes(this.currentLocaleKey))
      return `${this.currentLocaleKey}.${key}`;
    return key;
  }

  async get(key: string, params?: string | KeyValue): Promise<LocaleType> {
    if(params && typeof params === Primitives.STRING)
       params = {value: params};
    try {
      let result = await firstValueFrom(this.translateService.get(this.parseLocaleKey(key), params as object));
      if(!result && this.currentLocaleKey)
        result = await firstValueFrom(this.translateService.instant(key, params as object));
      return result;
    } catch (error: unknown) {
      getLogger(this.get).info((error as Error)?.message || (error as Error | string));
      return key as string;
    }
  }

  async instant(key: string, params?: string | KeyValue): Promise<LocaleType> {
    if(params && typeof params === Primitives.STRING)
       params = {value: params} as Record<string, string>;
    try {
      return await firstValueFrom(this.translateService.instant(this.parseLocaleKey(key), params as KeyValue));
    } catch (error: unknown) {
      getLogger(this.instant).info((error as Error)?.message || (error as Error | string));
      return key as string;
    }
  }

  changeLanguage(language: string): void {
    this.translateService.use(language);
  }

  getCurrentLanguage(): string {
    return this.translateService.currentLang;
  }

  setFallbackLanguage(language: string): void {
    this.translateService.setDefaultLang(language);
  }

  getAvailableLanguages(): string[] {
    return this.translateService.getLangs();
  }

  async getTranslations(language: string): Promise<ILocaleObject> {
    this.translateService.setDefaultLang(language);
    return await firstValueFrom(this.translateService.use(language)) as ILocaleObject;
  }

  setCurrentLocaleKey(key: string | FunctionLike | object): string {
    if(!(typeof key === Primitives.STRING))
      key = getLocaleFromClassName(key);
    return this.currentLocaleKey = key as string;
  }
}
