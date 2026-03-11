/**
 * @module lib/directives/NgxSvgDirective
 * @description Standalone directive that inlines SVG assets into the host element.
 * @summary Provides {@link NgxSvgDirective}, a lightweight Angular directive that resolves
 * an SVG file path from either its input binding or the host element's `src` attribute and
 * delegates the HTTP fetch and DOM injection to {@link NgxMediaService}.
 * @link {@link NgxSvgDirective}
 */
import { HttpClient } from '@angular/common/http';
import { Directive, ElementRef, inject, Input, OnInit } from '@angular/core';
import { NgxMediaService } from '../services/NgxMediaService';

/**
 * @description Angular directive that fetches an SVG file and inlines it into the host element.
 * @summary Standalone directive bound to the `[ngx-decaf-svg]` attribute selector. On
 * initialisation it resolves the SVG asset path from the `[ngx-decaf-svg]` input binding or,
 * as a fallback, the host element's native `src` attribute. Once a non-empty path is determined
 * it calls {@link NgxMediaService.loadSvgObserver}, which performs the HTTP request via
 * {@link HttpClient} and injects the SVG markup directly into the host element's DOM, enabling
 * full CSS styling of the inlined SVG.
 * @class NgxSvgDirective
 * @implements {OnInit}
 * @example
 * ```html
 * <!-- Via directive binding -->
 * <div [ngx-decaf-svg]="'/assets/icons/logo.svg'"></div>
 *
 * <!-- Fallback to src attribute -->
 * <img ngx-decaf-svg src="/assets/icons/arrow.svg" />
 * ```
 */
@Directive({
  selector: '[ngx-decaf-svg]',
  standalone: true,
})
export class NgxSvgDirective implements OnInit {
  /**
   * @description URL or asset path to the SVG file to inline.
   * @summary Bound via the `[ngx-decaf-svg]` attribute. When empty or not provided, the
   * directive falls back to reading the host element's native `src` attribute during
   * `ngOnInit`.
   * @type {string}
   * @memberOf module:lib/directives/NgxSvgDirective
   */
  @Input('ngx-decaf-svg')
  path!: string;

  /**
   * @description Service responsible for fetching and inlining the SVG markup.
   * @summary Injected {@link NgxMediaService} instance used by `ngOnInit` to perform the
   * HTTP request and inject the resulting SVG markup into the host element's DOM.
   * @type {NgxMediaService}
   * @memberOf module:lib/directives/NgxSvgDirective
   */
  mediaService: NgxMediaService = inject(NgxMediaService);

  /**
   * @description Reference to the host DOM element into which the SVG will be injected.
   * @summary Obtained via Angular's `inject(ElementRef)`. Provides access to the native
   * element forwarded to {@link NgxMediaService.loadSvgObserver} as the injection target,
   * and used as a fallback source for the `src` attribute when `path` is not set.
   * @type {ElementRef}
   * @memberOf module:lib/directives/NgxSvgDirective
   */
  element: ElementRef = inject(ElementRef);

  /**
   * @description HTTP client instance forwarded to the media service for the SVG fetch.
   * @summary Injected {@link HttpClient} passed directly to
   * {@link NgxMediaService.loadSvgObserver} so the service can issue the GET request for
   * the SVG file without managing its own HTTP dependency.
   * @type {HttpClient}
   * @memberOf module:lib/directives/NgxSvgDirective
   */
  http: HttpClient = inject(HttpClient);

  /**
   * @description Resolves the SVG path and triggers the inline load.
   * @summary Trims `path` and, when empty, falls back to the host element's `src` attribute.
   * When a valid path is found, delegates to {@link NgxMediaService.loadSvgObserver} to
   * fetch the file and inject the SVG markup into the host element.
   * @returns {void}
   * @memberOf module:lib/directives/NgxSvgDirective
   */
  ngOnInit(): void {
    this.path = this.path?.trim() || this.element?.nativeElement?.getAttribute('src')?.trim() || '';
    if (this.path) {
      this.mediaService.loadSvgObserver(this.http, this.path, this.element.nativeElement);
    }
  }
}
