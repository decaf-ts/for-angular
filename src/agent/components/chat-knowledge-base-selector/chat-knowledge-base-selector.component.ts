import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { firstValueFrom, isObservable } from "rxjs";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { AGENT_CHAT_KNOWLEDGE_BASE_SOURCE } from "../../tokens/agent-chat.tokens";
import type {
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeBaseSource,
  AgentChatKnowledgeSource,
  AgentChatKnowledgeUpload,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

let uploadSequence = 0;

/** Knowledge-base picker: lists and selects entries, supports select-all/clear, uploads files (through the injected `AGENT_CHAT_KNOWLEDGE_BASE_SOURCE` when no entries are supplied), and removes entries. */
@Component({
  selector: "ngx-decaf-chat-knowledge-base-selector",
  templateUrl: "./chat-knowledge-base-selector.component.html",
  styleUrls: ["./chat-knowledge-base-selector.component.scss"],
  imports: [ChatIconComponent, AgentTranslateFallbackPipe],
  standalone: true,
})
export class ChatKnowledgeBaseSelectorComponent implements OnInit {
  /** Whether the selector panel is open. */
  readonly open = input<boolean>(true);
  /** Directly supplied entries; `null` delegates to `sources` or the injected source. */
  readonly entries = input<AgentChatKnowledgeBaseEntry[] | null>(null);
  /** Knowledge sources converted into selectable entries. */
  readonly sources = input<AgentChatKnowledgeSource[] | null>(null);
  /** Controlled selected entry ids. */
  readonly selectedIds = input<string[]>([]);
  /** External loading flag merged with internal loading. */
  readonly loading = input<boolean>(false);
  /** Whether uploading is offered. */
  readonly uploadEnabled = input<boolean>(true);
  /** Whether entry deletion is offered. */
  readonly deleteEnabled = input<boolean>(true);
  /** Number of skeleton rows rendered while loading. */
  readonly skeletonRows = input<number>(3);
  /** Optional heading override. */
  readonly title = input<string | null>(null);

  /** Emits the selected entry ids. */
  readonly selectionChange = output<string[]>();
  /** Emits the number of selected entries. */
  readonly countChange = output<number>();
  /** Emits panel open/close transitions. */
  readonly openChange = output<boolean>();
  /** Emits the entry list after uploads or deletions. */
  readonly entriesChange = output<AgentChatKnowledgeBaseEntry[]>();
  /** Emits each upload queue row as it changes. */
  readonly upload = output<AgentChatKnowledgeUpload>();
  /** Emits the entry requested for deletion. */
  readonly remove = output<AgentChatKnowledgeBaseEntry>();

  /** Entries rendered by the selector. */
  readonly items = linkedSignal<AgentChatKnowledgeBaseEntry[]>(() => {
    const entries = this.entries();
    if (entries !== null) return entries;
    const sources = this.sources();
    if (sources !== null) return sources.map(toEntry);
    return [];
  });
  /** Effective selected entry ids. */
  readonly selected = linkedSignal<string[]>(() => this.selectedIds());
  /** Upload queue rows. */
  readonly uploads = signal<AgentChatKnowledgeUpload[]>([]);
  /** Ids of entries currently being deleted. */
  readonly deletingIds = signal<string[]>([]);
  /** Whether the component is loading entries itself. */
  readonly internalLoading = signal(false);
  /** Whether the upload queue is being processed. */
  readonly processing = signal(false);
  /** Zero-based rows used to render the loading skeleton. */
  readonly skeletonRowList = computed(() =>
    Array.from({ length: Math.max(0, this.skeletonRows()) }),
  );

  /** Whether any loading source is active. */
  readonly isLoading = computed(() => this.loading() || this.internalLoading());
  /** Whether the selector is loaded and empty. */
  readonly isEmpty = computed(
    () => !this.isLoading() && this.items().length === 0,
  );
  /** Total number of selectable entries. */
  readonly total = computed(() => this.items().length);
  /** Selected ids that still exist in the entry list. */
  readonly validSelected = computed(() => {
    const ids = new Set(this.items().map((entry) => entry.id));
    return this.selected().filter((id) => ids.has(id));
  });
  /** Number of valid selected entries. */
  readonly selectedCount = computed(() => this.validSelected().length);
  /** Whether every entry is selected. */
  readonly allSelected = computed(
    () => this.total() > 0 && this.selectedCount() === this.total(),
  );
  /** Whether some, but not all, entries are selected. */
  readonly someSelected = computed(
    () => this.selectedCount() > 0 && !this.allSelected(),
  );
  /** Whether the component falls back to the injected source. */
  readonly usesSource = computed(
    () => this.entries() === null && this.sources() === null,
  );

  private readonly source = inject<AgentChatKnowledgeBaseSource | null>(
    AGENT_CHAT_KNOWLEDGE_BASE_SOURCE,
    { optional: true },
  );
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly queued = new Map<
    string,
    { file: File; entryId?: string }
  >();
  private pendingEntryId: string | undefined;

  /** Loads entries from the injected source when no entries are supplied. */
  ngOnInit(): void {
    if (!this.usesSource() || !this.source) return;
    this.internalLoading.set(true);
    this.source
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          this.items.set(entries ?? []);
          this.internalLoading.set(false);
        },
        error: () => this.internalLoading.set(false),
      });
  }

  @HostListener("document:click", ["$event"])
  /** Closes the panel on outside clicks. */
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target;
    if (target instanceof Node && this.host.nativeElement.contains(target)) {
      return;
    }
    this.requestClose();
  }

  @HostListener("document:keydown.escape")
  /** Closes the panel on Escape. */
  onEscape(): void {
    this.requestClose();
  }

  /** Whether the given entry is selected. */
  isSelected(entryId: string): boolean {
    return this.selected().includes(entryId);
  }

  /** Whether the given entry is being deleted. */
  isDeleting(entryId: string): boolean {
    return this.deletingIds().includes(entryId);
  }

  /** Toggles selection of an entry. */
  toggle(entryId: string): void {
    const next = new Set(this.selected());
    if (next.has(entryId)) next.delete(entryId);
    else next.add(entryId);
    this.selected.set([...next]);
    this.emitSelection();
  }

  /** Selects all entries or clears the selection. */
  toggleAll(): void {
    this.selected.set(
      this.allSelected() ? [] : this.items().map((entry) => entry.id),
    );
    this.emitSelection();
  }

  /** Clears the selection. */
  clearSelection(): void {
    this.selected.set([]);
    this.emitSelection();
  }

  /** Opens the hidden file input for upload. */
  openFilePicker(entryId?: string): void {
    if (!this.uploadEnabled()) return;
    this.pendingEntryId = entryId;
    const input = this.host.nativeElement.querySelector(
      "input[type='file']",
    ) as HTMLInputElement | null;
    input?.click();
  }

  /** Queues files chosen in the file input. */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.pendingEntryId = this.pendingEntryId ?? undefined;
    input.value = "";
    const entryId = this.pendingEntryId;
    this.pendingEntryId = undefined;
    this.queueFiles(files, entryId);
  }

  /** Queues files for upload and returns the new queue rows. */
  queueFiles(files: File[], entryId?: string): AgentChatKnowledgeUpload[] {
    if (!files.length) return [];
    const rows = files.map<AgentChatKnowledgeUpload>((file) => ({
      id: `upload:${++uploadSequence}`,
      name: file.name,
      size: file.size,
      entryId,
      status: "queued",
    }));
    rows.forEach((row, index) => {
      this.queued.set(row.id, { file: files[index], entryId });
    });
    this.uploads.update((uploads) => [...uploads, ...rows]);
    rows.forEach((row) => this.upload.emit(row));
    void this.processQueue();
    return rows;
  }

  /** Removes a row from the upload queue. */
  dismissUpload(uploadId: string): void {
    this.uploads.update((uploads) =>
      uploads.filter((candidate) => candidate.id !== uploadId),
    );
    this.queued.delete(uploadId);
  }

  /** Deletes an entry locally and through the source. */
  async requestDelete(entry: AgentChatKnowledgeBaseEntry): Promise<void> {
    if (!this.deleteEnabled() || this.isDeleting(entry.id)) return;
    this.deletingIds.update((ids) => [...ids, entry.id]);
    this.remove.emit(entry);
    try {
      const result = this.source?.remove?.(entry.id);
      if (result) {
        if (isObservable(result)) await firstValueFrom(result);
        else await result;
      }
    } catch {
      this.deletingIds.update((ids) => ids.filter((id) => id !== entry.id));
      return;
    }
    this.items.update((entries) =>
      entries.filter((candidate) => candidate.id !== entry.id),
    );
    this.selected.update((ids) => ids.filter((id) => id !== entry.id));
    this.deletingIds.update((ids) => ids.filter((id) => id !== entry.id));
    this.emitSelection();
    this.entriesChange.emit(this.items());
  }

  /** Requests the panel to close. */
  requestClose(): void {
    if (!this.open()) return;
    this.openChange.emit(false);
  }

  /** i18n key for an upload row status. */
  statusKey(upload: AgentChatKnowledgeUpload): string {
    return `agent.chat.knowledgeBase.status.${upload.status}`;
  }

  /** English fallback for an upload row status. */
  statusFallback(upload: AgentChatKnowledgeUpload): string {
    switch (upload.status) {
      case "queued":
        return "Queued";
      case "uploading":
        return "Uploading…";
      case "done":
        return "Uploaded";
      case "error":
        return "Upload failed";
    }
  }

  /** Secondary line describing an entry (filename, size, file count). */
  entrySubtitle(entry: AgentChatKnowledgeBaseEntry): string {
    const parts: string[] = [];
    if (entry.fileName && entry.fileName !== entry.label) {
      parts.push(entry.fileName);
    }
    if (typeof entry.size === "number") parts.push(formatBytes(entry.size));
    if (typeof entry.fileCount === "number") {
      parts.push(`${entry.fileCount}`);
    }
    return parts.join(" · ");
  }

  /** Tracks upload rows by id. */
  trackUpload(_index: number, upload: AgentChatKnowledgeUpload): string {
    return upload.id;
  }

  private emitSelection(): void {
    this.selectionChange.emit(this.selected());
    this.countChange.emit(this.selectedCount());
  }

  private async processQueue(): Promise<void> {
    if (this.processing()) return;
    this.processing.set(true);
    for (;;) {
      const next = this.uploads().find((row) => row.status === "queued");
      if (!next) break;
      const queued = this.queued.get(next.id);
      this.updateUpload(next.id, { status: "uploading" });
      try {
        const result = await this.performUpload(next.entryId, queued?.file);
        const updated = result ?? this.entryFromUpload(next);
        if (updated) {
          this.items.update((entries) => upsertEntry(entries, updated));
          this.entriesChange.emit(this.items());
        }
        this.updateUpload(next.id, { status: "done", progress: 1 });
      } catch (error) {
        this.updateUpload(next.id, {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.queued.delete(next.id);
    }
    this.processing.set(false);
  }

  private async performUpload(
    entryId: string | undefined,
    file: File | undefined,
  ): Promise<AgentChatKnowledgeBaseEntry | void> {
    if (!file) return undefined;
    const result = this.source?.upload?.(entryId, file);
    if (!result) {
      await Promise.resolve();
      return undefined;
    }
    return isObservable(result) ? firstValueFrom(result) : result;
  }

  private entryFromUpload(
    upload: AgentChatKnowledgeUpload,
  ): AgentChatKnowledgeBaseEntry {
    const existing = upload.entryId
      ? this.items().find((entry) => entry.id === upload.entryId)
      : undefined;
    if (existing) {
      return {
        ...existing,
        fileName: upload.name,
        size: upload.size,
        status: "ready",
        updatedAt: new Date().toISOString(),
      };
    }
    return {
      id: upload.entryId || `kb-${Date.now()}-${upload.id}`,
      label: upload.name,
      fileName: upload.name,
      size: upload.size,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
  }

  private updateUpload(
    uploadId: string,
    patch: Partial<AgentChatKnowledgeUpload>,
  ): void {
    let updated: AgentChatKnowledgeUpload | undefined;
    this.uploads.update((uploads) =>
      uploads.map((row) => {
        if (row.id !== uploadId) return row;
        updated = { ...row, ...patch };
        return updated;
      }),
    );
    if (updated) this.upload.emit(updated);
  }
}

function toEntry(source: AgentChatKnowledgeSource): AgentChatKnowledgeBaseEntry {
  return { id: source.id, label: source.label, status: "ready" };
}

function upsertEntry(
  entries: AgentChatKnowledgeBaseEntry[],
  entry: AgentChatKnowledgeBaseEntry,
): AgentChatKnowledgeBaseEntry[] {
  const index = entries.findIndex((candidate) => candidate.id === entry.id);
  if (index < 0) return [...entries, entry];
  return entries.map((candidate) =>
    candidate.id === entry.id ? entry : candidate,
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
