import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type {
  AgentChatMessageVoteChange,
  AgentChatRole,
  AgentChatVote,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Per-message action bar: copy, vote, edit, and delete, with role-aware defaults and a temporary copied state. */
@Component({
  selector: "ngx-decaf-chat-message-actions",
  templateUrl: "./chat-message-actions.component.html",
  styleUrls: ["./chat-message-actions.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatMessageActionsComponent {
  /** Id of the message the actions apply to. */
  readonly messageId = input<string>("");
  /** Role of the message author, driving default capabilities. */
  readonly role = input<AgentChatRole>("assistant");
  /** Text written to the clipboard by the copy action. */
  readonly copyText = input<string>("");
  /** Whether a response is streaming (disables every action). */
  readonly running = input<boolean>(false);
  /** Controlled vote state. */
  readonly vote = input<AgentChatVote | null>(null);
  /** Capability override for copying. */
  readonly canCopy = input<boolean | null>(null);
  /** Capability override for voting. */
  readonly canVote = input<boolean | null>(null);
  /** Capability override for editing. */
  readonly canEdit = input<boolean | null>(null);
  /** Capability override for deleting. */
  readonly canDelete = input<boolean | null>(null);
  /** Whether the action bar remains visible without hover/focus. */
  readonly persistent = input<boolean>(false);

  /** Emits the copied text. */
  readonly copy = output<string>();
  /** Emits vote changes for the message. */
  readonly voteChange = output<AgentChatMessageVoteChange>();
  /** Emits the id of the message to edit. */
  readonly edit = output<string>();
  /** Emits the id of the message to delete. */
  readonly deleteMessage = output<string>();

  /** Whether the copy confirmation is currently shown. */
  readonly copied = signal(false);
  /** Effective vote state. */
  readonly activeVote = linkedSignal<AgentChatVote | null>(() => this.vote());

  /** Effective copy capability. */
  readonly canCopyNow = computed(
    () => this.canCopy() ?? (this.role() === "user" || this.role() === "assistant"),
  );
  /** Effective vote capability. */
  readonly canVoteNow = computed(
    () => this.canVote() ?? this.role() === "assistant",
  );
  /** Effective edit capability. */
  readonly canEditNow = computed(
    () => this.canEdit() ?? this.role() === "user",
  );
  /** Effective delete capability. */
  readonly canDeleteNow = computed(() => this.canDelete() ?? true);

  private readonly destroyRef = inject(DestroyRef);
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.copiedTimer) clearTimeout(this.copiedTimer);
    });
  }

  /** Copies the message text and emits the copy event. */
  async copyMessage(): Promise<void> {
    if (this.running()) return;
    const text = this.copyText();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        this.copied.set(false);
      }
    }
    this.copied.set(true);
    this.copy.emit(text);
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
  }

  /** Toggles the given vote direction and emits the change. */
  toggleVote(direction: AgentChatVote): void {
    if (this.running()) return;
    const next = this.activeVote() === direction ? null : direction;
    this.activeVote.set(next);
    this.voteChange.emit({ messageId: this.messageId(), vote: next });
  }

  /** Requests inline editing of the message. */
  editMessage(): void {
    if (this.running()) return;
    this.edit.emit(this.messageId());
  }

  /** Requests deletion of the message. */
  removeMessage(): void {
    if (this.running()) return;
    this.deleteMessage.emit(this.messageId());
  }
}
