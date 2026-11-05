import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Typing/thinking placeholder shown while the agent is composing a response, with an optional avatar and animated line widths. */
@Component({
  selector: "ngx-decaf-chat-thinking-message",
  templateUrl: "./chat-thinking-message.component.html",
  styleUrls: ["./chat-thinking-message.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatThinkingMessageComponent {
  /** Optional label override; defaults to `agent.chat.thinking`. */
  readonly label = input<string | null>(null);
  /** Number of placeholder lines to render (minimum one). */
  readonly lines = input<number>(2);
  /** Whether the placeholder lines animate. */
  readonly animated = input<boolean>(true);
  /** Whether the agent avatar is rendered. */
  readonly showAvatar = input<boolean>(true);
  /** Icon name used for the avatar. */
  readonly avatarIcon = input<string>("bot");

  /** Zero-based indexes of the placeholder lines. */
  readonly lineIndexes = computed(() =>
    Array.from({ length: Math.max(1, Math.floor(this.lines())) }, (_, i) => i),
  );

  /** Width percentage for the given line index, tapering down the block. */
  lineWidth(index: number): number {
    return Math.max(35, 100 - index * 20);
  }
}
