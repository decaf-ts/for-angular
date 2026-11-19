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
  /**
   * Whether the host has an `@path` picker wired to this composer.
   * When true, the composer tracks the `@` token under the caret, emits
   * {@link atQuery}, and forwards ArrowUp/ArrowDown/Enter/Escape to the host
   * while a query is active.
   */
  readonly atFileEnabled = input<boolean>(false);
  /** Emits the active `@path` query (without the leading `@`) or `null`. */
  readonly atQuery = output<string | null>();
  /** Emits `1`/`-1` when the host should move the `@path` picker selection. */
  readonly atNavigate = output<number>();
  /** Emits when the host should accept the active `@path` candidate. */
  readonly atPick = output<void>();
  /** Emits when the host should dismiss the `@path` picker. */
  readonly atDismiss = output<void>();

  /** Current draft text. */
  readonly draft = linkedSignal(() => this.value());
  /** Active `@path` token span, when the composer is showing a query. */
  private atToken: { start: number; end: number } | null = null;

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
    this.updateAtQuery(textarea.value, textarea.selectionStart);
    this.scheduleAutoGrow();
  }

  /** Enter sends; Shift+Enter keeps the default newline behaviour. */
  onKeydown(event: KeyboardEvent): void {
    if (this.atFileEnabled() && this.atToken && !event.isComposing) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this.atNavigate.emit(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this.atNavigate.emit(-1);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        this.clearAtQuery();
        this.atDismiss.emit();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.atPick.emit();
        return;
      }
    }
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
    this.clearAtQuery();
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

  /**
   * Replace the active `@` token with a workspace reference.
   * Writes `@relative` plus a trailing `/` for directories and a space, then
   * syncs the query state and focuses the textarea. No-op when disabled.
   * @param relative - Workspace-relative path of the accepted entry.
   * @param kind - Whether the accepted entry is a file or a directory.
   */
  acceptAtFileReference(relative: string, kind: "file" | "dir"): void {
    if (this.disabled()) return;
    const token = `@${relative}${kind === "dir" ? "/" : ""} `;
    const span = this.atToken ?? {
      start: this.draft().length,
      end: this.draft().length,
    };
    const next =
      this.draft().slice(0, span.start) + token + this.draft().slice(span.end);
    this.setDraft(next);
    this.scheduleFocus();
  }

  /**
   * Replace the draft and keep the slash and `@` query state in sync.
   * Emits {@link valueChange}, regrows the textarea, and treats `text.length`
   * as the caret when resolving the active `@` query. No-op when disabled.
   * @param text - The complete replacement draft.
   */
  setDraft(text: string): void {
    if (this.disabled()) return;
    this.draft.set(text);
    this.valueChange.emit(text);
    this.emitSlashQuery(text);
    this.updateAtQuery(text, text.length);
    this.scheduleAutoGrow();
  }

  /**
   * Remove one referenced `@path` token from the draft.
   * Delegates to {@link setDraft} so the emitted value and query state stay
   * consistent. No-op when disabled.
   * @param start - Inclusive start offset of the token.
   * @param end - Exclusive end offset of the token.
   */
  removeAtFileToken(start: number, end: number): void {
    if (this.disabled()) return;
    this.setDraft(this.draft().slice(0, start) + this.draft().slice(end));
  }

  /**
   * Insert text at the current selection.
   * Replaces the selected range (or appends at the end when the textarea is
   * unavailable), emits {@link valueChange}, and restores the caret after the
   * inserted text. Used by the host for protected pastes. No-op when disabled.
   * @param text - The text to insert.
   */
  insertAtCursor(text: string): void {
    if (this.disabled()) return;
    const textarea = this.textarea()?.nativeElement;
    const start = textarea?.selectionStart ?? this.draft().length;
    const end = textarea?.selectionEnd ?? start;
    const next =
      this.draft().slice(0, start) + text + this.draft().slice(end);
    this.draft.set(next);
    this.valueChange.emit(next);
    this.emitSlashQuery(next);
    const caret = start + text.length;
    this.updateAtQuery(next, caret);
    setTimeout(() => {
      const element = this.textarea()?.nativeElement;
      if (!element) return;
      element.focus();
      element.setSelectionRange(caret, caret);
    });
    this.scheduleAutoGrow();
  }

  /**
   * Clear the active `@` token span, emit `null` to {@link atQuery}, and let
   * the host hide the picker.
   */
  clearAtQuery(): void {
    this.atToken = null;
    this.atQuery.emit(null);
  }

  /** Focuses the textarea. */
  focus(): void {
    this.textarea()?.nativeElement.focus();
  }

  private emitSlashQuery(text: string): void {
    this.slashQuery.emit(extractSlashQuery(text));
  }

  private updateAtQuery(text: string, caret: number): void {
    if (!this.atFileEnabled()) {
      if (this.atToken) this.clearAtQuery();
      return;
    }
    const query = activeAtPathQuery(text, caret);
    this.atToken = query ? { start: query.start, end: query.end } : null;
    this.atQuery.emit(query ? query.query : null);
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

/**
 * Resolve the active `@path` query for a draft and caret.
 * Returns `null` when the caret is not inside a mention or when the token or
 * its suffix contains whitespace, another `@`, or a pasted-mention marker.
 * @param text - The current draft text.
 * @param caret - The caret offset in the draft.
 * @returns The query text and replacement span, or `null`.
 */
function activeAtPathQuery(
  text: string,
  caret: number,
): { query: string; start: number; end: number } | null {
  if (caret <= 0) return null;
  const before = text.slice(0, caret);
  const start = before.lastIndexOf("@");
  if (start < 0) return null;
  const token = before.slice(start + 1);
  if (token.length > 0 && /[\s@]/u.test(token)) return null;
  if (token.includes("\u2060")) return null;
  const suffix = /^\S*/u.exec(text.slice(caret))?.[0] ?? "";
  if (suffix.includes("@") || suffix.includes("\u2060")) return null;
  return { query: token + suffix, start, end: caret + suffix.length };
}
