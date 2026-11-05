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
  /** UTF-8 byte length of the capped text (aggregate table budget accounting). */
  bytes: number;
}

/**
 * Narrowing guard for plain object payloads (excludes `null` and arrays).
 *
 * @param value - The value to test.
 * @returns `true` when the value is a non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Renders an arbitrary payload value as display text: primitives keep their
 * string form, objects/arrays are pretty-printed JSON, and circular or otherwise
 * unserializable values degrade to {@link String} instead of throwing.
 *
 * @param value - The value to render.
 * @returns The printable text form of the value.
 */
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
 * SAA-1432: the result also reports the capped text's UTF-8 byte length so table
 * mode can enforce one aggregate byte budget across all visible rows without
 * re-encoding each cell.
 *
 * @param text - The full printable payload.
 * @param limit - The configured byte/line cap.
 * @returns {GraphIoCapResult} The capped text, whether anything was dropped, and its byte length.
 */
export function graphIoCapText(
  text: string,
  limit: GraphIoPanelLimit,
): GraphIoCapResult {
  let capped = text;
  let truncated = false;
  let bytes = text.length;
  if (typeof TextEncoder !== 'undefined' && limit.bytes > 0) {
    const encoded = new TextEncoder().encode(capped);
    if (encoded.length > limit.bytes) {
      capped = new TextDecoder().decode(encoded.slice(0, limit.bytes));
      truncated = true;
      bytes = new TextEncoder().encode(capped).length;
    } else {
      bytes = encoded.length;
    }
  }
  if (limit.lines > 0) {
    const lines = capped.split('\n');
    if (lines.length > limit.lines) {
      capped = lines.slice(0, limit.lines).join('\n');
      truncated = true;
      bytes =
        typeof TextEncoder !== 'undefined'
          ? new TextEncoder().encode(capped).length
          : capped.length;
    }
  }
  return { text: capped, truncated, bytes };
}
/**
 * Key stamped on payload objects whose content was capped for display, so
 * consumers can tell truncated views apart from full payloads.
 *
 * SAA-1432 R3: the marker is namespaced so it cannot collide with a real
 * payload key of the same name in a fallback export.
 * @category Graph
 */
export const GRAPH_IO_TRUNCATED_MARKER = '__graphIoTruncated';
/**
 * Substrings that identify a `TypeError` thrown by a failed fetch/transport
 * rather than by a client-side programming bug (SAA-1432 R4).
 */
const NETWORK_TYPE_ERROR_PATTERNS = [
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'network error',
  'network request failed',
  'load failed',
  'connection refused',
  'connection reset',
  'connection closed',
  'socket hang up',
  'net::err_',
  'econnrefused',
  'econnreset',
  'econnaborted',
  'enotfound',
  'eai_again',
  'etimedout',
  'enetunreach',
  'err_network',
];
/**
 * Whether a `TypeError` carries a fetch/transport message, so a client-side
 * programming bug that also happens to be a `TypeError` is not misclassified as
 * a network failure (SAA-1432 R4).
 *
 * @param error - The `TypeError` to inspect.
 * @returns `true` when the message matches a known transport failure shape.
 */
function isNetworkTypeError(error: Error): boolean {
  if (error.name !== 'TypeError') return false;
  const message = (error.message ?? '').toLowerCase();
  return NETWORK_TYPE_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}
/**
 * Classifies an error as transport/backend-unavailability (name-, message-, or
 * errno-based) rather than a data problem, so the viewer treats it as a
 * recoverable fallback instead of surfacing a hard failure. `TypeError`s are
 * narrowed to fetch/transport messages (SAA-1432 R4) so a client bug falls
 * through to the announced `downloadError` path instead.
 *
 * @param error - The thrown value to classify.
 * @returns `true` when the error looks like a network/backend availability problem.
 * @category Graph
 */
