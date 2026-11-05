import { Component, input, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Empty-state greeting or informational card shown before a conversation starts, with an optional call-to-action link. */
@Component({
  selector: "ngx-decaf-chat-greeting",
  templateUrl: "./chat-greeting.component.html",
  styleUrls: ["./chat-greeting.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatGreetingComponent {
  /** Visual variant: greeting hero or informational panel. */
  readonly variant = input<"greeting" | "info">("greeting");
  /** Optional heading override. */
  readonly title = input<string | null>(null);
  /** Optional body copy override. */
  readonly message = input<string | null>(null);
  /** Icon name rendered in the hero. */
  readonly icon = input<string>("sparkles");
  /** Pixel size of the hero icon. */
  readonly iconSize = input<number>(28);
  /** Destination of the optional call-to-action link. */
  readonly linkHref = input<string | null>(null);
  /** Label of the optional call-to-action link. */
  readonly linkLabel = input<string | null>(null);
  /** Whether the greeting animates in. */
  readonly animated = input<boolean>(true);

  /** Emits the click event of the call-to-action link. */
  readonly linkClick = output<MouseEvent>();

  /** Forwards link clicks to consumers while preserving the native event. */
  onLinkClick(event: MouseEvent): void {
    this.linkClick.emit(event);
  }
}
