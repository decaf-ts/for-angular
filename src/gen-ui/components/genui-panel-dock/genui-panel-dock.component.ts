import { Component, computed, inject, input, output } from "@angular/core";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { GenuiPanelService } from "../../genui-panel.service";
import { EMPTY_GENUI_CONTEXT, type GenuiActionRequest, type GenuiOpenLinkEvent, type GenuiRenderContext } from "../../render-context";
import { GenuiBlockComponent } from "../genui-block/genui-block.component";

/**
 * @description Session panel dock showing the spec published by fences
 * @summary Reads the active spec for `context.sessionId` from
 * {@link GenuiPanelService} and renders it in a block. Closing the dock clears
 * the session panel and emits {@link GenuiPanelDockComponent.closed}.
 * @class GenuiPanelDockComponent
 * @example
 * ```html
 * <ngx-decaf-genui-panel-dock [context]="context" (closed)="hidePanel()" />
 * ```
 */
@Component({
  selector: "ngx-decaf-genui-panel-dock",
  templateUrl: "./genui-panel-dock.component.html",
  styleUrls: ["./genui-panel-dock.component.scss"],
  imports: [GenuiBlockComponent],
  standalone: true,
})
export class GenuiPanelDockComponent {
  private readonly panels = inject(GenuiPanelService);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Session whose panel spec is displayed. */
  readonly context = input<GenuiRenderContext>(EMPTY_GENUI_CONTEXT);

  /** @description Re-emitted action from the docked block. */
  readonly action = output<GenuiActionRequest>();
  /** @description Re-emitted link request from the docked block. */
  readonly openLink = output<GenuiOpenLinkEvent>();
  /** @description Emitted after the dock is closed and the panel cleared. */
  readonly closed = output<void>();

  /** @description Localized dock title. */
  readonly title = this.i18n.t("panel.title");
  /** @description Localized empty-state text. */
  readonly emptyText = this.i18n.t("panel.empty");
  /** @description Localized close-button label. */
  readonly closeLabel = this.i18n.t("panel.close");
  /** @description Localized panel badge label. */
  readonly badge = this.i18n.t("panel.badge");

  /** @description Current panel spec for the session, if any. */
  readonly spec = computed(() => this.panels.forSession(this.context().sessionId));

  /**
   * @description Clear the session panel and notify the host
   * @returns {void}
   */
  close(): void {
    this.panels.clear(this.context().sessionId);
    this.closed.emit();
  }
}
