import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { AgentTranslateFallbackPipe, ChatComposerComponent } from "@decaf-ts/for-angular/agent";
import { AtFileDockComponent } from "../at-file-dock/at-file-dock.component.js";
import { AtFilePickerComponent } from "../at-file-picker/at-file-picker.component.js";
import { AtFileService } from "../../services/AtFileService.js";
import type {
  AtFileEntry,
  AtFileSettings,
} from "../../types.js";
import { protectPastedMentions } from "../../utils.js";

/**
 * @description Composer with Codex-style `@path` references
 * @summary Standalone composer that wraps `ngx-decaf-chat-composer` with the
 * files plugin: it loads the settings and workspace index on init, opens the
 * path picker for the active `@` query, inserts the chosen reference into the
 * draft, lists referenced paths in a dock, and protects `@` tokens in pasted
 * text. The picker is presentational and this component forwards keyboard
 * navigation and selection into the underlying chat composer. It re-emits the
 * base composer's value, send, and stop events, and exposes `openPath` for the
 * host to react to a docked reference.
 * @class AtFileComposerComponent
 * @category Files UI
 * @example
 * ```html
 * <ngx-decaf-at-file-composer
 *   [value]="draft"
 *   [sessionId]="sessionId"
 *   [running]="running"
 *   [placeholder]="'Ask about this workspace'"
 *   (valueChange)="draft = $event"
 *   (send)="send($event)"
 *   (stop)="stop()"
 *   (openPath)="open($event)">
 * </ngx-decaf-at-file-composer>
 * ```
 */
@Component({
  selector: "ngx-decaf-at-file-composer",
  templateUrl: "./at-file-composer.component.html",
  styleUrls: ["./at-file-composer.component.scss"],
  imports: [
    AgentTranslateFallbackPipe,
    ChatComposerComponent,
    AtFilePickerComponent,
    AtFileDockComponent,
  ],
  standalone: true,
})
export class AtFileComposerComponent implements OnInit {
  /** Controlled draft value; local edits emit `valueChange`. */
  readonly value = input<string>("");
  /** Session whose index is requested; `null` uses the global index. */
  readonly sessionId = input<string | null>(null);
  /** Fully disables the composer and the `@` helpers. */
  readonly disabled = input<boolean>(false);
  /** Whether an agent roundtrip is in flight. */
  readonly running = input<boolean>(false);
  /** Placeholder override forwarded to the base composer. */
  readonly placeholder = input<string | null>(null);

  /** Emits every draft change. */
  readonly valueChange = output<string>();
  /** Emits the trimmed prompt when the user sends. */
  readonly send = output<string>();
  /** Emits when the user stops the running response. */
  readonly stop = output<void>();
  /** Emits the relative path of a reference the user activated in the dock. */
  readonly openPath = output<string>();

  private readonly service = inject(AtFileService);
  /** The wrapped chat composer that owns the textarea. */
  readonly composer = viewChild(ChatComposerComponent);
  /** The path picker shown for an active `@` query. */
  readonly picker = viewChild(AtFilePickerComponent);

  /** Local draft; re-syncs when the controlled `value` changes. */
  readonly draft = linkedSignal(() => this.value());
  /** Resolved files settings, or `null` before the first load. */
  readonly settings = signal<AtFileSettings | null>(null);
  /** Indexed workspace entries. */
  readonly entries = signal<AtFileEntry[]>([]);
  /** Whether the server index hit its file cap. */
  readonly truncated = signal(false);
  /** Whether an index request is in flight. */
  readonly loading = signal(false);
  /** Last load error message, if any. */
  readonly error = signal<string | null>(null);
  /** Active `@` query text, or `null` when the picker is closed. */
  readonly atQuery = signal<string | null>(null);

  /** Whether `@path` mentions are enabled by the resolved settings. */
  readonly enabled = computed(() => this.settings()?.enabled !== false);
  /** Relative paths of the loaded entries, used by the dock. */
  readonly indexed = computed(() =>
    this.entries().map((entry) => entry.relative)
  );
  /** Whether the picker is open for an active `@` query. */
  readonly pickerOpen = computed(
    () => this.enabled() && this.atQuery() !== null
  );

