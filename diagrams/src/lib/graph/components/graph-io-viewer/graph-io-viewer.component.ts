/**
 * @module for-angular/graph/components/graph-io-viewer
 * @summary Reusable JSON / table / raw viewer for node I/O inspection.
 * @description Renders an arbitrary value with three toggleable representations
 * (JSON tree, key/value table, raw text). Used for both inputs (right pane)
 * and outputs/error (left pane) of the node inspection split view.
 *
 * SAA-722: the rendered payload is capped at a configurable byte/line limit
 * (default 256 KB / 2000 lines, {@link GRAPH_IO_PANEL_LIMIT}) so a large run
 * payload can never overflow the browser, and a download action fetches the entire
 * untruncated payload from the server run detail endpoint.
 */
import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GRAPH_IO_PANEL_LIMIT,
  GRAPH_IO_PANEL_LIMIT_DEFAULT,
  type GraphIoPanelLimit,
} from '../../tokens/graph-configuration.tokens';
import { GraphRunClient } from '../../runs/GraphRunClient';

/**
 * View representation selected in the I/O viewer, rendered as toggle buttons
 * in the panel header. `json` (default) and `raw` are both pretty-printed text
 * (identical output for the current implementation); `table` renders a
 * key/value row grid for records and arrays.
 */
export type GraphIoViewMode = 'json' | 'table' | 'raw';

/** Node run payload field the viewer renders and downloads. */
export type GraphIoViewerField = 'inputs' | 'outputs';

/** Result of applying the byte/line cap to a rendered payload string. */
export interface GraphIoCapResult {
  /** The capped text safe to render. */
  text: string;
  /** Whether any content was dropped by the cap. */
  truncated: boolean;
}

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
 * Caps a rendered payload string to the configured byte and line limits
 * (SAA-722). The byte cap is applied first (so a single huge line cannot
 * overflow the DOM), then the line cap on the byte-capped text. Never mutates the
 * source; the full payload stays available for download.
 *
 * @param text - The full printable payload.
 * @param limit - The configured byte/line cap.
 * @return {GraphIoCapResult} The capped text plus whether anything was dropped.
 */
export function graphIoCapText(
  text: string,
  limit: GraphIoPanelLimit,
): GraphIoCapResult {
  let capped = text;
  let truncated = false;
  if (typeof TextEncoder !== 'undefined' && limit.bytes > 0) {
    const encoded = new TextEncoder().encode(capped);
    if (encoded.length > limit.bytes) {
      capped = new TextDecoder().decode(encoded.slice(0, limit.bytes));
      truncated = true;
    }
  }
  if (limit.lines > 0) {
    const lines = capped.split('\n');
    if (lines.length > limit.lines) {
      capped = lines.slice(0, limit.lines).join('\n');
      truncated = true;
    }
  }
  return { text: capped, truncated };
}
/**
 * Key stamped on payload objects whose content was capped for display, so
 * consumers can tell truncated views apart from full payloads.
 * @category Graph
 */
export const GRAPH_IO_TRUNCATED_MARKER = '_truncated';
/**
 * Classifies an error as transport/backend-unavailability (name- or errno-based)
 * rather than a data problem, so the viewer can offer retry instead of surfacing
 * a hard failure.
 *
 * @param error - The thrown value to classify.
 * @returns `true` when the error looks like a network/backend availability problem.
 * @category Graph
 */
export function isNetworkClassError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    error.name === 'GraphBackendUnavailableError' ||
    error.name === 'TypeError' ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError'
  ) {
    return true;
  }
  const code = (error as { code?: unknown }).code;
  return (
    typeof code === 'string' &&
    /^(ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ENETUNREACH|ERR_NETWORK)/.test(code)
  );
}
/**
 * Stamps a payload with {@link GRAPH_IO_TRUNCATED_MARKER} so downstream
 * consumers know the rendered value was capped and the full content must be
 * downloaded instead.
 *
 * @param payload - The truncated payload (any shape).
 * @returns A shallow copy carrying the truncation marker.
 * @category Graph
 */
export function markDownloadFallback(payload: unknown): unknown {
  if (isRecord(payload)) {
    return { ...payload, [GRAPH_IO_TRUNCATED_MARKER]: true };
  }
  return { [GRAPH_IO_TRUNCATED_MARKER]: true, value: payload };
}
/**
 * Sanitizes a string for safe use as a download filename segment.
 *
 * @param segment - Raw filename fragment (e.g. a node id).
 * @returns A filesystem-safe fragment, never empty.
 * @category Graph
 */
export function sanitizeFilenameSegment(segment: string): string {
  const sanitized = segment.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '_');
  return sanitized || '_';
}

