import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatAttachmentRejection } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

const DEFAULT_ACCEPT = ["image/*", "text/*"];

/**
 * Attachment intake for the chat composer: paperclip button with a hidden
 * multi-file input, a full-screen drag-and-drop overlay, and clipboard paste of
 * files. Validates MIME type and optional size before emitting.
 */
@Component({
  selector: "ngx-decaf-chat-attachment-input",
  templateUrl: "./chat-attachment-input.component.html",
  styleUrls: ["./chat-attachment-input.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatAttachmentInputComponent {
  /** Accepted MIME patterns (`image/*`, `text/plain`, `.csv`, or a wildcard for any type). */
  readonly accept = input<string[]>([...DEFAULT_ACCEPT]);
  /** Whether more than one file can be selected at a time. */
  readonly multiple = input<boolean>(true);
  /** Disables the picker, drop zone, and paste handling. */
  readonly disabled = input<boolean>(false);
  /** Also accept pasted files when the paste target is outside this host. */
  readonly globalPaste = input<boolean>(false);
  /** Optional maximum file size in bytes; larger files are rejected. */
  readonly maxSize = input<number | null>(null);

  /** Emits files that passed validation. */
  readonly filesSelected = output<File[]>();
  /** Emits every rejected file with its reason. */
  readonly rejected = output<AgentChatAttachmentRejection[]>();
  /** Emits the i18n key describing the rejection (no hardcoded UI text). */
  // eslint-disable-next-line @angular-eslint/no-output-native -- Public event name is already in use.
  readonly error = output<string>();

  /** Whether the full-screen drop overlay is visible. */
  readonly dragging = signal(false);
  /** Number of files rejected by the last intake. */
  readonly rejectedCount = signal(0);

  /** `accept` attribute for the hidden file input. */
  readonly acceptAttr = computed(() => this.accept().join(","));

  private readonly host = inject(ElementRef<HTMLElement>);
  private dragDepth = 0;
  private readonly errorKey = "agent.chat.attachments.invalidType";

  /** Opens the hidden file picker. */
  openPicker(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    if (this.disabled()) return;
    input.click();
  }

  /** Handles files chosen through the hidden input. */
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.processFiles(input.files);
    input.value = "";
  }

  /** Handles a window drag-enter, showing the overlay once files are present. */
  @HostListener("window:dragenter", ["$event"])
  onWindowDragEnter(event: DragEvent): void {
    if (this.disabled() || !hasFiles(event)) return;
    this.dragDepth += 1;
    this.dragging.set(true);
  }

  /** Keeps the browser from opening dropped files. */
  @HostListener("window:dragover", ["$event"])
  onWindowDragOver(event: DragEvent): void {
    if (this.disabled() || !hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    this.dragging.set(true);
  }

  /** Hides the overlay once the drag leaves the window. */
  @HostListener("window:dragleave", ["$event"])
  onWindowDragLeave(event: DragEvent): void {
    if (this.disabled()) return;
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragging.set(false);
  }

  /** Accepts dropped files and hides the overlay. */
  @HostListener("window:drop", ["$event"])
  onWindowDrop(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    if (hasFiles(event)) this.processFiles(event.dataTransfer?.files ?? null);
  }

  /** Accepts files pasted from the clipboard. */
  @HostListener("document:paste", ["$event"])
  onPaste(event: ClipboardEvent): void {
    if (this.disabled()) return;
    const target = event.target as Node | null;
    const insideHost = !!target && this.host.nativeElement.contains(target);
    if (!insideHost && !this.globalPaste()) return;
    const files = event.clipboardData?.files ?? null;
    if (!files || files.length === 0) return;
    event.preventDefault();
    this.processFiles(files);
  }

  /** Validates and emits a file list. */
  processFiles(files: FileList | File[] | null): void {
    if (this.disabled() || !files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    const selected = this.multiple() ? list : list.slice(0, 1);
    const accepted: File[] = [];
    const rejected: AgentChatAttachmentRejection[] = [];
    for (const file of selected) {
      const reason = this.rejectReason(file);
      if (reason) {
        rejected.push({
          name: file.name,
          mime: mimeOf(file),
          size: file.size,
          reason,
        });
      } else {
        accepted.push(file);
      }
    }
    this.rejectedCount.set(rejected.length);
    if (accepted.length > 0) this.filesSelected.emit(accepted);
    if (rejected.length > 0) {
      this.rejected.emit(rejected);
      this.error.emit(this.errorKey);
    }
  }

  /** Returns the rejection reason for a file, or `null` when accepted. */
  rejectReason(file: File): AgentChatAttachmentRejection["reason"] | null {
    const maxSize = this.maxSize();
    if (maxSize !== null && file.size > maxSize) return "size";
    const mime = mimeOf(file);
    if (!this.accept().some((pattern) => matchesAccept(pattern, mime, file.name))) {
      return "mime";
    }
    return null;
  }
}

function mimeOf(file: File): string {
  return file.type || "application/octet-stream";
}

function matchesAccept(pattern: string, mime: string, name: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "*/*" || normalized === "*") return true;
  if (normalized.startsWith(".")) {
    return name.toLowerCase().endsWith(normalized);
  }
  const actual = mime.toLowerCase();
  if (normalized.endsWith("/*")) {
    return actual.startsWith(normalized.slice(0, -1));
  }
  return actual === normalized;
}

function hasFiles(event: DragEvent): boolean {
  if (!event?.dataTransfer) return false;
  const types = Array.from(event.dataTransfer.types ?? []);
  return types.includes("Files") || (event.dataTransfer.files?.length ?? 0) > 0;
}
