import { Pipe, PipeTransform, inject } from '@angular/core';
import { sf } from '@decaf-ts/logging';
import { TranslateService } from '@ngx-translate/core';
import { I18nLoader } from '../i18n/Loader';
/**
 * @module DecafTranslatePipe
 * @description Angular pipe for translating text using the `@ngx-translate/core` library.
 * @summary The `DecafTranslatePipe` provides a mechanism to translate text keys into localized
 * strings based on the current language settings. It integrates with the `TranslateService`
 * to fetch translations dynamically and supports fallback rendering for untranslated keys.
 * @class DecafTranslatePipe
 * @implements {PipeTransform}
 */
@Pipe({
  name: 'translate',
  // pure: false,
  standalone: true,
})
export class DecafTranslatePipe implements PipeTransform {
  /**
   * @description Injected instance of the `TranslateService` for handling translations.
   * @type {TranslateService}
   */
  translate: TranslateService = inject(TranslateService);

  /**
   * @description Transforms a text key into its localized string representation.
   * @summary Uses the `TranslateService` to fetch the translated string for the provided key.
   * If translations are disabled or the key is not found, it returns a fallback HTML-wrapped key.
   * @param {string} value - The translation key to be transformed.
   * @param {...any[]} args - Optional arguments to interpolate within the translation string.
   * @return {string} The translated string or a fallback HTML-wrapped key.
   * @example
   * ```html
   * {{ 'HELLO_WORLD' | translate }}
   * ```
   */
  transform(value: string, ...args: []): string {
    if (I18nLoader.enabled && value) {
      return this.translate.instant(value, ...args);
    }
    return `<div class="dcf-translation-key">${sf(value, args)}</div>`;
  }
}
