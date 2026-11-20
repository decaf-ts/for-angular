import { Component, SecurityContext, computed, effect, inject, input, signal } from "@angular/core";
import { DomSanitizer, type SafeHtml } from "@angular/platform-browser";
import { GenuiAssetLoaderService } from "../../genui-asset-loader.service";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { MERMAID_DIAGRAM_KINDS } from "../../schema";
import { sanitizeSvg } from "../../sanitize";

interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, code: string): Promise<{ svg: string }>;
}

let mermaidSequence = 0;

/**
 * @description Renders Mermaid diagrams through the lazily loaded engine
 * @summary Validates the diagram kind against {@link MERMAID_DIAGRAM_KINDS},
 * loads the engine via {@link GenuiAssetLoaderService}, renders with
 * `securityLevel: "strict"`, and sanitizes the resulting SVG before trusting
 * it. Any failure renders a localized message instead of raw output.
 * @class GenuiMermaidComponent
 */
@Component({
  selector: "ngx-decaf-genui-mermaid",
  template: `
    @if (html(); as content) {
      <figure class="genui-mermaid" [innerHTML]="content"></figure>
    } @else if (failed()) {
      <p class="genui-empty">{{ failureText() }}</p>
    } @else {
      <p class="genui-empty">{{ loadingText }}</p>
    }
  `,
  styles: [
    `
      .genui-mermaid { display: flex; justify-content: center; overflow: auto; }
      .genui-mermaid ::ng-deep svg { max-width: 100%; height: auto; }
    `,
  ],
  standalone: true,
})
export class GenuiMermaidComponent {
  private readonly assets = inject(GenuiAssetLoaderService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Mermaid source; first token must be an allowlisted kind. */
  readonly code = input<string>("");
  /** @description Sanitized SVG ready to render, or `null`. */
  readonly html = signal<SafeHtml | null>(null);
  /** @description Whether the last render attempt failed. */
  readonly failed = signal(false);
  /** @description Localized failure message. */
  readonly failureText = signal(this.i18n.t("mermaid.failed"));
  /** @description Localized loading message. */
  readonly loadingText = this.i18n.t("map.loading");

  constructor() {
    effect(() => {
      const code = this.code();
      void this.render(code);
    });
  }

  private diagramKind(code: string): string {
    const first = code.trim().split(/\r?\n/)[0] ?? "";
    const match = /^([a-zA-Z][\w-]*)/.exec(first.trim());
    return match?.[1] ?? "";
  }

  private async render(code: string): Promise<void> {
    this.html.set(null);
    this.failed.set(false);
    if (code.trim() === "") {
      this.failed.set(true);
      return;
    }
    const kind = this.diagramKind(code);
    if (!MERMAID_DIAGRAM_KINDS.has(kind)) {
      this.failed.set(true);
      this.failureText.set(this.i18n.t("mermaid.unsupported", { kind: kind || "?" }));
      return;
    }
    try {
      const engine = (await this.assets.load("mermaid")) as MermaidApi;
      engine.initialize({ startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true });
      const id = `genui-mermaid-${++mermaidSequence}`;
      const result = await engine.render(id, code);
      const cleaned = sanitizeSvg(result.svg);
      if (cleaned === "") {
        this.failed.set(true);
        return;
      }
      const safe = this.sanitizer.sanitize(SecurityContext.HTML, cleaned);
      this.html.set(safe === null ? null : this.sanitizer.bypassSecurityTrustHtml(safe));
      if (safe === null) this.failed.set(true);
    } catch {
      this.failed.set(true);
      this.failureText.set(this.i18n.t("mermaid.failed"));
    }
  }

  readonly resolved = computed(() => this.html() !== null);
}
