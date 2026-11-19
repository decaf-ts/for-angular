import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, of, tap } from "rxjs";
import type {
  AtFileSearchResult,
  AtFileSettings,
  AtFileSettingsUpdate,
} from "../types.js";
import { INDEX_TTL_MS } from "../utils.js";

interface CachedIndex {
  readonly at: number;
  readonly value: AtFileSearchResult;
}

/**
 * @description HTTP client for the files plugin
 * @summary Root-provided Angular service used by the picker, composer, and
 * settings panel. It reads and updates `/files/settings`, requests
 * `/files/search`, and caches each session index for {@link INDEX_TTL_MS} so
 * opening the `@` picker repeatedly does not re-walk the workspace. The server
 * always resolves the workspace root; the client only forwards an optional
 * session id.
 * @class AtFileService
 * @category Files UI
 * @example
 * ```typescript
 * import { Component, inject } from "@angular/core";
 * import { AtFileService } from "@decaf-ts/for-angular/files";
 *
 * @Component({ selector: "demo", standalone: true, template: "" })
 * export class DemoComponent {
 *   private readonly files = inject(AtFileService);
 *
 *   refresh(): void {
 *     this.files.search(undefined, true).subscribe((index) => {
 *       console.log(index.files.length, index.truncated);
 *     });
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: "root" })
export class AtFileService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CachedIndex>();

  /**
   * @description Read the resolved files settings
   * @summary Performs `GET /files/settings`.
   * @returns {Observable<AtFileSettings>} the resolved settings.
   */
  getSettings(): Observable<AtFileSettings> {
    return this.http.get<AtFileSettings>("/files/settings");
  }

  /**
   * @description Apply one settings mutation
   * @summary Performs `PUT /files/settings` with a single `{ field, value }`
   * pair and returns the settings after the update.
   * @param {AtFileSettingsUpdate} update - the field mutation to apply.
   * @returns {Observable<AtFileSettings>} the settings after the update.
   */
  updateSettings(update: AtFileSettingsUpdate): Observable<AtFileSettings> {
    return this.http.put<AtFileSettings>("/files/settings", update);
  }

  /**
   * @description Request the workspace index
   * @summary Returns the cached index for the session when it is younger than
   * {@link INDEX_TTL_MS} and `force` is `false`; otherwise performs
   * `GET /files/search`, forwarding `sessionId` when present, and caches the
   * result. A missing or empty `sessionId` uses the `global` cache entry and the
   * bare search URL.
   * @param {string} [sessionId] - optional durable session id.
   * @param {boolean} [force=false] - bypass the cache and fetch a fresh index.
   * @returns {Observable<AtFileSearchResult>} the path index and truncation flag.
   * @mermaid
   * %%{init: {'theme':'base','themeVariables':{'primaryColor':'#e3f2fd','primaryBorderColor':'#90caf9','primaryTextColor':'#1a237e','lineColor':'#78909c','secondaryColor':'#fce4ec','tertiaryColor':'#e8f5e9'}}}%%
   * sequenceDiagram
   *   autonumber
   *   participant C as AtFileComposerComponent
   *   participant S as AtFileService
   *   participant H as HttpClient
   *   participant API as /files/search
   *   C->>S: search(sessionId, force)
   *   activate S
   *   alt fresh cache and not forced
   *     S-->>C: of(cached index)
   *   else cache miss or forced
   *     S->>H: get(url)
   *     activate H
   *     H->>API: GET /files/search?sessionId
   *     activate API
   *     API-->>H: WorkspaceIndex
   *     deactivate API
   *     H-->>S: WorkspaceIndex
   *     deactivate H
   *     S->>S: cache.set(key, { at, value })
   *     S-->>C: WorkspaceIndex
   *   end
   *   deactivate S
   */
  search(
    sessionId?: string,
    force = false
  ): Observable<AtFileSearchResult> {
    const key = sessionId ?? "global";
    const cached = this.cache.get(key);
    if (!force && cached && Date.now() - cached.at < INDEX_TTL_MS) {
      return of(cached.value);
    }
    const url =
      sessionId === undefined || sessionId === ""
        ? "/files/search"
        : `/files/search?sessionId=${encodeURIComponent(sessionId)}`;
    return this.http
      .get<AtFileSearchResult>(url)
      .pipe(tap((value) => this.cache.set(key, { at: Date.now(), value })));
  }

  /**
   * @description Drop every cached workspace index
   * @summary Call it after a settings change or workspace switch so the next
   * search fetches fresh metadata.
   * @returns {void}
   */
  invalidate(): void {
    this.cache.clear();
  }
}
