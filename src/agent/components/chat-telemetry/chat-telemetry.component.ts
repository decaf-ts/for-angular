import { Component, computed, input, linkedSignal, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatRoundtripTelemetry } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let chatTelemetrySequence = 0;

/** Collapsible telemetry strip: per-roundtrip duration, token counts, function/trace ids, and runtime context for the chat conversation. */
@Component({
  selector: "ngx-decaf-chat-telemetry",
  templateUrl: "./chat-telemetry.component.html",
  styleUrls: ["./chat-telemetry.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatTelemetryComponent {
  /** Roundtrip telemetry rows. */
  readonly roundtrips = input<AgentChatRoundtripTelemetry[]>([]);
  /** Controlled expanded state. */
  readonly open = input<boolean>(false);
  /** Optional title override. */
  readonly title = input<string | null>(null);

  /** Emits every expanded/collapsed transition. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly toggle = output<boolean>();

  /** Stable id linking the trigger to the collapsible content. */
  readonly contentId = `agent-chat-telemetry-${++chatTelemetrySequence}`;
  /** Effective expanded state, initialized from `open`. */
  readonly expanded = linkedSignal(() => this.open());
  /** Whether any roundtrips are available. */
  readonly hasRows = computed(() => this.roundtrips().length > 0);

  /** Sets the expanded state and emits the change. */
  setExpanded(expanded: boolean): void {
    this.expanded.set(expanded);
    this.toggle.emit(expanded);
  }

  /** Toggles the expanded state from the header trigger. */
  onTrigger(): void {
    this.setExpanded(!this.expanded());
  }

  /** Formatted duration for a roundtrip, or `null` when unknown. */
  durationOf(row: AgentChatRoundtripTelemetry): {
    value: string;
    unitKey: string;
    unitFallback: string;
  } | null {
    if (typeof row.durationMs === "number") {
      return formatDuration(row.durationMs);
    }
    if (!row.startedAt || !row.finishedAt) return null;
    const started = Date.parse(row.startedAt);
    const finished = Date.parse(row.finishedAt);
    if (Number.isNaN(started) || Number.isNaN(finished)) return null;
    return formatDuration(Math.max(0, finished - started));
  }

  /** Whether a roundtrip exposes any metadata worth expanding. */
  hasMetadata(row: AgentChatRoundtripTelemetry): boolean {
    return (
      !!row.functionId ||
      !!row.traceId ||
      row.runtimeContext !== undefined ||
      row.promptTokens !== undefined ||
      row.completionTokens !== undefined ||
      row.totalTokens !== undefined
    );
  }

  /** Serializes runtime context for display. */
  contextText(value: unknown): string {
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      return String(value);
    }
  }
}

function formatDuration(durationMs: number): {
  value: string;
  unitKey: string;
  unitFallback: string;
} {
  if (durationMs < 1000) {
    return {
      value: `${Math.round(durationMs)}`,
      unitKey: "agent.chat.telemetry.millisecondsShort",
      unitFallback: "ms",
    };
  }
  return {
    value: `${(durationMs / 1000).toFixed(1)}`,
    unitKey: "agent.chat.telemetry.secondsShort",
    unitFallback: "s",
  };
}
