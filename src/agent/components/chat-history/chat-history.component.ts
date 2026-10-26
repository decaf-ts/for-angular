import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import type { Observable, Subscription } from "rxjs";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import { AGENT_CHAT_HISTORY_SOURCE } from "../../tokens/agent-chat.tokens";
import type {
  AgentChatHistoryEntry,
  AgentChatHistorySource,
} from "../../types";
import { ChatHistoryItemComponent } from "../chat-history-item/chat-history-item.component";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Conversation history sidebar/drawer. Accepts entries directly, an observable stream, or falls back to the injected `AGENT_CHAT_HISTORY_SOURCE`, with paging, loading, and empty states. */
@Component({
  selector: "ngx-decaf-chat-history",
  templateUrl: "./chat-history.component.html",
  styleUrls: ["./chat-history.component.scss"],
  imports: [
    ChatHistoryItemComponent,
    ChatIconComponent,
    AgentTranslateFallbackPipe,
  ],
  standalone: true,
})
export class ChatHistoryComponent implements OnInit {
  /** Directly supplied entries; `null` delegates to a stream or the injected source. */
  readonly entries = input<AgentChatHistoryEntry[] | null>(null);
  /** Observable stream of entries; takes precedence over `routes$`. */
  readonly entries$ = input<Observable<AgentChatHistoryEntry[]> | null>(null);
  /** Alternative observable stream of entries. */
  readonly routes$ = input<Observable<AgentChatHistoryEntry[]> | null>(null);
  /** Id of the active conversation. */
  readonly activeId = input<string | null>(null);
  /** External loading flag merged with internal loading. */
  readonly loading = input<boolean>(false);
  /** Layout variant: inline panel or overlay drawer. */
  readonly variant = input<"panel" | "drawer">("panel");
  /** Whether the drawer is open. */
  readonly open = input<boolean>(true);
  /** Number of entries revealed per page. */
  readonly pageSize = input<number>(6);
  /** Number of skeleton rows rendered while loading. */
  readonly skeletonRows = input<number>(4);
  /** Optional heading override. */
  readonly title = input<string | null>(null);

  /** Emits the conversation selected by the user. */
  readonly selectChat = output<AgentChatHistoryEntry>();
  /** Emits the conversation deleted by the user. */
  readonly delete = output<AgentChatHistoryEntry>();
  /** Emits when a new conversation is requested. */
  readonly newChat = output<void>();
  /** Emits when the user requests more entries. */
  readonly loadMore = output<void>();
  /** Emits drawer open/close transitions. */
  readonly openChange = output<boolean>();

  /** Entries currently held by the component. */
  readonly stored = linkedSignal<AgentChatHistoryEntry[]>(
    () => this.entries() ?? [],
  );
  /** Current visible page index. */
  readonly page = signal(1);
  /** Whether an append-page request is in flight. */
  readonly loadingMore = signal(false);
  /** Whether the component is loading a page itself. */
  readonly internalLoading = signal(false);
  /** Whether the backing source reported more entries. */
  readonly sourceHasMore = signal(false);
  /** Zero-based rows used to render the loading skeleton. */
  readonly skeletonRowList = computed(() =>
    Array.from({ length: Math.max(0, this.skeletonRows()) }),
  );

  /** Whether any loading source is active. */
  readonly isLoading = computed(() => this.loading() || this.internalLoading());
  /** Whether the list is loaded and empty. */
  readonly isEmpty = computed(
    () => !this.isLoading() && this.stored().length === 0,
  );
  /** Whether the local entry list has another page. */
  readonly hasMore = computed(
    () => this.stored().length > this.page() * this.pageSize(),
  );
  /** Whether more entries are available locally or from the source. */
  readonly canLoadMore = computed(
    () => this.hasMore() || this.sourceHasMore(),
  );
  /** Entries revealed up to the current page. */
  readonly visibleEntries = computed(() =>
    this.stored().slice(0, this.page() * this.pageSize()),
  );
  /** Whether the drawer layout is active. */
  readonly isDrawer = computed(() => this.variant() === "drawer");
  /** Resolved observable stream, if any. */
  readonly historyStream = computed(() => this.entries$() ?? this.routes$());
  /** Whether the component falls back to the injected history source. */
  readonly usesSource = computed(
    () => this.entries() === null && this.historyStream() === null,
  );

  private readonly source = inject<AgentChatHistorySource | null>(
    AGENT_CHAT_HISTORY_SOURCE,
    { optional: true },
  );
  private readonly destroyRef = inject(DestroyRef);
  private streamSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      const stream = this.historyStream();
      this.streamSubscription?.unsubscribe();
      this.streamSubscription = null;
      if (!stream) return;
      this.internalLoading.set(true);
      this.streamSubscription = stream
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (entries) => {
            this.stored.set(entries ?? []);
            this.page.set(1);
            this.sourceHasMore.set(false);
            this.internalLoading.set(false);
          },
          error: () => this.internalLoading.set(false),
        });
    });
  }

  /** Seeds entries from inputs or loads the first source page. */
  ngOnInit(): void {
    if (this.historyStream() !== null) return;
    if (this.entries() !== null) {
      this.stored.set(this.entries() ?? []);
      return;
    }
    this.loadSourcePage(1, false);
  }

  /** Selects a conversation and closes the drawer variant. */
  onOpen(entry: AgentChatHistoryEntry): void {
    this.selectChat.emit(entry);
    if (this.isDrawer()) this.requestClose();
  }

  /** Removes an entry locally and delegates deletion to the source. */
  onDelete(entry: AgentChatHistoryEntry): void {
    this.stored.update((entries) =>
      entries.filter((candidate) => candidate.id !== entry.id),
    );
    this.delete.emit(entry);
    if (this.usesSource() && this.source?.delete) {
      const result = this.source.delete(entry.id);
      if (result instanceof Promise) {
        void result.catch(() => undefined);
      } else {
        result.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          error: () => undefined,
        });
      }
    }
  }

  /** Requests a new conversation and closes the drawer variant. */
  onNewChat(): void {
    this.newChat.emit();
    if (this.isDrawer()) this.requestClose();
  }

  /** Advances paging locally or loads the next source page. */
  requestMore(): void {
    this.loadMore.emit();
    if (this.hasMore()) {
      this.page.update((page) => page + 1);
      return;
    }
    if (!this.usesSource() || !this.source) return;
    this.loadSourcePage(this.page() + 1, true);
  }

  /** Requests the drawer to close. */
  requestClose(): void {
    if (!this.open()) return;
    this.openChange.emit(false);
  }

  private loadSourcePage(page: number, append: boolean): void {
    if (!this.source) return;
    this.internalLoading.set(!append);
    this.loadingMore.set(append);
    this.source
      .list({ page, pageSize: this.pageSize() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          const list = entries ?? [];
          this.stored.update((current) =>
            append ? [...current, ...list] : list,
          );
          if (list.length > 0) this.page.set(page);
          this.sourceHasMore.set(list.length >= this.pageSize());
          this.internalLoading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.internalLoading.set(false);
          this.loadingMore.set(false);
        },
      });
  }
}
