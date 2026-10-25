import { Observable, of } from "rxjs";
import type {
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeBaseSource,
} from "../types";

/**
 * In-memory {@link AgentChatKnowledgeBaseSource} backing the knowledge-base
 * selector when no persistent backend is configured. Uploads immediately
 * resolve the entry as `ready`; entries are copied on write.
 *
 * @param entries - Initial knowledge-base entries; defaults to an empty list.
 */
export class InMemoryAgentKnowledgeBaseSource
  implements AgentChatKnowledgeBaseSource
{
  private entries: AgentChatKnowledgeBaseEntry[] = [];

  constructor(entries: AgentChatKnowledgeBaseEntry[] = []) {
    this.entries = [...entries];
  }

  /** Replaces the stored entries with a copy of `entries`. */
  seed(entries: AgentChatKnowledgeBaseEntry[]): void {
    this.entries = [...entries];
  }

  /** Alias of {@link seed} for source-compatible callers. */
  setEntries(entries: AgentChatKnowledgeBaseEntry[]): void {
    this.seed(entries);
  }

  /** Returns a copy of every stored entry. */
  all(): AgentChatKnowledgeBaseEntry[] {
    return [...this.entries];
  }

  /** Returns every stored entry as an observable. */
  list(): Observable<AgentChatKnowledgeBaseEntry[]> {
    return of(this.all());
  }

  /**
   * Creates or updates an entry from an uploaded file.
   *
   * @param entryId - Existing entry id to update, or `undefined` to create one.
   * @param file - Uploaded file providing the name, MIME type, and size.
   * @returns An observable emitting the created or updated entry.
   */
  upload(
    entryId: string | undefined,
    file: File,
  ): Observable<AgentChatKnowledgeBaseEntry | void> {
    const updatedAt = new Date().toISOString();
    const existing = entryId
      ? this.entries.find((entry) => entry.id === entryId)
      : undefined;
    const updated: AgentChatKnowledgeBaseEntry = existing
      ? {
          ...existing,
          fileName: file.name,
          mime: file.type || existing.mime,
          size: file.size,
          status: "ready",
          updatedAt,
        }
      : {
          id: entryId || `kb-${Date.now()}-${this.entries.length + 1}`,
          label: file.name,
          fileName: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          status: "ready",
          updatedAt,
        };
    this.entries = existing
      ? this.entries.map((entry) => (entry.id === existing.id ? updated : entry))
      : [...this.entries, updated];
    return of(updated);
  }

  /**
   * Removes an entry by id.
   *
   * @param entryId - Id of the entry to remove.
   * @returns An observable that completes after the entry is removed.
   */
  remove(entryId: string): Observable<void> {
    this.entries = this.entries.filter((entry) => entry.id !== entryId);
    return of(undefined);
  }
}
