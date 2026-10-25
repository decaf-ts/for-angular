import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatStagedAttachment } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

const DEFAULT_TEXT_PREVIEW = 100;

/**
 * Staged-attachment strip rendered above the composer: image thumbnails via
 * object URLs, text-file preview cards (first 100 characters), size/MIME chips,
 * and per-item removal. Cleared implicitly when the parent empties the input.
 */
@Component({
  selector: "ngx-decaf-chat-attachment-preview",
  templateUrl: "./chat-attachment-preview.component.html",
  styleUrls: ["./chat-attachment-preview.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatAttachmentPreviewComponent {
  /** Attachments staged for the next send. */
  readonly attachments = input<AgentChatStagedAttachment[]>([]);
  /** Maximum characters rendered in a text-file preview card. */
  readonly maxTextPreview = input<number>(DEFAULT_TEXT_PREVIEW);

  /** Emits the id of the attachment the user removed. */
  readonly remove = output<string>();

  /** Object URLs keyed by attachment id (`blob:` URLs are revoked on removal). */
  readonly imageUrls = signal<Record<string, string>>({});
  /** Decoded text excerpts keyed by attachment id. */
  readonly textPreviews = signal<Record<string, string>>({});

  private readonly objectUrls = new Map<string, string>();
  private readonly pendingReads = new Set<string>();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const list = this.attachments();
      const alive = new Set(list.map((attachment) => attachment.id));
      this.revokeStale(alive);
      const next: Record<string, string> = {};
      for (const attachment of list) {
        if (isImageMime(attachment.mime)) {
          const url = this.previewUrl(attachment);
          if (url) next[attachment.id] = url;
        }
        if (isTextMime(attachment.mime)) this.readTextPreview(attachment);
      }
      this.imageUrls.set(next);
    });

    this.destroyRef.onDestroy(() => {
      this.revokeStale(new Set());
    });
  }

  /** Whether the attachment is rendered as an image thumbnail. */
  isImage(attachment: AgentChatStagedAttachment): boolean {
    return isImageMime(attachment.mime);
  }

  /** Whether the attachment is rendered as a text preview card. */
  isText(attachment: AgentChatStagedAttachment): boolean {
    return isTextMime(attachment.mime);
  }

  /** Image URL used for the thumbnail, if any. */
  imageUrl(attachment: AgentChatStagedAttachment): string | null {
    return attachment.url ?? this.imageUrls()[attachment.id] ?? null;
  }

  /** Truncated text excerpt shown in a text preview card. */
  textPreview(attachment: AgentChatStagedAttachment): string {
    const text = attachment.textPreview ?? this.textPreviews()[attachment.id] ?? "";
    return truncate(text, this.maxTextPreview());
  }

  /** Human-readable file size (B/KB/MB). */
  formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Emits the remove event for the given attachment id. */
  removeAttachment(id: string): void {
    this.remove.emit(id);
  }

  private previewUrl(attachment: AgentChatStagedAttachment): string | null {
    if (attachment.url) return attachment.url;
    const cached = this.objectUrls.get(attachment.id);
    if (cached) return cached;
    const file = attachment.file;
    if (!file) return null;
    const urlApi = URL as typeof URL & {
      createObjectURL?: (blob: Blob) => string;
    };
    if (typeof urlApi.createObjectURL !== "function") return null;
    const url = urlApi.createObjectURL(file);
    this.objectUrls.set(attachment.id, url);
    return url;
  }

  private revokeStale(alive: Set<string>): void {
    const urlApi = URL as typeof URL & {
      revokeObjectURL?: (url: string) => void;
    };
    for (const [id, url] of Array.from(this.objectUrls.entries())) {
      if (alive.has(id)) continue;
      urlApi.revokeObjectURL?.(url);
      this.objectUrls.delete(id);
    }
  }

  private readTextPreview(attachment: AgentChatStagedAttachment): void {
    if (attachment.textPreview) return;
    if (this.pendingReads.has(attachment.id)) return;
    const file = attachment.file;
    if (!file || typeof file.text !== "function") return;
    this.pendingReads.add(attachment.id);
    void file
      .text()
      .then((text) => {
        this.pendingReads.delete(attachment.id);
        this.textPreviews.update((current) => ({
          ...current,
          [attachment.id]: text,
        }));
      })
      .catch(() => {
        this.pendingReads.delete(attachment.id);
      });
  }
}

function isImageMime(mime: string): boolean {
  return /^image\//i.test(mime);
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

function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
