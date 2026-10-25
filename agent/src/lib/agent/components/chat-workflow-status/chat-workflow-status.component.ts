import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatWorkflowStep,
  AgentChatWorkflowStepStatus,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Workflow step list rendered inside a tool message: per-step status icons, labels, and optional serialized output. */
@Component({
  selector: "ngx-decaf-chat-workflow-status",
  templateUrl: "./chat-workflow-status.component.html",
  styleUrls: ["./chat-workflow-status.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatWorkflowStatusComponent {
  /** Workflow steps reported by the run. */
  readonly steps = input<AgentChatWorkflowStep[]>([]);
  /** Optional section title override. */
  readonly title = input<string | null>(null);

  /** Whether the run reported any steps. */
  readonly hasSteps = computed(() => this.steps().length > 0);

  /** Maps a step status to the icon name rendered beside it. */
  statusIcon(status: AgentChatWorkflowStepStatus): string {
    switch (status) {
      case "success":
        return "check";
      case "failed":
        return "x";
      case "suspended":
        return "info";
      default:
        return "loader";
    }
  }

  /** English fallback label for a step status. */
  statusFallback(status: AgentChatWorkflowStepStatus): string {
    switch (status) {
      case "running":
        return "Running";
      case "success":
        return "Succeeded";
      case "failed":
        return "Failed";
      case "suspended":
        return "Suspended";
      default:
        return "Waiting";
    }
  }

  /** Whether the step exposes an output payload. */
  hasOutput(step: AgentChatWorkflowStep): boolean {
    return step.output !== undefined;
  }

  /** Serializes a payload for display, falling back to `String` on cyclic values. */
  stringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
