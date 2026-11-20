import { Component, computed, inject } from "@angular/core";
import { GenuiActionService } from "../../genui-action.service";
import { GenuiI18nService } from "../../i18n/genui-i18n";

/**
 * @description Shows the delivery status of the last relayed GenUI action
 * @summary Reads {@link GenuiActionService.provenance} and presents a localized
 * status label plus a truncated payload summary and full details. Intended as a
 * subtle audit affordance under a block; it renders nothing when no action has
 * been relayed.
 * @class GenuiActionProvenanceComponent
 */
@Component({
  selector: "ngx-decaf-genui-action-provenance",
  templateUrl: "./genui-action-provenance.component.html",
  styleUrls: ["./genui-action-provenance.component.scss"],
  standalone: true,
})
export class GenuiActionProvenanceComponent {
  private readonly actions = inject(GenuiActionService);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Latest relayed action, or `null` before the first action. */
  readonly provenance = this.actions.provenance;
  /** @description Truncated JSON summary of the action payload. */
  readonly summary = computed(() => {
    const current = this.provenance();
    if (current === null) return "";
    try {
      const text = JSON.stringify(current.payload);
      return text.length > 160 ? `${text.slice(0, 157)}…` : text;
    } catch {
      return "";
    }
  });
  /** @description Localized status label for the current provenance state. */
  readonly statusLabel = computed(() => {
    const current = this.provenance();
    if (current === null) return "";
    if (current.status === "pending") return this.i18n.t("provenance.pending");
    if (current.status === "failed") return this.i18n.t("provenance.failed");
    return this.i18n.t("provenance.sent");
  });
  /** @description Pretty-printed JSON payload for the details view. */
  readonly details = computed(() => {
    const current = this.provenance();
    if (current === null) return "";
    try {
      return JSON.stringify(current.payload, null, 2);
    } catch {
      return "";
    }
  });
  /** @description Localized provenance title. */
  readonly title = this.i18n.t("provenance.title");
  /** @description Localized action-name label. */
  readonly actionLabel = this.i18n.t("block.actionName");
  /** @description Localized payload label. */
  readonly payloadLabel = this.i18n.t("block.payload");
  /** @description Localized empty-payload label. */
  readonly emptyLabel = this.i18n.t("block.noPayload");
}