export function isNetworkClassError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    error.name === 'GraphBackendUnavailableError' ||
    error.name === 'NetworkError' ||
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    isNetworkTypeError(error)
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
 * One fully capped key/value row rendered in table mode.
 *
 * SAA-1432: both the key and the cell text are capped, each row reports its
 * rendered UTF-8 byte size, and `id` provides a render identity that stays
 * unique even when capped keys collide.
 */
interface GraphIoTableRow {
  /** Stable render identity for the `@for` track expression. */
  id: number;
  /** Capped display key. */
  key: string;
  /** Raw cell value, kept for empty-value checks. */
  value: unknown;
  /** Capped display text of the cell. */
  text: string;
  /** Whether the key was capped. */
  keyTruncated: boolean;
  /** Whether the cell text was capped. */
  textTruncated: boolean;
  /** Whether the key or the cell text was capped. */
  truncated: boolean;
  /** UTF-8 byte size of the rendered key and cell text. */
  bytes: number;
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
  /** Namespaced marker key shown in the download-fallback notice (SAA-1432 R3). */
  readonly truncatedMarker = GRAPH_IO_TRUNCATED_MARKER;
  /**
   * Whether the last download had to fall back to the on-screen (capped) value
   * because the full payload could not be fetched; the saved payload then carries
   * {@link GRAPH_IO_TRUNCATED_MARKER}.
   */
  readonly downloadFallback = signal(false);
  /**
   * Message of a non-recoverable download failure (a data/API error rather than a
   * network-class one), surfaced in the panel; `null` when there is no failure.
   */
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
  readonly tableRows = computed<GraphIoTableRow[]>(() => {
    const value = this.value();
    if (Array.isArray(value)) {
      return value.map((entry, index) => this.toTableRow(index, `[${index}]`, entry));
    }
    if (isRecord(value)) {
      return Object.entries(value).map(([key, entry], index) =>
        this.toTableRow(index, key, entry),
      );
    }
    return [this.toTableRow(0, this.title(), value)];
  });

  /**
   * Builds a single table row, capping both the key (SAA-1432 R1) and the cell
   * text to the configured limit and recording their rendered byte size.
   *
   * @param id - Stable render identity for the `@for` track expression.
   * @param key - Row key (object key, `[index]`, or the pane title).
   * @param value - The raw cell value, kept for empty-value checks.
   * @returns The row identity, capped key/text, truncation flags, and byte size.
   */
  private toTableRow(id: number, key: string, value: unknown): GraphIoTableRow {
    const cappedKey = graphIoCapText(key, this.limit);
    const cappedValue = this.capCell(value);
    return {
      id,
      key: cappedKey.text,
      value,
      text: cappedValue.text,
      keyTruncated: cappedKey.truncated,
      textTruncated: cappedValue.truncated,
      truncated: cappedKey.truncated || cappedValue.truncated,
      bytes: cappedKey.bytes + cappedValue.bytes,
    };
  }

  /**
   * Table rows that fit the configured line limit and one shared aggregate byte
   * budget over their keys and cells (SAA-1432 R1/R2). The first row that would
   * overflow the budget is trimmed to the remaining budget rather than dropped,
   * so a single oversized key still renders its truncated content.
   */
  readonly visibleTableRows = computed(() =>
    this.selectVisibleTableRows(this.tableRows()),
  );

  /**
   * Walks the capped rows in order, keeping rows until the line limit or the
   * aggregate byte budget is exhausted.
   *
   * @param rows - The fully capped table rows.
   * @returns The rows safe to render within both caps.
   */
  private selectVisibleTableRows(rows: GraphIoTableRow[]): GraphIoTableRow[] {
    const maxRows = this.limit.lines > 0 ? this.limit.lines : rows.length;
    const budget = this.limit.bytes;
    const visible: GraphIoTableRow[] = [];
    let usedBytes = 0;
    for (const row of rows) {
      if (visible.length >= maxRows) break;
      if (budget > 0) {
        const remaining = budget - usedBytes;
        if (remaining <= 0) break;
        if (row.bytes > remaining) {
          const fitted = this.fitTableRowToBudget(row, remaining);
          if (fitted) visible.push(fitted);
          break;
        }
      }
      visible.push(row);
      usedBytes += row.bytes;
    }
    return visible;
  }

