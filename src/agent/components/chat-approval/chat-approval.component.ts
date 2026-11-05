import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatApprovalDenial,
  AgentChatApprovalResume,
  AgentChatApprovalStatus,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Approval prompt for a suspended graph run: shows the tool awaiting approval plus its payload, and emits resume/deny decisions through the transport contract. */
@Component({
  selector: "ngx-decaf-chat-approval",
  templateUrl: "./chat-approval.component.html",
  styleUrls: ["./chat-approval.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatApprovalComponent {
  /** Identifier of the run awaiting approval. */
  readonly runId = input<string>("");
  /** Name of the tool requesting approval. */
  readonly toolName = input<string | null>(null);
  /** Payload preview shown to the approver. */
  readonly payload = input<unknown>(undefined);
  /** Optional override for the resume payload; defaults to `payload`. */
  readonly resumeData = input<unknown>(undefined);
  /** Optional reason included in the denial. */
  readonly rejectReason = input<string | null>(null);
  /** Current approval decision state. */
  readonly status = input<AgentChatApprovalStatus>("pending");
  /** Disables both decision buttons without changing the status. */
  readonly disabled = input<boolean>(false);

  /** Emits a resume request for the run. */
  readonly approve = output<AgentChatApprovalResume>();
  /** Emits a denial request for the run. */
  readonly reject = output<AgentChatApprovalDenial>();

  /** Whether a decision has already been recorded. */
  readonly decided = computed(() => this.status() !== "pending");
  /** Whether the approver may still act (pending and not disabled). */
  readonly canDecide = computed(() => !this.decided() && !this.disabled());
  /** Whether a payload preview is available. */
  readonly hasPayload = computed(() => this.payload() !== undefined);
  /** Resume payload sent on approval, using the override when provided. */
  readonly resolvedResumeData = computed(() => {
    const override = this.resumeData();
    return override === undefined ? this.payload() : override;
  });
  /** English fallback label for the current approval state. */
  readonly statusFallback = computed(() => {
    switch (this.status()) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return "Awaiting approval";
    }
  });

  /** Emits the resume decision when the prompt still allows it. */
  onApprove(): void {
    if (!this.canDecide()) return;
    this.approve.emit({
      type: "resume",
      runId: this.runId(),
      resumeData: this.resolvedResumeData(),
    });
  }

  /** Emits the denial decision when the prompt still allows it. */
  onReject(): void {
    if (!this.canDecide()) return;
    const reason = this.rejectReason();
    this.reject.emit({
      type: "deny",
      runId: this.runId(),
      ...(reason ? { reason } : {}),
    });
  }

  /** Serializes the payload for display, falling back to `String` on cyclic values. */
  stringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
