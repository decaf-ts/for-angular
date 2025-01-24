import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { Observable } from 'rxjs';

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

  static loadDummy() {
    return new (class extends TranslateLoader {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      override getTranslation(lang: string): Observable<TranslationObject> {
        return {} as unknown as Observable<TranslationObject>;
      }
    })();
  }
}
