import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "@decaf-ts/for-angular/agent";
import { TerminalApprovalComponent } from "../terminal-approval/terminal-approval.component";
import { TerminalQuestionComponent } from "../terminal-question/terminal-question.component";
import type {
  TerminalAnswerSubmission,
  TerminalApprovalDecision,
  TerminalApprovalPayload,
  TerminalCancelRequest,
  TerminalInteractionSnapshot,
  TerminalQuestionItem,
  TerminalQuestionPayload,
  TerminalQuestionResult,
} from "../../types";

/**
 * @description Standalone composition root of the terminal surface
 * @summary Renders the pending interactions of one session and delegates each
 * interaction to {@link TerminalQuestionComponent} or
 * {@link TerminalApprovalComponent}. The component is presentation-only: it
 * selects the active interaction, emits the user's answer or cancellation, and
 * lets the host page perform the API calls. All user-facing strings are
 * resolved through {@link AgentTranslateFallbackPipe}.
 * @class TerminalSurfaceComponent
 * @category Terminal
 * @example
 * ```html
 * <ngx-decaf-terminal-surface
 *   [interactions]="interactions()"
 *   [activeId]="activeId()"
 *   [title]="selectedTitle()"
 *   (select)="select($event)"
 *   (answer)="answer($event)"
 *   (cancel)="cancel($event)"
 * />
 * ```
 */
@Component({
  selector: "ngx-decaf-terminal-surface",
  templateUrl: "./terminal-surface.component.html",
  styleUrls: ["./terminal-surface.component.scss"],
  imports: [AgentTranslateFallbackPipe, TerminalQuestionComponent, TerminalApprovalComponent],
  standalone: true,
})
export class TerminalSurfaceComponent {
  /** Interactions to render; settled rows are filtered out of the pending list. */
  readonly interactions = input<TerminalInteractionSnapshot[]>([]);

  /** Id of the interaction to show first when it is still pending. */
  readonly activeId = input<string | null>(null);

  /** Heading shown above the surface. */
  readonly title = input<string>("");

  /** Disables every action while the host is busy. */
  readonly disabled = input<boolean>(false);

  /** Emits the id of an interaction the user selected. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly select = output<string>();

  /** Emits the user's answer or approval decision. */
  readonly answer = output<TerminalAnswerSubmission>();

  /** Emits a cancellation request for the active interaction. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly cancel = output<TerminalCancelRequest>();

  /** Pending interactions, in the order received. */
  readonly pending = computed(() =>
    this.interactions().filter((interaction) => interaction.status === "pending"),
  );

  /** Number of pending interactions. */
  readonly pendingCount = computed(() => this.pending().length);

  /**
   * @description Interaction currently shown in the surface
   * @summary The requested `activeId` when it is still pending, otherwise the
   * first pending interaction, or `null` when nothing is pending.
   */
  readonly active = computed<TerminalInteractionSnapshot | null>(() => {
    const id = this.activeId();
    const pending = this.pending();
    if (id) {
      const requested = pending.find((interaction) => interaction.id === id);
      if (requested) return requested;
    }
    return pending[0] ?? null;
  });

  /** Questions of the active interaction when it is a question, else an empty list. */
  readonly activeQuestions = computed<TerminalQuestionItem[]>(() => {
    const active = this.active();
    if (!active || active.kind !== "question") return [];
    const payload = active.payload as unknown as TerminalQuestionPayload;
    return Array.isArray(payload?.questions) ? payload.questions : [];
  });

  /** Approval payload of the active interaction when it is an approval, else `null`. */
  readonly activeApproval = computed<TerminalApprovalPayload | null>(() => {
    const active = this.active();
    if (!active || active.kind !== "approval") return null;
    return active.payload as unknown as TerminalApprovalPayload;
  });

  /**
   * @description Short label for one interaction
   * @summary Uses the tool name for approvals and the first question header or
   * text for questions, falling back to the interaction id.
   * @param {TerminalInteractionSnapshot} interaction - the interaction to label.
   * @returns {string} the display label.
   */
  label(interaction: TerminalInteractionSnapshot): string {
    if (interaction.kind === "approval") {
      const payload = interaction.payload as unknown as TerminalApprovalPayload;
      return payload?.toolName || interaction.id;
    }
    const payload = interaction.payload as unknown as TerminalQuestionPayload;
    const first = payload?.questions?.[0];
    return first?.header || first?.question || interaction.id;
  }

  /**
   * @description Forward a selection to the host
   * @param {string} id - the selected interaction id.
   * @returns {void}
   */
  onSelect(id: string): void {
    this.select.emit(id);
  }

  /**
   * @description Emit question answers for the active interaction
   * @param {TerminalQuestionResult} result - the collected answers.
   * @returns {void}
   */
  onQuestionSubmit(result: TerminalQuestionResult): void {
    const active = this.active();
    if (!active || this.disabled()) return;
    this.answer.emit({ id: active.id, answer: result });
  }

  /**
   * @description Emit an approval decision for the active interaction
   * @param {TerminalApprovalDecision} decision - the decide payload.
   * @returns {void}
   */
  onApprovalDecide(decision: TerminalApprovalDecision): void {
    const active = this.active();
    if (!active || this.disabled()) return;
    this.answer.emit({ id: active.id, answer: decision });
  }

  /**
   * @description Emit a cancellation for the active interaction
   * @returns {void}
   */
  onCancel(): void {
    const active = this.active();
    if (!active || this.disabled()) return;
    this.cancel.emit({ id: active.id });
  }
}
