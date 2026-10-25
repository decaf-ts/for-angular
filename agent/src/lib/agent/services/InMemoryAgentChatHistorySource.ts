import { Observable, of } from "rxjs";
import type {
  AgentChatHistoryEntry,
  AgentChatHistoryPageQuery,
  AgentChatHistorySource,
} from "../types";

/**
 * In-memory {@link AgentChatHistorySource} backing the chat history sidebar when
 * no persistent backend is configured. Entries are copied on write; reads
 * return copies so consumers cannot mutate internal state.
 *
 * @param entries - Initial conversation entries; defaults to an empty list.
 */
export class InMemoryAgentChatHistorySource implements AgentChatHistorySource {
  private entries: AgentChatHistoryEntry[] = [];

  constructor(entries: AgentChatHistoryEntry[] = []) {
    this.entries = [...entries];
  }

  /** Replaces the stored entries with a copy of `entries`. */
  seed(entries: AgentChatHistoryEntry[]): void {
    this.entries = [...entries];
  }

  /** Alias of {@link seed} for source-compatible callers. */
  setEntries(entries: AgentChatHistoryEntry[]): void {
    this.seed(entries);
  }

  /** Returns a copy of every stored entry. */
  all(): AgentChatHistoryEntry[] {
    return [...this.entries];
  }

  /**
   * Lists a page of entries.
   *
   * @param query - Optional one-based page request; omitted returns every entry.
   * @returns An observable emitting the requested page.
   */
  list(query?: AgentChatHistoryPageQuery): Observable<AgentChatHistoryEntry[]> {
    if (!query) return of(this.all());
    const start = Math.max(0, (query.page - 1) * query.pageSize);
    return of(this.entries.slice(start, start + query.pageSize));
  }

  /**
   * Deletes an entry by id.
   *
   * @param id - Id of the entry to remove.
   * @returns An observable that completes after the entry is removed.
   */
  delete(id: string): Observable<void> {
    this.entries = this.entries.filter((entry) => entry.id !== id);
    return of(undefined);
  }
}
