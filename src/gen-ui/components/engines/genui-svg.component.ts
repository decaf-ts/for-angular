import { Component, SecurityContext, computed, inject, input } from "@angular/core";
import { DomSanitizer, type SafeHtml } from "@angular/platform-browser";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { sanitizeSvg } from "../../sanitize";

/**
 * @description Renders allowlisted SVG markup inline
 * @summary Runs the markup through {@link sanitizeSvg}, then through Angular's
 * sanitizer, and only then bypasses trust so SVG presentation attributes
 * survive. Rejected markup renders a localized image-unavailable fallback.
 * @class GenuiSvgComponent
 */
@Component({
  selector: "ngx-decaf-genui-svg",
  template: `
    @if (html(); as content) {
      <figure class="genui-svg" [style.max-height.px]="height()">
        @if (title()) { <figcaption>{{ title() }}</figcaption> }
        <div class="genui-svg__frame" [innerHTML]="content"></div>
      </figure>
    } @else {
      <p class="genui-empty">{{ fallback }}</p>
    }
  `,
  styles: [
    `
      .genui-svg__frame { display: flex; justify-content: center; }
      .genui-svg__frame ::ng-deep svg { max-width: 100%; height: auto; }
    `,
  ],
  standalone: true,
})
export class GenuiSvgComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Raw SVG markup to sanitize and render. */
  readonly code = input<string>("");
  /** @description Optional accessible/figure title. */
  readonly title = input<string | null>(null);
  /** @description Optional maximum render height in pixels. */
  readonly height = input<number | null>(null);

  /** @description Localized fallback shown when sanitization fails. */
  readonly fallback = this.i18n.t("image.failed");

  // The allowlist sanitizer is the security boundary; Angular's bypass is used
  // only after that pass so SVG presentation attributes survive.
  readonly html = computed<SafeHtml | null>(() => {
    const cleaned = sanitizeSvg(this.code());
    if (cleaned === "") return null;
    const trust = this.sanitizer.sanitize(SecurityContext.HTML, cleaned);
    if (trust === null) return null;
    return this.sanitizer.bypassSecurityTrustHtml(trust);
  });
}
