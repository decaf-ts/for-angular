import { inject, Injectable } from '@angular/core';
import { Primitives } from '@decaf-ts/decorator-validation';
import { DecafTranslateService } from '@decaf-ts/ui-decorators';
import {
  InterpolatableTranslationObject,
  InterpolationParameters,
  Language,
  TranslateService,
  Translation,
} from '@ngx-translate/core';
import { firstValueFrom, Observable } from 'rxjs';
import { I18nLoader } from '../i18n';

@Injectable({
  providedIn: 'root',
})
export class NgxTranslateService extends DecafTranslateService implements DecafTranslateService {
  private translateService = inject(TranslateService);

  override instant(key: string, interpolateParams?: InterpolationParameters): Translation {
    return this.translateService.instant(key, interpolateParams);
  }

  override translate(key: string, params?: InterpolationParameters): Translation {
    return this.instant(key, params);
  }

  async get(key: string | string[], params?: InterpolationParameters | string): Promise<string> {
    if (key) {
      if (typeof params === Primitives.STRING) {
        params = { '0': params };
      }
      return await firstValueFrom(this.translateService.get(key, (params || {}) as object));
    }
    return key;
  }

  use(lang: string): void {
    this.translateService.use(lang);
  }

  setFallbackLang(lang: string): Observable<InterpolatableTranslationObject> {
    return this.translateService.setFallbackLang(lang);
  }

  getCurrentLang(): Language {
    return this.translateService.getCurrentLang();
  }

  getOnCache(lang?: string): Translation {
    if (!lang) {
      lang = this.getCurrentLang();
    }
    return I18nLoader.cache[lang] || {};
  }
}
