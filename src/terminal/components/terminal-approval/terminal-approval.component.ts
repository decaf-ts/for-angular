import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "@decaf-ts/for-angular/agent";
import type { TerminalApprovalDecision, TerminalApprovalPayload } from "../../types";

/**
 * @description Approval card for one pending tool call
 * @summary Shows the tool name, description, shell command, reason, and the
 * remaining arguments, and emits `{ approved: true }` or `{ approved: false }`
 * when the user decides. Presentation-only: the host performs the API call.
 * @class TerminalApprovalComponent
 * @category Terminal
 * @example
 * ```html
 * <ngx-decaf-terminal-approval
 *   [payload]="activeApproval()"
 *   [disabled]="busy() !== null"
 *   (decide)="decide($event)"
 *   (cancel)="cancelActive()"
 * />
 * ```
 */
@Component({
  selector: "ngx-decaf-terminal-approval",
  templateUrl: "./terminal-approval.component.html",
  styleUrls: ["./terminal-approval.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class TerminalApprovalComponent {
  /** Approval payload of the pending tool call, or `null`. */
  readonly payload = input<TerminalApprovalPayload | null>(null);

  /** Optional reason supplied by the host, overriding the payload reason. */
  readonly reason = input<string | null>(null);

  /** Disables every control while the host is busy. */
  readonly disabled = input<boolean>(false);

  /** Emits the approval decision. */
  readonly decide = output<TerminalApprovalDecision>();

  /** Emits when the user dismisses the card. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly cancel = output<void>();

  /** Tool name, or an empty string when no payload is set. */
  readonly toolName = computed(() => this.payload()?.toolName || "");

  /** Tool description, or an empty string when no payload is set. */
  readonly toolDescription = computed(() => this.payload()?.toolDescription || "");

  /** Shell command argument, or an empty string when absent. */
  readonly command = computed(() => {
    const command = this.payload()?.arguments?.command;
    return typeof command === "string" ? command : "";
  });

  /** Display reason: the host override first, then the payload reason. */
  readonly requestReason = computed(() => this.reason() || this.payload()?.reason || "");

  /** Whether the payload carries any arguments. */
  readonly hasArguments = computed(() => {
    const args = this.payload()?.arguments;
    return !!args && Object.keys(args).length > 0;
  });

  /** Pretty-printed arguments JSON. */
  readonly argumentsText = computed(() => this.stringify(this.payload()?.arguments));

  /**
   * @description Pretty-print a value as JSON
   * @param {unknown} value - the value to render.
   * @returns {string} two-space JSON, or an empty string for `null`/`undefined`.
   */
  stringify(value: unknown): string {
    if (value === undefined || value === null) return "";
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }

  /**
   * @description Emit an approval decision
   * @returns {void}
   */
  onApprove(): void {
    if (this.disabled()) return;
    this.decide.emit({ approved: true });
  }

  /**
   * @description Emit a rejection decision
   * @returns {void}
   */
  onReject(): void {
    if (this.disabled()) return;
    this.decide.emit({ approved: false });
  }

  /**
   * @description Emit a cancellation unless the card is disabled
   * @returns {void}
   */
  onCancel(): void {
    if (this.disabled()) return;
    this.cancel.emit();
  }
}
