import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatNestedAgentToolError,
  AgentChatWorkflowStepStatus,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Nested sub-agent transcript block: renders an indented sub-agent run with its ancestry path, streamed text, status, and reported tool errors. */
@Component({
  selector: "ngx-decaf-chat-nested-agent",
  templateUrl: "./chat-nested-agent.component.html",
  styleUrls: ["./chat-nested-agent.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatNestedAgentComponent {
  /** Display name of the nested agent. */
  readonly name = input<string>("");
  /** Identifier of the nested run. */
  readonly runId = input<string | null>(null);
  /** Nesting depth used for indentation (clamped to eight levels). */
  readonly depth = input<number>(0);
  /** Names of the parent agents, outermost first. */
  readonly ancestry = input<string[]>([]);
  /** Streamed text produced by the nested agent. */
  readonly text = input<string>("");
  /** Whether the nested agent is still streaming. */
  readonly streaming = input<boolean>(false);
  /** Lifecycle status of the nested run. */
  readonly status = input<AgentChatWorkflowStepStatus>("running");
  /** Tool errors reported by the nested agent. */
  readonly toolErrors = input<AgentChatNestedAgentToolError[]>([]);

  /** Left indentation in pixels derived from `depth`. */
  readonly indent = computed(() => Math.min(8, Math.max(0, this.depth())) * 16);
  /** Whether the nested agent reported any tool errors. */
  readonly hasErrors = computed(() => this.toolErrors().length > 0);
  /** Ancestry path rendered as a breadcrumb string. */
  readonly ancestryLabel = computed(() => this.ancestry().join(" › "));

  /** Maps the current status to the icon name rendered beside it. */
  statusIcon(): string {
    switch (this.status()) {
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

  /** English fallback label for the current status. */
  statusFallback(): string {
    switch (this.status()) {
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
}
