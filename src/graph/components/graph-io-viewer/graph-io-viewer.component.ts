/**
 * @module for-angular/graph/components/graph-io-viewer
 * @summary Reusable JSON / table / raw viewer for node I/O inspection.
 * @description Renders an arbitrary value with three toggleable representations
 * (JSON tree, key/value table, raw text). Used for both inputs (right pane)
 * and outputs/error (left pane) of the node inspection split view.
 */
import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * View representation selected in the I/O viewer, rendered as toggle buttons
 * in the panel header. `json` (default) and `raw` are both pretty-printed text
 * (identical output for the current implementation); `table` renders a
 * key/value row grid for records and arrays.
 */
export type GraphIoViewMode = 'json' | 'table' | 'raw';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function printable(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Reusable read-only viewer for the node I/O inspection split view (DECAF-48
 * §4.6 / Req-9). Renders one arbitrary value with JSON (default), table or raw
 * representations, or the node error when the run failed. Both inspection
 * panes (right = inputs, left = outputs or error) share this component.
 */
@Component({
  selector: 'app-graph-io-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-io-viewer.component.html',
  styleUrl: './graph-io-viewer.component.scss',
})
export class GraphIoViewerComponent {
  /** Pane label, e.g. "Inputs" or "Outputs". */
  readonly title = input<string>('');
  /** Value to render in the selected mode. */
  readonly value = input<unknown>(undefined);
  /** Optional error payload; when present it replaces the value rendering. */
  readonly error = input<{ name?: string; message?: string; stack?: string } | null | undefined>(null);
  /** Currently selected representation (`json` by default). */
  readonly mode = signal<GraphIoViewMode>('json');

  /** Whether an error payload is present (renders the error UI instead). */
  readonly hasError = computed(() => !!this.error());
  /** Single-line error description (message, falling back to name / object). */
  readonly errorMessage = computed(() => {
    const err = this.error();
    if (!err) return '';
    return err.message || err.name || String(err);
  });

  /** Number of rows the table mode would render for the current value. */
  readonly entryCount = computed(() => {
    const value = this.value();
    if (Array.isArray(value)) return value.length;
    if (isRecord(value)) return Object.keys(value).length;
    return 1;
  });

  /** Key/value rows for table mode (array entries keyed `[index]`). */
  readonly tableRows = computed(() => {
    const value = this.value();
    if (Array.isArray(value)) {
      return value.map((entry, index) => ({ key: `[${index}]`, value: entry }));
    }
    if (isRecord(value)) {
      return Object.entries(value).map(([key, entry]) => ({ key, value: entry }));
    }
    return [{ key: this.title(), value }];
  });

  /**
   * Whether the value renders any content at all (empty objects/`null`/
   * `undefined` render the "No data." placeholder).
   */
  readonly hasContents = computed(() => {
    const value = this.value();
    if (value === undefined || value === null) return false;
    if (typeof value === 'object' && Object.keys(value as object).length === 0) return false;
    return true;
  });

  /**
   * Selects a representation for this pane.
   * @param mode One of `json` / `table` / `raw`.
   */
  setMode(mode: GraphIoViewMode): void {
    this.mode.set(mode);
  }

  /** Pretty-printed string form of the current value (json/raw modes). */
  rawText(): string {
    return printable(this.value());
  }

  /** Whether a table cell counts as empty (`—` placeholder in the template). */
  isEmptyValue(entry: { value: unknown }): boolean {
    const value = entry.value;
    return value === undefined || value === null || value === '';
  }

  /** Display string for a single value (used for table cells). */
  cellText(value: unknown): string {
    return printable(value);
  }
}
