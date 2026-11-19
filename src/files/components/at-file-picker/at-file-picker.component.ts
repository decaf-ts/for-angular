import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from "@angular/core";
import { AgentTranslateFallbackPipe } from "@decaf-ts/for-angular/agent";
import type { AtFileCandidate, AtFileEntry } from "../../types.js";
import {
  MAX_CANDIDATES,
  candidateRows,
  rankEntries,
} from "../../utils.js";

let pickerSequence = 0;

/**
 * @description Workspace path picker for the `@path` composer
 * @summary Standalone picker that ranks the supplied entries against the
 * current query, renders at most {@link MAX_CANDIDATES} rows, and tracks an
 * active row for keyboard navigation. It is presentational: the host loads the
 * index, forwards navigation, and handles the emitted selection. `move` wraps
 * around both ends and resets the active row whenever the entries or query
 * change.
 * @class AtFilePickerComponent
 * @category Files UI
 * @example
 * ```html
 * <ngx-decaf-at-file-picker
 *   [files]="entries"
 *   [query]="query"
 *   [loading]="loading"
 *   [truncated]="truncated"
 *   (pick)="onPicked($event)">
 * </ngx-decaf-at-file-picker>
 * ```
 */
@Component({
  selector: "ngx-decaf-at-file-picker",
  templateUrl: "./at-file-picker.component.html",
  styleUrls: ["./at-file-picker.component.scss"],
  imports: [AgentTranslateFallbackPipe],
  standalone: true,
})
export class AtFilePickerComponent {
  /** Workspace entries to rank and display. */
  readonly files = input<AtFileEntry[]>([]);
  /** Current query typed after `@`; an empty query browses the tree. */
  readonly query = input<string>("");
  /** Whether the index is being loaded. */
  readonly loading = input<boolean>(false);
  /** Whether the index hit the server file cap. */
  readonly truncated = input<boolean>(false);
  /** Disables selection while still rendering the list. */
  readonly disabled = input<boolean>(false);

  /** Emits the entry the user selected. */
  readonly pick = output<AtFileEntry>();

  /** Stable id prefix used by the listbox and its options. */
  readonly listId = `at-file-picker-${++pickerSequence}`;
  /** Index of the keyboard-active candidate. */
  readonly activeIndex = signal(0);
  /** Ranked and display-ready candidates derived from `files` and `query`. */
  readonly candidates = computed<readonly AtFileCandidate[]>(() =>
    candidateRows(rankEntries(this.files(), this.query(), MAX_CANDIDATES))
  );

  constructor() {
    effect(() => {
      this.files();
      this.query();
      this.activeIndex.set(0);
    });
  }

  /**
   * @description Move the active candidate
   * @summary Wraps around both ends and does nothing when the list is empty.
   * @param {number} delta - `1` for the next row, `-1` for the previous row.
   * @returns {void}
   */
  move(delta: number): void {
    const length = this.candidates().length;
    if (length === 0) return;
    const next = (this.activeIndex() + delta + length) % length;
    this.activeIndex.set(next);
  }

  /**
   * @description Choose the active candidate
   * @summary Emits `pick` for the row at {@link activeIndex}; no-op when the
   * list is empty.
   * @returns {void}
   */
  pickActive(): void {
    const candidate = this.candidates()[this.activeIndex()];
    if (candidate) this.choose(candidate);
  }

  /**
   * @description Choose a candidate row
   * @summary Emits `pick` with the row entry unless the picker is disabled.
   * @param {AtFileCandidate} candidate - the row to select.
   * @returns {void}
   */
  choose(candidate: AtFileCandidate): void {
    if (this.disabled()) return;
    this.pick.emit(candidate.entry);
  }

  /**
   * @description Build the DOM id of a candidate row
   * @summary Combines {@link listId} with the relative path so the listbox can
   * reference the active option.
   * @param {AtFileCandidate} candidate - the row to identify.
   * @returns {string} the option id.
   */
  activeId(candidate: AtFileCandidate): string {
    return `${this.listId}-${candidate.entry.relative}`;
  }
}
