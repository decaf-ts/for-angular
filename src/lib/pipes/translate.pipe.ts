import { Pipe, PipeTransform, inject } from '@angular/core';
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
  // Impure so it re-evaluates on each change-detection pass: the translation
  // resources are loaded asynchronously after bootstrap, so a pure pipe that
  // caches on the (unchanged) key would keep showing the untranslated key.
  pure: false,
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
   * While translations are enabled the translated string is returned. When translations are
   * disabled via `I18nLoader.enabled` (report mode), the raw translation key is returned so it
   * is visually identifiable on the page.
   * @param {string} value - The translation key to be transformed.
   * @param {...any[]} args - Optional arguments to interpolate within the translation string.
   * @return {string} The translated string or the raw key when translations are disabled.
   * @example
   * ```html
   * {{ 'HELLO_WORLD' | translate }}
   * ```
   */
  transform(value: string, ...args: []): string {
    if (!value?.length) return value;

    if (!I18nLoader.enabled) {
      return value;
    }

    return this.translate.instant(value, ...args);
  }
}
