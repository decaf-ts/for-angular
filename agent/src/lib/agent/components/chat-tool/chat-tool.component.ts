import { Component, computed, input, linkedSignal, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatToolCallState } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let chatToolSequence = 0;

/** Collapsible tool-call card showing the tool name, lifecycle state, and input/output/error payloads. Used for generic tool invocations inside a message. */
@Component({
  selector: "ngx-decaf-chat-tool",
  templateUrl: "./chat-tool.component.html",
  styleUrls: ["./chat-tool.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatToolComponent {
  /** Tool name rendered in the card header. */
  readonly name = input<string>("");
  /** Optional title override for the card. */
  readonly title = input<string | null>(null);
  /** Lifecycle state of the tool call. */
  readonly state = input<AgentChatToolCallState>("input-available");
  /** Input payload passed to the tool. */
  readonly toolInput = input<unknown>(undefined);
  /** Output payload returned by the tool. */
  readonly toolOutput = input<unknown>(undefined);
  /** Error text rendered for failed or denied calls. */
  readonly error = input<string | null>(null);
  /** Controlled expanded state. */
  readonly open = input<boolean>(false);

  /** Emits every expanded/collapsed transition. */
  readonly toggle = output<boolean>();

  /** Stable id linking the trigger to the collapsible content. */
  readonly contentId = `agent-chat-tool-${++chatToolSequence}`;
  /** Effective expanded state, initialized from `open`. */
  readonly expanded = linkedSignal(() => this.open());

  /** Whether an input payload is available. */
  readonly hasInput = computed(() => this.toolInput() !== undefined);
  /** Whether an output payload is available. */
  readonly hasOutput = computed(() => this.toolOutput() !== undefined);
  /** Whether the tool input is still streaming. */
  readonly busy = computed(() => this.state() === "input-streaming");
  /** Semantic tone class derived from the tool state. */
  readonly tone = computed(() => {
    switch (this.state()) {
      case "output-available":
        return "success";
      case "output-error":
        return "error";
      case "output-denied":
        return "denied";
      default:
        return "pending";
    }
  });
  /** Icon name derived from the tool state. */
  readonly statusIcon = computed(() => {
    switch (this.state()) {
      case "output-available":
        return "check";
      case "output-error":
      case "output-denied":
        return "x";
      default:
        return "loader";
    }
  });
  /** English fallback label for the tool state. */
  readonly stateFallback = computed(() => {
    switch (this.state()) {
      case "input-streaming":
        return "Preparing input…";
      case "input-available":
        return "Input ready";
      case "output-available":
        return "Completed";
      case "output-error":
        return "Failed";
      default:
        return "Denied";
    }
  });

  /** Sets the expanded state and emits the change. */
  setExpanded(expanded: boolean): void {
    this.expanded.set(expanded);
    this.toggle.emit(expanded);
  }

  /** Toggles the expanded state from the header trigger. */
  onTrigger(): void {
    this.setExpanded(!this.expanded());
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
