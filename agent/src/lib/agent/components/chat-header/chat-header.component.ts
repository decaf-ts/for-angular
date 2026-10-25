import { Component, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";

/** Chat header bar: title, namespace badges, and the history, knowledge-base, and telemetry toggles. */
@Component({
  selector: "ngx-decaf-chat-header",
  templateUrl: "./chat-header.component.html",
  styleUrls: ["./chat-header.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatHeaderComponent {
  /** i18n key for the header title. */
  readonly titleKey = input<string>("agent.chat.title");
  /** Fallback title rendered when the key is missing. */
  readonly titleFallback = input<string>("Agent chat");
  /** Namespace labels rendered as context badges. */
  readonly namespaces = input<string[]>([]);
  /** Whether the history toggle is offered. */
  readonly showHistory = input<boolean>(true);
  /** Whether the knowledge-base toggle is offered. */
  readonly showKnowledgeBase = input<boolean>(true);
  /** Whether the history rail is currently open. */
  readonly historyOpen = input<boolean>(false);
  /** Whether the knowledge-base selector is currently open. */
  readonly knowledgeOpen = input<boolean>(false);
  /** Whether the telemetry panel is currently open. */
  readonly telemetryOpen = input<boolean>(false);
  /** Number of knowledge sources staged for the next send. */
  readonly selectedKnowledgeCount = input<number>(0);

  /** Emits when the history toggle is activated. */
  readonly historyToggle = output<void>();
  /** Emits when the knowledge-base toggle is activated. */
  readonly knowledgeBaseOpen = output<void>();
  /** Emits when the telemetry toggle is activated. */
  readonly telemetryToggle = output<void>();
}
