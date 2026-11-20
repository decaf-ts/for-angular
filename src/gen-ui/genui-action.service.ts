import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { GENUI_CONFIG } from "./genui.config";
import type { GenuiActionEvent } from "./render-context";
import { stripSecretFields } from "./sanitize";

/**
 * @description Delivery status of a relayed GenUI action
 * @typedef {string} GenuiActionStatus
 * @memberOf module:gen-ui
 */
export type GenuiActionStatus = "pending" | "sent" | "failed";

/**
 * @description User-visible audit record for the last relayed action
 * @summary Records what was sent, from which block/spec, when, and whether the
 * relay succeeded. Secret fields are already stripped from `payload`.
 * @typedef {Object} GenuiActionProvenance
 * @property {string} name The action name.
 * @property {Record<string, unknown>} payload The sanitized payload.
 * @property {string} blockId Originating block id.
 * @property {string} specId Originating spec id.
 * @property {GenuiActionStatus} status Delivery status.
 * @property {number} at Epoch milliseconds of the last status change.
 * @property {string} [error] Error message when `status` is `failed`.
 * @memberOf module:gen-ui
 */
export interface GenuiActionProvenance {
  name: string;
  payload: Record<string, unknown>;
  blockId: string;
  specId: string;
  status: GenuiActionStatus;
  at: number;
  error?: string;
}

/**
 * @description Relays GenUI interactions back to the harness
 * @summary Posts one action to {@link GenuiConfig.actionUrl} after stripping
 * secret fields, and keeps the latest {@link GenuiActionProvenance} in a signal
 * so a component can show that an action was sent. When `autoRelay` is
 * disabled the action is marked `sent` without a network call, which supports
 * read-only embeds that handle actions through the `action` output.
 * @class GenuiActionService
 * @example
 * ```typescript
 * const service = inject(GenuiActionService);
 * await service.relay({
 *   sessionId: "s1", name: "choose", payload: { answer: "A" }, blockId: "b1", specId: "1",
 * });
 * ```
 */
@Injectable({ providedIn: "root" })
export class GenuiActionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(GENUI_CONFIG);

  readonly provenance = signal<GenuiActionProvenance | null>(null);

  // Relays one interaction to `POST /genui/actions`. Secret fields are removed
  // before the request and before provenance is recorded (SAA-2026 secret
  // invariant). The provenance signal is the user-visible audit affordance.
  /**
   * @description Relay one action to the harness and record provenance
   * @summary Strips secret field ids from the payload before both the request
   * and the provenance record. Errors are captured on the provenance signal
   * (`status: "failed"`) instead of being thrown, so a failed relay never
   * breaks the chat surface. When `autoRelay` is `false`, the action is marked
   * `sent` without a network request.
   * @param {GenuiActionEvent} event The action and its block/session identity.
   * @param {ReadonlySet<string>} [secretIds] Field ids to remove from the payload.
   * @returns {Promise<void>} Resolves once the relay attempt completes.
   */
  async relay(event: GenuiActionEvent, secretIds: ReadonlySet<string> = new Set()): Promise<void> {
    const payload = stripSecretFields(event.payload, secretIds);
    this.provenance.set({
      name: event.name,
      payload,
      blockId: event.blockId,
      specId: event.specId,
      status: "pending",
      at: Date.now(),
    });
    if (!this.config.autoRelay) {
      this.provenance.update((current) => (current === null ? current : { ...current, status: "sent" }));
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(this.config.actionUrl, {
          sessionId: event.sessionId,
          name: event.name,
          payload,
          specId: event.specId,
          blockId: event.blockId,
        }),
      );
      this.provenance.update((current) =>
        current === null ? current : { ...current, status: "sent", at: Date.now() },
      );
    } catch (error: unknown) {
      this.provenance.update((current) =>
        current === null
          ? current
          : {
              ...current,
              status: "failed",
              at: Date.now(),
              error: error instanceof Error ? error.message : String(error),
            },
      );
    }
  }
}
