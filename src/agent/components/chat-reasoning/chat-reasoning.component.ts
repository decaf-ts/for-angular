import { Component, input, linkedSignal, output } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let reasoningSequence = 0;

/** Collapsible reasoning/thinking block rendered inside a message, with inline or block layout and streamed-content support. */
@Component({
  selector: "ngx-decaf-chat-reasoning",
  templateUrl: "./chat-reasoning.component.html",
  styleUrls: ["./chat-reasoning.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatReasoningComponent {
  /** Optional title override. */
  readonly title = input<string | null>(null);
  /** Reasoning text produced by the model. */
  readonly content = input<string>("");
  /** Controlled expanded state. */
  readonly open = input<boolean>(false);
  /** Whether the reasoning is still streaming. */
  readonly streaming = input<boolean>(false);
  /** Whether the block renders inline with surrounding text. */
  readonly inline = input<boolean>(false);
  /** Optional metadata line shown beside the title. */
  readonly meta = input<string | null>(null);

  /** Emits every expanded/collapsed transition. */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly toggle = output<boolean>();

  /** Stable id linking the trigger to the collapsible content. */
  readonly contentId = `agent-chat-reasoning-${++reasoningSequence}`;
  /** Effective expanded state, initialized from `open`. */
  readonly isOpen = linkedSignal(() => this.open());

  /** Sets the expanded state and emits the change. */
  setOpen(open: boolean): void {
    this.isOpen.set(open);
    this.toggle.emit(open);
  }

  /** Toggles the expanded state from the header trigger. */
  onTrigger(): void {
    this.setOpen(!this.isOpen());
  }
}
