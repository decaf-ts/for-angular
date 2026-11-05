import { Component, computed, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";

/**
 * Grid of starter prompts shown only in the chat's empty state. Each button
 * emits its prompt so the composition root can send it through the composer.
 */
@Component({
  selector: "ngx-decaf-chat-suggested-actions",
  templateUrl: "./chat-suggested-actions.component.html",
  styleUrls: ["./chat-suggested-actions.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatSuggestedActionsComponent {
  /** Starter prompts rendered as buttons. */
  readonly suggestions = input<string[]>([]);
  /** Whether the conversation is empty (the only state where actions show). */
  readonly empty = input<boolean>(true);
  /** Optional heading override. */
  readonly title = input<string | null>(null);
  /** Disables every suggestion button. */
  readonly disabled = input<boolean>(false);

  /** Emits the selected prompt. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly select = output<string>();

  /** Whether the grid should render. */
  readonly visible = computed(
    () => this.empty() && !this.disabled() && this.suggestions().length > 0,
  );

  /** Emits the prompt for a clicked suggestion. */
  choose(suggestion: string): void {
    if (this.disabled()) return;
    this.select.emit(suggestion);
  }
}
