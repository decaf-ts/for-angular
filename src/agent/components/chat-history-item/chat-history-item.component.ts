import { DatePipe } from "@angular/common";
import { Component, computed, input, output, signal } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatHistoryEntry,
  AgentChatHistoryVisibility,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Single conversation row in the history sidebar, with visibility badge and inline delete confirmation. */
@Component({
  selector: "ngx-decaf-chat-history-item",
  templateUrl: "./chat-history-item.component.html",
  styleUrls: ["./chat-history-item.component.scss"],
  imports: [DatePipe, ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatHistoryItemComponent {
  /** Conversation entry rendered by the row. */
  readonly entry = input.required<AgentChatHistoryEntry>();
  /** Whether this row is the active conversation. */
  readonly active = input<boolean>(false);
  /** Whether deletion requires inline confirmation. */
  readonly confirmDelete = input<boolean>(true);
  /** Whether a deletion is in progress (blocks further actions). */
  readonly deleting = input<boolean>(false);

  /** Emits when the conversation is opened. */
  readonly open = output<AgentChatHistoryEntry>();
  /** Emits when the conversation is deleted. */
  readonly delete = output<AgentChatHistoryEntry>();
  /** Emits every inline confirmation state change. */
  readonly confirmChange = output<boolean>();

  /** Whether the inline delete confirmation is shown. */
  readonly confirming = signal(false);

  /** Best available title for the entry. */
  readonly title = computed(() => {
    const entry = this.entry();
    return entry.title?.trim() || entry.preview?.trim() || "";
  });

  /** Preview text shown only when it differs from the title. */
  readonly preview = computed(() => {
    const entry = this.entry();
    const preview = entry.preview?.trim() ?? "";
    return preview && preview !== this.title() ? preview : "";
  });

  /** Effective visibility of the entry. */
  readonly visibility = computed<AgentChatHistoryVisibility>(
    () => this.entry().visibility ?? "private",
  );

  /** i18n key for the visibility label. */
  readonly visibilityKey = computed(
    () => `agent.chat.history.item.visibility.${this.visibility()}`,
  );

  /** English fallback for the visibility label. */
  readonly visibilityFallback = computed(
    () =>
      this.visibility().charAt(0).toUpperCase() + this.visibility().slice(1),
  );

  /** Principals the conversation is shared with. */
  readonly sharedWith = computed(() => this.entry().sharedWith ?? []);

  /** Opens the conversation, or cancels a pending confirmation. */
  onOpen(): void {
    if (this.confirming()) {
      this.setConfirming(false);
      return;
    }
    this.open.emit(this.entry());
  }

  /** Starts or completes the delete flow. */
  onDelete(): void {
    if (this.deleting()) return;
    if (!this.confirmDelete()) {
      this.delete.emit(this.entry());
      return;
    }
    if (this.confirming()) {
      this.setConfirming(false);
      this.delete.emit(this.entry());
      return;
    }
    this.setConfirming(true);
  }

  /** Confirms the pending deletion. */
  onConfirm(): void {
    if (this.deleting()) return;
    this.setConfirming(false);
    this.delete.emit(this.entry());
  }

  /** Cancels the pending deletion. */
  onCancel(): void {
    this.setConfirming(false);
  }

  private setConfirming(value: boolean): void {
    if (this.confirming() === value) return;
    this.confirming.set(value);
    this.confirmChange.emit(value);
  }
}