/**
 * Reusable read-only viewer for the node I/O inspection split view (DECAF-48
 * §4.6 / Req-9). Renders one arbitrary value with JSON (default), table or raw
 * representations, or the node error when the run failed. Both inspection
 * panes (right = inputs, left = outputs or error) share this component.
 *
 * SAA-722: rendering is capped ({@link GRAPH_IO_PANEL_LIMIT}) and a download
 * action fetches the entire untruncated payload from the server run detail
 * endpoint (`GET /graph/runs/:runId`).
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
  /** Run id the value belongs to (enables the full-payload download). */
  readonly runId = input<string>('');
  /** Node id the value belongs to (enables the full-payload download). */
  readonly nodeId = input<string>('');
  /** Node payload field this pane renders (`inputs` / `outputs`). */
  readonly field = input<GraphIoViewerField>('inputs');
  /** Currently selected representation (`json` by default). */
  readonly mode = signal<GraphIoViewMode>('json');
  readonly downloadFallback = signal(false);
  readonly downloadError = signal<string | null>(null);

  private readonly limit = inject(GRAPH_IO_PANEL_LIMIT, { optional: true }) ?? GRAPH_IO_PANEL_LIMIT_DEFAULT;
  private readonly runClient = inject(GraphRunClient, { optional: true });

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
      return value.map((entry, index) => this.toTableRow(`[${index}]`, entry));
    }
    if (isRecord(value)) {
      return Object.entries(value).map(([key, entry]) => this.toTableRow(key, entry));
    }
    return [this.toTableRow(this.title(), value)];
  });

  private toTableRow(
    key: string,
    value: unknown,
  ): { key: string; value: unknown; text: string; truncated: boolean } {
    const capped = this.capCell(value);
    return { key, value, text: capped.text, truncated: capped.truncated };
  }

  /** Table rows capped to the configured line limit (SAA-722). */
  readonly visibleTableRows = computed(() =>
    this.tableRows().slice(0, this.limit.lines),
  );

  /** Whether table mode dropped rows because of the cap (SAA-722). */
  readonly tableTruncated = computed(
    () => this.tableRows().length > this.visibleTableRows().length,
  );

  readonly tableCellTruncated = computed(() =>
    this.visibleTableRows().some((row) => row.truncated),
  );

  /** Full printable form of the value (never truncated). */
  readonly fullText = computed(() => printable(this.value()));

  /** Byte/line-capped text safe to render (SAA-722). */
  readonly cappedText = computed(() =>
    graphIoCapText(this.fullText(), this.limit),
  );

  /** Whether the rendered payload was truncated by the cap (SAA-722). */
  readonly isTruncated = computed(
    () =>
      this.cappedText().truncated ||
      this.tableTruncated() ||
      this.tableCellTruncated(),
  );

  /** Human-readable cap description for the truncation notice. */
  readonly limitLabel = computed(
    () => `${Math.round(this.limit.bytes / 1024)} KB / ${this.limit.lines} lines`,
  );

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

  /** Whether the full-payload download action is available (SAA-722). */
  readonly canDownload = computed(
    () => !!this.runId() && !!this.nodeId(),
  );

  /**
   * Selects a representation for this pane.
   * @param mode One of `json` / `table` / `raw`.
   */
  setMode(mode: GraphIoViewMode): void {
    this.mode.set(mode);
  }

  /** Byte/line-capped string form of the current value (json/raw modes). */
  rawText(): string {
    return this.cappedText().text;
  }

  /**
   * Downloads the entire untruncated payload (SAA-722): fetches the run detail
   * from the server (`GET /graph/runs/:runId`) and saves the node's field
   * payload, falling back to the rendered value when the fetch fails or the run
   * client is unavailable. Browser-only; a no-op in a non-DOM environment.
   */
  async download(): Promise<void> {
    const runId = this.runId();
    const nodeId = this.nodeId();
    if (!runId || !nodeId) return;
    this.downloadFallback.set(false);
    this.downloadError.set(null);

    let payload: unknown = this.value();
    let fellBack = !this.runClient;
    if (this.runClient) {
      try {
        const result = await this.runClient.getRunResult(runId);
        const serverPayload = result?.nodeResults?.[nodeId]?.[this.field()];
        if (serverPayload !== undefined) {
          payload = serverPayload;
        } else {
          fellBack = true;
        }
      } catch (err) {
        if (!isNetworkClassError(err)) {
          this.downloadError.set(
            err instanceof Error ? err.message : 'Could not fetch the full payload.',
          );
          return;
        }
        fellBack = true;
      }
    }

    if (fellBack) {
      this.downloadFallback.set(true);
      payload = markDownloadFallback(payload);
    }
    this.savePayload(payload);
  }

  /** Saves a payload as a JSON download (browser-only, SAA-722). */
  private savePayload(payload: unknown): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    const text = typeof payload === 'string' ? payload : printable(payload);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${sanitizeFilenameSegment(this.field())}-${sanitizeFilenameSegment(this.nodeId())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Whether a table cell counts as empty (`—` placeholder in the template). */
  isEmptyValue(entry: { value: unknown }): boolean {
    const value = entry.value;
    return value === undefined || value === null || value === '';
  }

  private capCell(value: unknown): GraphIoCapResult {
    return graphIoCapText(printable(value), this.limit);
  }

  /** Display string for a single value (used for table cells). */
  cellText(value: unknown): string {
    return this.capCell(value).text;
  }
}
