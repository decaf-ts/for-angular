/**
 * @module lib/pipes/safe-html.pipe
 * @description Angular pipe used to render trusted library-generated HTML.
 * @summary Exposes {@link DecafSafeHtmlPipe} for icon and content markup bindings.
 */
import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * @description Angular pipe that marks trusted application HTML for rendering.
 * @summary Delegates to `DomSanitizer` so templates can render trusted HTML strings.
 *
 * **WARNING — trusted markup only.** This pipe *bypasses* Angular's sanitizer entirely
 * (`bypassSecurityTrustHtml`): whatever enters it renders as-is, including `<script>` and
 * `onerror` payloads. Bind only developer-controlled markup (icon SVG constants from this
 * library, literals in this repo's own templates, or trusted translated markup). Never pipe
 * caller-supplied, user, or remote unescaped data through `safeHtml` — those bindings must use plain
 * `[innerHTML]` so Angular's default sanitizer runs. Trusted markup is restricted to translated
 * and developer-controlled markup only.
 * @class DecafSafeHtmlPipe
 * @example
 * ```html
 * <span [innerHTML]="iconMarkup | safeHtml"></span>
 * ```
 * @mermaid
 * sequenceDiagram
 *   Template->>DecafSafeHtmlPipe: transform(markup)
 *   DecafSafeHtmlPipe->>DomSanitizer: bypassSecurityTrustHtml(markup)
 *   DomSanitizer-->>Template: Return SafeHtml
 */
@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class DecafSafeHtmlPipe implements PipeTransform {
  /**
   * @description Angular sanitizer used to create a trusted HTML value.
   * @summary Provides the platform sanitizer service used by {@link DecafSafeHtmlPipe.transform} for innerHTML bindings.
   */
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * @description Converts an HTML string to Angular's trusted HTML wrapper.
   * @summary Produces the safe value consumed by an Angular `[innerHTML]` binding.
   * **WARNING — trusted markup only.** The value bypasses Angular's sanitizer: bind only
   * developer-controlled icon/SVG constants or trusted translated markup, never unescaped caller/user/remote data.
   * @param {string} value - HTML markup to trust.
   * @return {SafeHtml} Trusted wrapper consumed by Angular's `[innerHTML]` binding.
   */
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}
