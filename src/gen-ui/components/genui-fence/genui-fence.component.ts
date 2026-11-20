import { Component, computed, effect, inject, input, output } from "@angular/core";
import { splitGenuiFences } from "../../fence";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { GenuiPanelService } from "../../genui-panel.service";
import { EMPTY_GENUI_CONTEXT, type GenuiActionRequest, type GenuiOpenLinkEvent, type GenuiRenderContext } from "../../render-context";
import { GenuiBlockComponent } from "../genui-block/genui-block.component";

/**
 * @description Renders assistant markdown, expanding embedded GenUI fences
 * @summary Splits `text` through {@link splitGenuiFences} into plain text and
 * GenUI segments. Inline specs render as blocks; specs marked `panel: true` are
 * published once to {@link GenuiPanelService} for the session instead of being
 * rendered inline. The host's `action` and `openLink` outputs are re-emitted
 * upward.
 * @class GenuiFenceComponent
 * @example
 * ```html
 * <ngx-decaf-genui-fence [text]="message.content" [context]="context" />
 * ```
 */
@Component({
  selector: "ngx-decaf-genui-fence",
  templateUrl: "./genui-fence.component.html",
  styleUrls: ["./genui-fence.component.scss"],
  imports: [GenuiBlockComponent],
  standalone: true,
})
export class GenuiFenceComponent {
  private readonly panels = inject(GenuiPanelService);
  private readonly i18n = inject(GenuiI18nService);
  private readonly published = new Set<string>();

  /** @description Localized hint shown for panel-routed fences. */
  readonly panelHint = this.i18n.t("block.panelFallback");

  /** @description Assistant message text containing zero or more GenUI fences. */
  readonly text = input.required<string>();
  /** @description Block identity applied to every inline segment. */
  readonly context = input<GenuiRenderContext>(EMPTY_GENUI_CONTEXT);

  /** @description Re-emitted action from an inline block. */
  readonly action = output<GenuiActionRequest>();
  /** @description Re-emitted link request from an inline block. */
  readonly openLink = output<GenuiOpenLinkEvent>();

  /** @description Parsed text/GenUI segments for the message. */
  readonly segments = computed(() => splitGenuiFences(this.text()));

  constructor() {
    effect(() => {
      const context = this.context();
      for (const segment of this.segments()) {
        if (segment.kind !== "genui" || segment.spec === null || segment.spec.panel !== true) continue;
        const fingerprint = `${context.sessionId}:${segment.spec.append === true ? "append" : "replace"}:${JSON.stringify(segment.spec)}`;
        if (this.published.has(fingerprint)) continue;
        this.published.add(fingerprint);
        this.panels.publish(context.sessionId, segment.spec);
      }
    });
  }
}
