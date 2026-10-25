import {
  AfterViewChecked,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { agentChatTranscriptMarkdown } from "../../services/agentTranscriptMarkdown";
import type {
  AgentChatMessageView,
  AgentChatTranscriptDownload,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Scrollable transcript container: renders the message list, empty state, scroll-to-bottom affordance, and transcript download (markdown export). */
@Component({
  selector: "ngx-decaf-chat-conversation",
  templateUrl: "./chat-conversation.component.html",
  styleUrls: ["./chat-conversation.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatConversationComponent implements AfterViewChecked {
  /** Messages rendered in the transcript. */
  readonly messages = input<AgentChatMessageView[]>([]);
  /** Whether a response is currently streaming (suppresses the empty state). */
  readonly running = input<boolean>(false);
  /** Whether the transcript follows new content automatically. */
  readonly autoscroll = input<boolean>(true);
  /** Default filename for the downloaded transcript. */
  readonly downloadFilename = input<string>("conversation.md");
  /** Optional markdown title for the generated transcript. */
  readonly downloadTitle = input<string | null>(null);
  /** Precomputed markdown override; generated from `messages` when omitted. */
  readonly downloadText = input<string | null>(null);
  /** Whether the download action is offered. */
  readonly downloadEnabled = input<boolean>(true);
  /** Optional empty-state message override. */
  readonly emptyMessage = input<string | null>(null);
  /** Whether the empty state is rendered. */
  readonly showEmptyMessage = input<boolean>(true);
  /** Distance in pixels from the bottom before the user is considered scrolled up. */
  readonly scrollThreshold = input<number>(48);

  /** Emits the downloaded transcript payload. */
  readonly download = output<AgentChatTranscriptDownload>();

  /** Scroll container element. */
  readonly transcript = viewChild<ElementRef<HTMLElement>>("transcript");
  /** Whether the user has scrolled away from the bottom. */
  readonly scrolledUp = signal(false);
  /** Whether the transcript should render its empty state. */
  readonly isEmpty = computed(
    () => this.messages().length === 0 && !this.running(),
  );

  private scrollPending = false;

  constructor() {
    effect(() => {
      this.messages();
      this.running();
      if (this.autoscroll()) this.scrollPending = true;
    });
  }

  /** Applies a pending autoscroll after Angular renders new content. */
  ngAfterViewChecked(): void {
    if (!this.scrollPending) return;
    this.scrollPending = false;
    this.scrollToBottom();
  }

  /** Tracks whether the container is scrolled away from the bottom. */
  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    this.scrolledUp.set(distance > this.scrollThreshold());
  }

  /** Scrolls the transcript to the newest message. */
  scrollToBottom(): void {
    const element = this.transcript()?.nativeElement;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    this.scrolledUp.set(false);
  }

  /** Emits and saves the transcript as markdown. */
  downloadTranscript(): void {
    const filename = this.downloadFilename();
    const markdown =
      this.downloadText() ??
      agentChatTranscriptMarkdown(this.messages(), {
        title: this.downloadTitle() ?? undefined,
      });
    this.download.emit({ filename, markdown });
    this.saveToFile(filename, markdown);
  }

  private saveToFile(filename: string, markdown: string): void {
    if (typeof document === "undefined") return;
    const urlApi = URL as typeof URL & {
      createObjectURL?: (blob: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    if (typeof urlApi.createObjectURL !== "function") return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = urlApi.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    urlApi.revokeObjectURL?.(url);
  }
}
