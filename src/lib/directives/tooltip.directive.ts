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
import { generateRandomValue } from '../utils/helpers';

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
  options!: string | ITooltipConfig;

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

  /** Current tooltip span; kept so repeated changes replace instead of duplicate. */
  private tooltip: HTMLElement | null = null;

  /**
   * @description Angular lifecycle hook invoked whenever one or more input properties change.
   * @summary Processes the {@link ITooltipConfig} options, sanitizes the text, and updates the
   * host element's content and tooltip span accordingly. Applies the `dcf-tooltip-parent` CSS class
   * to the host for styling.
   * @return {void}
   */
  ngOnChanges(): void {
    const options = {
      truncate: false,
      limit: 30,
      ...{ position: 'top' },
      ...(typeof this.options === 'string' ? { text: this.options, position: 'bottom', trail: '' } : this.options),
    };
    const element = this.element?.nativeElement ? this.element?.nativeElement : this.element;
    this.clearTooltip(element);
    if (options?.text && options?.text.trim().length) {
      // Tag-stripping is display-only and not a security control
      const value = options.text.replace(/<[^>]+>/g, '').trim();
      if (value.length > options.limit) {
        const text = !options.truncate
          ? value
          : this.truncatePipe.transform(value, options.limit, options.trail ?? '...');

        if (options.truncate) {
          this.renderer.setProperty(element, 'innerHTML', '');
          const textNode = this.renderer.createText(text);
          this.renderer.appendChild(element, textNode);
        }

        // creating tooltip element
        const tooltip = this.renderer.createElement('span');
        this.renderer.addClass(tooltip, `dcf-tooltip`);
        this.renderer.addClass(tooltip, `dcf-tooltip-${options.position}`);
        this.renderer.setAttribute(tooltip, 'role', 'tooltip');
        const tooltipId = `dcf-tooltip-${generateRandomValue(8)}`;
        this.renderer.setAttribute(tooltip, 'id', tooltipId);
        this.renderer.appendChild(tooltip, this.renderer.createText(this.truncatePipe.sanitize(value)));
        this.renderer.appendChild(element, tooltip);
        this.renderer.setAttribute(element, 'aria-describedby', tooltipId);
        this.renderer.addClass(element, 'dcf-tooltip-parent');
        this.tooltip = tooltip;
      }
    }
  }

  /**
   * @description Removes the previously appended tooltip span, if any.
   * @summary Without this, every `ngOnChanges` run appends another `.dcf-tooltip`
   * span and screen readers read the content once per stale copy.
   * @param element the host element.
   * @return {void}
   */
  private clearTooltip(element: HTMLElement): void {
    if (!this.tooltip) return;
    this.renderer.removeChild(element, this.tooltip);
    this.tooltip = null;
    this.renderer.removeAttribute(element, 'aria-describedby');
  }
}
