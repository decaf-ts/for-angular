import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatProgressEvent } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Progress indicator driven by the latest progress event of a run, with a bounded percentage and completion state. */
@Component({
  selector: "ngx-decaf-chat-progress",
  templateUrl: "./chat-progress.component.html",
  styleUrls: ["./chat-progress.component.scss"],
  imports: [AgentTranslateFallbackPipe, ChatIconComponent],
  standalone: true,
})
export class ChatProgressComponent {
  /** Progress events emitted during the run. */
  readonly events = input<AgentChatProgressEvent[]>([]);

  /** Most recent progress event, or `null` when none arrived. */
  readonly current = computed<AgentChatProgressEvent | null>(() => {
    const events = this.events();
    return events.length ? events[events.length - 1] : null;
  });
  /** Completion percentage clamped to 0-100, or `null` when no total is known. */
  readonly percent = computed<number | null>(() => {
    const event = this.current();
    if (!event || !event.total || event.total <= 0) return null;
    const value = event.value ?? 0;
    return Math.min(100, Math.max(0, Math.round((value / event.total) * 100)));
  });
  /** Whether the run signalled completion or reached 100%. */
  readonly isDone = computed(() => {
    const event = this.current();
    if (!event) return false;
    return event.done === true || this.percent() === 100;
  });
  /** i18n key for the current progress label. */
  readonly labelKey = computed(
    () => this.current()?.labelKey ?? "agent.chat.progress.label",
  );
  /** English fallback for the current progress label. */
  readonly labelFallback = computed(
    () => this.current()?.label ?? "Working…",
  );
}
