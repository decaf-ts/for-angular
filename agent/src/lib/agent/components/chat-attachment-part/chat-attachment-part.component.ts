import { Component, computed, input } from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatAttachment } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/**
 * Renders a sent attachment inside a message: an image, a decoded text box, or
 * a fallback chip for any other MIME type.
 */
@Component({
  selector: "ngx-decaf-chat-attachment-part",
  templateUrl: "./chat-attachment-part.component.html",
  styleUrls: ["./chat-attachment-part.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatAttachmentPartComponent {
  /** The attachment to render. */
  readonly attachment = input<AgentChatAttachment | null>(null);
  /** Decoded text override; falls back to `attachment.textPreview`. */
  readonly text = input<string | null>(null);
  /** Maximum characters of text rendered; `0` renders everything. */
  readonly maxTextLength = input<number>(0);

  /** Whether the attachment renders as an image. */
  readonly isImage = computed(() => {
    const mime = this.attachment()?.mime ?? "";
    return /^image\//i.test(mime);
  });
  /** Whether the attachment renders as decoded text. */
  readonly isText = computed(() => isTextMime(this.attachment()?.mime ?? ""));
  /** Image source, when the attachment carries a URL. */
  readonly imageUrl = computed(() => this.attachment()?.url ?? null);
  /** Decoded text shown in the text box. */
  readonly textContent = computed(() => {
    const content = this.text() ?? this.attachment()?.textPreview ?? "";
    const max = this.maxTextLength();
    if (max > 0 && content.length > max) return `${content.slice(0, max)}…`;
    return content;
  });
  /** Whether a text box has content to show. */
  readonly hasText = computed(() => this.textContent().trim().length > 0);
}

function isTextMime(mime: string): boolean {
  const normalized = (mime || "").toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized === "application/json" ||
    normalized === "application/xml" ||
    normalized === "application/javascript"
  );
}
