import { TranslateLoader } from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { KeyValue } from "../engine";

export class I18nFakeLoader implements TranslateLoader {
  getTranslation(): Observable<KeyValue> {
    return of({ HELLO: 'Hello', GOODBYE: 'Goodbye' });
  }
}
