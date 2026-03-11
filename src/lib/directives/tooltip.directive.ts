/**
 * @module DecafTooltipDirective
 * @description Provides a tooltip directive for the decaf-ts for-angular library.
 * @summary This module defines the {@link DecafTooltipDirective}, a standalone Angular directive
 * that dynamically appends a tooltip element to any host element it decorates. It also supports
 * optional text truncation using the {@link DecafTruncatePipe}.
 */

import { Directive, ElementRef, inject, Input, OnChanges, Renderer2 } from '@angular/core';
import { ITooltipConfig } from '../engine/interfaces';
import { DecafTruncatePipe } from '../pipes/truncate.pipe';

/**
 * @description Angular directive that appends a tooltip `<span>` to the host element and
 * optionally truncates its visible text content.
 * @summary The `DecafTooltipDirective` is a standalone Angular directive bound to the
 * `[ngx-decaf-tooltip]` attribute selector. It processes the {@link TooltipConfig} provided
 * via the `options` input, sanitizes the text, and appends a `.dcf-tooltip` `<span>` containing
 * the sanitized full text to the host element. The directive also applies the `dcf-tooltip-parent`
 * CSS class to the host for tooltip positioning. When truncation is enabled, the host element's
 * inner content is replaced with the truncated text before the tooltip span is added.
 * @example
 * ```html
 * <!-- Basic tooltip -->
 * <span [ngx-decaf-tooltip]="{ text: 'Full description here' }">Hover me</span>
 *
 * <!-- Truncated visible text with tooltip showing the full content -->
 * <span [ngx-decaf-tooltip]="{ text: veryLongLabel, truncate: true, limit: 20, trail: '…' }">
 *   {{ veryLongLabel }}
 * </span>
 * ```
 * @class DecafTooltipDirective
 */

/**
 * @description Angular lifecycle hook invoked whenever one or more input properties change.
 * @summary Processes the {@link ITooltipConfig} options, sanitizes the text, and updates the
 * host element's content and tooltip span accordingly. Applies the `dcf-tooltip-parent` CSS class
 * to the host for styling.
 * @return {void}
 */
@Directive({
  selector: '[ngx-decaf-tooltip]',
  providers: [DecafTruncatePipe],
  standalone: true,
})
export class DecafTooltipDirective implements OnChanges {
  @Input('ngx-decaf-tooltip')
  options!: ITooltipConfig;

  /**
   * @description Reference to the host DOM element into which the SVG will be injected.
   * @summary Obtained via Angular's `inject(ElementRef)`. Provides access to the native
   * element forwarded to {@link NgxMediaService.loadSvgObserver} as the injection target,
   * and used as a fallback source for the `src` attribute when `path` is not set.
   * @type {ElementRef}
   * @memberOf module:lib/directives/NgxSvgDirective
   */
  element: ElementRef = inject(ElementRef);
  renderer: Renderer2 = inject(Renderer2);
  truncatePipe: DecafTruncatePipe = inject(DecafTruncatePipe);

  /**
   * @description Angular lifecycle hook invoked whenever one or more input properties change.
   * @summary Processes the {@link TooltipConfig} options, sanitizes the text, and updates the
   * host element's content and tooltip span accordingly. Applies the `dcf-tooltip-parent` CSS class
   * to the host for styling.
   * @return {void}
   */
  ngOnChanges(): void {
    const options = {
      truncate: false,
      limit: 30,
      ...this.options,
    };
    if (options?.text && options?.text.trim().length) {
      const value = options.text.replace(/<[^>]+>/g, '').trim();

      const text = !options.truncate
        ? value
        : this.truncatePipe.transform(value, options.limit, options.trail || '...');

      const element = this.element?.nativeElement ? this.element?.nativeElement : this.element;
      if (options.truncate) {
        this.renderer.setProperty(element, 'innerHTML', '');
        const textNode = this.renderer.createText(text);
        this.renderer.appendChild(element, textNode);
      }

      // creating tooltip element
      const tooltip = this.renderer.createElement('span');
      this.renderer.addClass(tooltip, 'dcf-tooltip');
      this.renderer.appendChild(tooltip, this.renderer.createText(this.truncatePipe.sanitize(value)));
      this.renderer.appendChild(element, tooltip);
      this.renderer.addClass(element, 'dcf-tooltip-parent');
    }
  }
}
