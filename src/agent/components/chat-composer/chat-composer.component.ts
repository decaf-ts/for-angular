import {
  Component,
  ElementRef,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let composerSequence = 0;

/**
 * Prompt composer for the agent chat: auto-growing textarea, Enter-to-send /
 * Shift+Enter-newline, a status-aware send/stop button, disabled-while-running
 * mode, and optional clear-and-refocus after a send.
 */
@Component({
  selector: "ngx-decaf-chat-composer",
  templateUrl: "./chat-composer.component.html",
  styleUrls: ["./chat-composer.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatComposerComponent {
  /** Controlled draft value; local edits emit `valueChange`. */
  readonly value = input<string>("");
  /** Whether an agent roundtrip is in flight (switches the button to stop). */
  readonly running = input<boolean>(false);
  /** Fully disables the textarea and both actions. */
  readonly disabled = input<boolean>(false);
  /** Disables the textarea while a roundtrip is running. */
  readonly disabledWhileRunning = input<boolean>(true);
  /** Clears the draft after a successful send. */
  readonly clearOnSend = input<boolean>(true);
  /** Restores focus to the textarea after a send. */
  readonly refocusOnSend = input<boolean>(true);
  /** Placeholder override; defaults to the `agent.chat.composer.message.placeholder` key. */
  readonly placeholder = input<string | null>(null);
  /** Minimum visible rows. */
  readonly minRows = input<number>(1);
  /** Maximum rows before the textarea scrolls. */
  readonly maxRows = input<number>(6);

  /** Emits the trimmed prompt when the user sends. */
  readonly send = output<string>();
  /** Emits when the user stops the running response. */
  readonly stop = output<void>();
  /** Emits every draft change. */
  readonly valueChange = output<string>();
  /** Emits the active slash query (`/foo` -> `foo`) or `null`. */
  readonly slashQuery = output<string | null>();

  /** Current draft text. */
  readonly draft = linkedSignal(() => this.value());

  /** Stable id used by the label/textarea pair. */
  readonly textareaId = `agent-chat-composer-${++composerSequence}`;
  /** The auto-growing textarea. */
  readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>("textarea");

  /** Whether the textarea accepts input right now. */
  readonly inputDisabled = computed(
    () => this.disabled() || (this.running() && this.disabledWhileRunning()),
  );
  /** Whether a prompt can be submitted. */
  readonly canSend = computed(
    () => !this.disabled() && !this.running() && this.draft().trim().length > 0,
  );
  /** Whether the stop action is available. */
  readonly canStop = computed(() => this.running() && !this.disabled());
  /** Hint shown next to the actions. */
  readonly hintKey = computed(() =>
    this.running()
      ? "agent.chat.composer.runningHint"
      : "agent.chat.composer.hint",
  );
  /** Hint fallback shown next to the actions. */
  readonly hintFallback = computed(() =>
    this.running() ? "Agent is responding…" : "Enter to send, Shift+Enter for a new line",
  );

  /** Handles the textarea input event, syncing the draft and slash query. */
  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.draft.set(textarea.value);
    this.valueChange.emit(textarea.value);
    this.emitSlashQuery(textarea.value);
    this.scheduleAutoGrow();
  }

  /** Enter sends; Shift+Enter keeps the default newline behaviour. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.isComposing) return;
    event.preventDefault();
    this.submit();
  }

  /** Submits the prompt, or stops the running response. */
  submit(): void {
    if (this.disabled()) return;
    if (this.running()) {
      if (this.canStop()) this.stop.emit();
      return;
    }
    if (!this.canSend()) return;
    const text = this.draft().trim();
    this.send.emit(text);
    if (!this.clearOnSend()) return;
    this.draft.set("");
    this.valueChange.emit("");
    this.emitSlashQuery("");
    this.scheduleAutoGrow();
    if (this.refocusOnSend()) this.scheduleFocus();
  }

  /** Prevent the native form submission; `submit()` owns the behaviour. */
  onFormSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  /** Replaces the draft with an accepted slash command. */
  acceptSlashCommand(command: string): void {
    if (this.disabled()) return;
    const next = `/${command.replace(/^\//, "")} `;
    this.draft.set(next);
    this.valueChange.emit(next);
    this.emitSlashQuery(next);
    this.scheduleAutoGrow();
    this.scheduleFocus();
  }

  /** Focuses the textarea. */
  focus(): void {
    this.textarea()?.nativeElement.focus();
  }

  private emitSlashQuery(text: string): void {
    this.slashQuery.emit(extractSlashQuery(text));
  }

  private scheduleFocus(): void {
    queueMicrotask(() => this.focus());
  }

  private scheduleAutoGrow(): void {
    queueMicrotask(() => this.autoGrow());
  }

  /** Grows the textarea up to `maxRows`, then scrolls. */
  autoGrow(): void {
    const textarea = this.textarea()?.nativeElement;
    if (!textarea) return;
    const maxHeight = this.maxRows() * 22;
    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    if (!scrollHeight) return;
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }
}

/** Extracts the slash-command prefix from a draft, or `null` when not composing one. */
function extractSlashQuery(text: string): string | null {
  if (!text.startsWith("/")) return null;
  if (/\s/.test(text)) return null;
  return text.slice(1);
}