  /**
   * Trims one overflowing row so its rendered key and text fit the remaining
   * aggregate byte budget.
   *
   * @param row - The overflowing capped row.
   * @param remainingBytes - Bytes left in the aggregate budget.
   * @returns The trimmed row, or `null` when nothing can be rendered.
   */
  private fitTableRowToBudget(
    row: GraphIoTableRow,
    remainingBytes: number,
  ): GraphIoTableRow | null {
    const cappedKey = graphIoCapText(row.key, { bytes: remainingBytes, lines: 0 });
    const textAllowance = remainingBytes - cappedKey.bytes;
    if (textAllowance <= 0) {
      return {
        ...row,
        key: cappedKey.text,
        text: '',
        keyTruncated: row.keyTruncated || cappedKey.truncated,
        textTruncated: row.text.length > 0,
        truncated: true,
        bytes: cappedKey.bytes,
      };
    }
    const cappedText = graphIoCapText(row.text, {
      bytes: textAllowance,
      lines: 0,
    });
    return {
      ...row,
      key: cappedKey.text,
      text: cappedText.text,
      keyTruncated: row.keyTruncated || cappedKey.truncated,
      textTruncated: row.textTruncated || cappedText.truncated,
      truncated: true,
      bytes: cappedKey.bytes + cappedText.bytes,
    };
  }

  /** Whether table mode dropped rows because of the cap (SAA-722). */
  readonly tableTruncated = computed(
    () => this.tableRows().length > this.visibleTableRows().length,
  );

  /** Whether any visible table row content was capped (SAA-722, SAA-1432 R1/R2). */
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
   * payload. Falls back to the rendered value, stamped with
   * {@link GRAPH_IO_TRUNCATED_MARKER} and reported through
   * {@link downloadFallback}, when the run client is unavailable, the server has
   * no payload for the node, or the fetch fails with a network-class error
   * ({@link isNetworkClassError}). Other failures set {@link downloadError} and
   * abort without saving. Browser-only; a no-op in a non-DOM environment.
   *
   * @mermaid
   * sequenceDiagram
   *   autonumber
   *   participant U as User
   *   participant V as GraphIoViewerComponent
   *   participant R as GraphRunClient
   *   participant S as Server
   *
   *   U->>V: download()
   *   activate V
   *   V->>V: reset downloadFallback and downloadError
   *   alt Run client available
   *     V->>R: getRunResult(runId)
   *     activate R
   *     R->>S: GET /graph/runs/:runId
   *     S-->>R: run result
   *     deactivate R
   *     alt server has the node field
   *       R-->>V: serverPayload
   *     else payload missing
   *       V->>V: fellBack = true
   *     end
   *   else Run client unavailable
   *     V->>V: fellBack = true
   *   end
   *   alt fetch threw a non-network error
   *     V->>V: downloadError.set(message)
   *     V-->>U: abort without saving
   *   else fellBack
   *     V->>V: markDownloadFallback(payload)
   *     V->>V: downloadFallback.set(true)
   *     V->>V: savePayload(payload)
   *   else full server payload
   *     V->>V: savePayload(payload)
   *   end
   *   V-->>U: JSON file saved
   *   deactivate V
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

  /**
   * Saves a payload as a JSON download named
   * `<field>-<nodeId>.json` with both segments sanitized by
   * {@link sanitizeFilenameSegment} (browser-only, SAA-722).
   *
   * @param payload - The value to serialize; strings are saved verbatim.
   */
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

  /**
   * Applies the configured byte/line cap to a single value's printable form.
   *
   * @param value - The raw cell value.
   * @returns The capped text plus whether it was truncated.
   */
  private capCell(value: unknown): GraphIoCapResult {
    return graphIoCapText(printable(value), this.limit);
  }

  /** Display string for a single value (used for table cells). */
  cellText(value: unknown): string {
    return this.capCell(value).text;
  }
}
