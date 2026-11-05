import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatAgentStepStatus } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Renders one agent step in a workflow transcript: the agent name/run id, its lifecycle status, and optional input/output payloads. Used for nested agent, sub-agent, and node-level step output. */
@Component({
  selector: "ngx-decaf-chat-agent-step",
  templateUrl: "./chat-agent-step.component.html",
  styleUrls: ["./chat-agent-step.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatAgentStepComponent {
  /** Display name of the agent step. */
  readonly name = input<string>("");
  /** Stable agent identifier, when the run exposes one. */
  readonly agentId = input<string | null>(null);
  /** Current lifecycle status of the step. */
  readonly status = input<AgentChatAgentStepStatus>("waiting");
  /** Input payload handed to the agent step. */
  readonly stepInput = input<unknown>(undefined);
  /** Output payload produced by the agent step. */
  readonly stepOutput = input<unknown>(undefined);
  /** Error message rendered when the step failed. */
  readonly error = input<string | null>(null);

  /** Whether an input payload is available to render. */
  readonly hasInput = computed(() => this.stepInput() !== undefined);
  /** Whether an output payload is available to render. */
  readonly hasOutput = computed(() => this.stepOutput() !== undefined);
  /** Whether the step is still waiting or running. */
  readonly busy = computed(
    () => this.status() === "running" || this.status() === "waiting",
  );

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

  /** Serializes a payload for display, falling back to `String` on cyclic values. */
  stringify(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
