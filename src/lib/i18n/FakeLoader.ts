/**
 * @module module:lib/i18n/FakeLoader
 * @description Simple fake translate loader used for tests or fallback scenarios.
 * @summary Implements a minimal TranslateLoader that returns a small set of default
 * translation keys. Useful for development, demos or when a full HTTP-backed loader is not available.
 *
 * @link {@link I18nFakeLoader}
 */
import { TranslateLoader } from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { KeyValue } from "../engine";

export class I18nFakeLoader implements TranslateLoader {
  getTranslation(): Observable<KeyValue> {
    return of({ HELLO: 'Hello', GOODBYE: 'Goodbye' });
  }
}
