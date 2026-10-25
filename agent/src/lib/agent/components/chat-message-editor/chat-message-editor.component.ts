import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { AgentChatService } from "../../services/AgentChatService";
import type { AgentChatMessageEdit, AgentChatMessageView } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let editorSequence = 0;

/** Inline message editor: drafts new text, saves through `AgentChatService.editMessage` when available, and emits the edit payload. Supports Escape to cancel and Ctrl/Cmd+Enter to save. */
@Component({
  selector: "ngx-decaf-chat-message-editor",
  templateUrl: "./chat-message-editor.component.html",
  styleUrls: ["./chat-message-editor.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatMessageEditorComponent implements AfterViewInit {
  /** Message being edited. */
  readonly message = input<AgentChatMessageView | null>(null);
  /** Explicit message id used when no message object is supplied. */
  readonly messageId = input<string>("");
  /** Draft text used when no message object is supplied. */
  readonly initialText = input<string>("");
  /** Whether a response is streaming (blocks saving). */
  readonly running = input<boolean>(false);
  /** Whether the textarea receives focus when the editor appears. */
  readonly autoFocus = input<boolean>(true);

  /** Emits the saved edit payload. */
  readonly save = output<AgentChatMessageEdit>();
  /** Emits the id of the message whose edit was cancelled. */
  readonly cancel = output<string>();

  /** Current draft text. */
  readonly draft = linkedSignal(
    () => this.message()?.content ?? this.initialText(),
  );
  /** Whether the draft differs from the original text. */
  readonly dirty = signal(false);
  /** Whether a save is in flight. */
  readonly saving = signal(false);
  /** Last save error, or `null`. */
  readonly error = signal<string | null>(null);

  /** Stable id linking the editor label and textarea. */
  readonly textareaId = `agent-chat-message-editor-${++editorSequence}`;
  /** Editor textarea element. */
  readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>("textarea");

  private readonly service = inject(AgentChatService, { optional: true });

  /** Text the message held when editing began. */
  readonly original = computed(
    () => this.message()?.content ?? this.initialText(),
  );
  /** Id of the message being edited. */
  readonly targetId = computed(
    () => this.message()?.id ?? this.messageId(),
  );
  /** Whether the current draft can be saved. */
  readonly canSave = computed(
    () => !this.running() && !this.saving() && this.draft().trim().length > 0,
  );

  /** Focuses the textarea when `autoFocus` is enabled. */
  ngAfterViewInit(): void {
    if (!this.autoFocus()) return;
    this.textarea()?.nativeElement.focus();
  }

  /** Updates the draft and dirty state. */
  onInput(value: string): void {
    this.draft.set(value);
    this.dirty.set(value !== this.original());
  }

  /** Prevents native submission and saves the draft. */
  onSubmit(event: Event): void {
    event.preventDefault();
    void this.saveEdit();
  }

  /** Handles Escape and Ctrl/Cmd+Enter shortcuts. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.cancelEdit();
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.saveEdit();
    }
  }

  /** Persists the edit through the optional chat service and emits it. */
  async saveEdit(): Promise<void> {
    if (!this.canSave()) return;
    const messageId = this.targetId();
    const text = this.draft().trim();
    this.error.set(null);
    this.saving.set(true);
    try {
      if (this.service && messageId) {
        await this.service.editMessage(messageId, text);
      }
      this.dirty.set(false);
      this.save.emit({ messageId, text });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.saving.set(false);
    }
  }

  /** Resets the draft and emits the cancel event. */
  cancelEdit(): void {
    if (this.saving()) return;
    this.draft.set(this.original());
    this.dirty.set(false);
    this.error.set(null);
    this.cancel.emit(this.targetId());
  }
}
