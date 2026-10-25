import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  input,
  output,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let dialogSequence = 0;

/**
 * Modal presenting an AI-generated suggestion (for example a rewritten chat
 * title). The user can apply it or ignore it; Escape ignores and Enter (on the
 * dialog) or Ctrl/Cmd+Enter applies.
 */
@Component({
  selector: "ngx-decaf-chat-suggestion-dialog",
  templateUrl: "./chat-suggestion-dialog.component.html",
  styleUrls: ["./chat-suggestion-dialog.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatSuggestionDialogComponent {
  /** Whether the dialog is visible. */
  readonly open = input<boolean>(false);
  /** The AI-generated suggestion text. */
  readonly suggestion = input<string>("");
  /** Optional title override. */
  readonly title = input<string | null>(null);
  /** Optional description override. */
  readonly description = input<string | null>(null);

  /** Emits the applied suggestion. */
  readonly apply = output<string>();
  /** Emits when the suggestion is ignored or dismissed. */
  readonly ignore = output<void>();

  /** Whether the suggestion can be applied. */
  readonly canApply = computed(() => this.suggestion().trim().length > 0);

  /** Dialog element focused when the suggestion opens. */
  readonly dialog = viewChild<ElementRef<HTMLElement>>("dialog");

  private readonly instance = ++dialogSequence;

  /** Title element id used by `aria-labelledby`. */
  readonly titleId = `agent-chat-suggestion-title-${this.instance}`;
  /** Description element id used by `aria-describedby`. */
  readonly descriptionId = `agent-chat-suggestion-description-${this.instance}`;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      queueMicrotask(() => this.dialog()?.nativeElement.focus());
    });
  }

  /** Applies the suggestion. */
  applySuggestion(): void {
    if (!this.open() || !this.canApply()) return;
    this.apply.emit(this.suggestion());
  }

  /** Ignores the suggestion. */
  ignoreSuggestion(): void {
    if (!this.open()) return;
    this.ignore.emit();
  }

  /** Ignores the suggestion when the backdrop itself is clicked. */
  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    this.ignoreSuggestion();
  }

  /** Keyboard behaviour: Escape ignores; Enter/Ctrl+Enter applies. */
  @HostListener("document:keydown", ["$event"])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.ignoreSuggestion();
      return;
    }
    if (event.key !== "Enter") return;
    const withModifier = event.ctrlKey || event.metaKey;
    const onDialog = event.target === this.dialog()?.nativeElement;
    if (!withModifier && !onDialog) return;
    event.preventDefault();
    this.applySuggestion();
  }
}