  /**
   * @description Load settings and, when enabled, the workspace index
   * @returns {void}
   */
  ngOnInit(): void {
    this.service.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        if (settings.enabled) this.loadIndex();
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  /**
   * @description Request the workspace index
   * @summary Sets the loading flag and error state, then stores the entries and
   * truncation flag. Delegates caching to {@link AtFileService.search}.
   * @param {boolean} [force=false] - bypass the client index cache.
   * @returns {void}
   * @mermaid
   * %%{init: {'theme':'base','themeVariables':{'primaryColor':'#e3f2fd','primaryBorderColor':'#90caf9','primaryTextColor':'#1a237e','lineColor':'#78909c','secondaryColor':'#fce4ec','tertiaryColor':'#e8f5e9'}}}%%
   * sequenceDiagram
   *   autonumber
   *   participant U as User
   *   participant C as AtFileComposerComponent
   *   participant S as AtFileService
   *   participant P as AtFilePickerComponent
   *   U->>C: types "@"
   *   activate C
   *   C->>C: onAtQuery(query)
   *   C->>S: search(sessionId, force)
   *   activate S
   *   S-->>C: AtFileSearchResult
   *   deactivate S
   *   C->>P: files + query inputs
   *   activate P
   *   P-->>C: pick(entry)
   *   deactivate P
   *   C->>C: onPicked(entry)
   *   C-->>U: draft contains @relative
   *   deactivate C
   */
  loadIndex(force = false): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.search(this.sessionId() ?? undefined, force).subscribe({
      next: (result) => {
        this.entries.set([...result.files]);
        this.truncated.set(result.truncated);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.fail(error);
      },
    });
  }

  /**
   * @description Handle a draft change from the base composer
   * @param {string} text - the new draft text.
   * @returns {void}
   */
  onValueChange(text: string): void {
    this.draft.set(text);
    this.valueChange.emit(text);
  }

  /**
   * @description Handle the active `@` query from the base composer
   * @summary Stores the query and lazily loads the index the first time a query
   * appears with no entries.
   * @param {string | null} query - the query text, or `null` when it clears.
   * @returns {void}
   */
  onAtQuery(query: string | null): void {
    this.atQuery.set(query);
    if (query !== null && this.entries().length === 0 && !this.loading()) {
      this.loadIndex();
    }
  }

  /**
   * @description Move the picker selection
   * @param {number} delta - `1` for next, `-1` for previous.
   * @returns {void}
   */
  onNavigate(delta: number): void {
    this.picker()?.move(delta);
  }

  /**
   * @description Accept the active picker candidate
   * @returns {void}
   */
  onPick(): void {
    this.picker()?.pickActive();
  }

  /**
   * @description Close the picker without accepting a candidate
   * @returns {void}
   */
  onDismiss(): void {
    this.atQuery.set(null);
  }

  /**
   * @description Insert an accepted reference into the draft
   * @summary Forwards the relative path and kind to the base composer, which
   * replaces the active token, then closes the picker.
   * @param {AtFileEntry} entry - the accepted workspace entry.
   * @returns {void}
   */
  onPicked(entry: AtFileEntry): void {
    this.composer()?.acceptAtFileReference(entry.relative, entry.kind);
    this.atQuery.set(null);
  }

  /**
   * @description Remove a reference from the draft
   * @param {{ start: number, end: number }} range - the token span to remove.
   * @returns {void}
   */
  onRemove(range: { start: number; end: number }): void {
    this.composer()?.removeAtFileToken(range.start, range.end);
  }

  /**
   * @description Protect `@` tokens in pasted text
   * @summary When pasted mentions are ignored, replaces default paste handling
   * and inserts the text with pasted-mention markers so the tokens stay plain
   * text. Pastes without `@` keep the native behaviour.
   * @param {ClipboardEvent} event - the paste event.
   * @returns {void}
   */
  onPaste(event: ClipboardEvent): void {
    if (this.settings()?.ignorePastedMentions === false) return;
    const text = event.clipboardData?.getData("text") ?? "";
    if (!text.includes("@")) return;
    event.preventDefault();
    this.composer()?.insertAtCursor(protectPastedMentions(text));
  }

  private fail(error: unknown): void {
    this.error.set(
      error instanceof Error ? error.message : String(error)
    );
  }
}
