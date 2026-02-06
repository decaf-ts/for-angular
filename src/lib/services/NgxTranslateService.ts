import { inject, Injectable } from '@angular/core';
import {
  InterpolatableTranslationObject,
  InterpolationParameters,
  TranslateService,
  Translation,
} from '@ngx-translate/core';
import { DecafTranslateService } from '@decaf-ts/ui-decorators';
import { firstValueFrom, Observable } from 'rxjs';
import { Primitives } from '@decaf-ts/decorator-validation';

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
}
