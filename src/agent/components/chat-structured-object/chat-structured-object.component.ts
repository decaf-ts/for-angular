import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from "@angular/core";
import { GraphIoViewerComponent } from "@decaf-ts/for-angular/diagrams";
import { AgentTranslateFallbackPipe } from "../../i18n/agent-translate-fallback.pipe";
import type { AgentChatStructuredObjectEntry } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";

/** Kind of a flattened structured-object row. */
export type AgentChatStructuredRowKind = "primitive" | "object" | "array";

/** One flattened row of a structured object, with its path, label, depth, kind, raw value, and display text. */
export interface AgentChatStructuredRow {
  /** JSON path of the row, rooted at `$`. */
  readonly path: string;
  /** Display label of the row (object key, array index, or root). */
  readonly label: string;
  /** Nesting depth of the row. */
  readonly depth: number;
  /** Kind of the row value. */
  readonly kind: AgentChatStructuredRowKind;
  /** Raw value at the row path. */
  readonly value: unknown;
  /** Preformatted display text for the row. */
  readonly display: string;
}

const MAX_STRUCTURED_DEPTH = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function displayPrimitive(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function flatten(
  value: unknown,
  rows: AgentChatStructuredRow[],
  path: string,
  label: string,
  depth: number,
): void {
  if (depth > MAX_STRUCTURED_DEPTH) return;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({
        path,
        label,
        depth,
        kind: "array",
        value,
        display: "[]",
      });
      return;
    }
    rows.push({
      path,
      label,
      depth,
      kind: "array",
      value,
      display: `[${value.length}]`,
    });
    value.forEach((entry, index) => {
      flatten(entry, rows, `${path}[${index}]`, `[${index}]`, depth + 1);
    });
    return;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      rows.push({
        path,
        label,
        depth,
        kind: "object",
        value,
        display: "{}",
      });
      return;
    }
    rows.push({
      path,
      label,
      depth,
      kind: "object",
      value,
      display: `{${keys.length}}`,
    });
    keys.forEach((key) => {
      flatten(
        value[key],
        rows,
        `${path}.${key}`,
        key,
        depth + 1,
      );
    });
    return;
  }
  rows.push({
    path,
    label,
    depth,
    kind: "primitive",
    value,
    display: displayPrimitive(value),
  });
}

/**
 * Flattens an arbitrary JSON-like value into displayable rows, stopping at
 * eight nesting levels.
 *
 * @param value - Value to flatten.
 * @returns One row per object key and array entry, using `$` as the root path.
 */
export function flattenAgentChatStructuredObject(
  value: unknown,
): AgentChatStructuredRow[] {
  if (value === null || value === undefined) return [];
  const rows: AgentChatStructuredRow[] = [];
  flatten(value, rows, "$", "$", 0);
  return rows;
}

/**
 * Produces a short single-line summary for a structured value.
 *
 * @param value - Value to summarize.
 * @param limit - Maximum number of characters before truncation; defaults to 120.
 * @returns The display text, ellipsized when longer than `limit`.
 */
export function summarizeAgentChatStructuredValue(
  value: unknown,
  limit = 120,
): string {
  const text = displayPrimitive(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

/** Structured-object viewer for streamed/committed agent output. Flattens nested values into rows, shows a streaming ghost state, and keeps a selectable commit history. */
@Component({
  selector: "ngx-decaf-chat-structured-object",
  templateUrl: "./chat-structured-object.component.html",
  styleUrls: ["./chat-structured-object.component.scss"],
  imports: [
    AgentTranslateFallbackPipe,
    ChatIconComponent,
    GraphIoViewerComponent,
  ],
  standalone: true,
})
export class ChatStructuredObjectComponent {
  /** Structured value to render. */
  readonly value = input<unknown>(null);
  /** Whether the value is a partial (still streaming) preview. */
  readonly partial = input<boolean>(false);
  /** Whether the value is currently streaming. */
  readonly streaming = input<boolean>(false);
  /** Run id stamped on committed history entries. */
  readonly runId = input<string>("");
  /** Previously committed history entries supplied by the caller. */
  readonly history = input<AgentChatStructuredObjectEntry[]>([]);
  /** Whether the raw value is shown instead of the flattened rows. */
  readonly rawMode = input<boolean>(false);
  /** Optional title override. */
  readonly title = input<string | null>(null);
  /** Whether the commit history is rendered. */
  readonly showHistory = input<boolean>(true);
  /** Whether the empty state uses the compact variant. */
  readonly emptyVariant = input<boolean>(true);

  /** Emits a structured object when streaming completes. */
  readonly committed = output<AgentChatStructuredObjectEntry>();
  /** Emits the history entry selected by the user. */
  readonly historySelected = output<AgentChatStructuredObjectEntry>();

  /** Entries committed during this component's lifetime. */
  readonly committedEntries = signal<AgentChatStructuredObjectEntry[]>([]);

  /** Flattened rows for the current value. */
  readonly rows = computed(() =>
    flattenAgentChatStructuredObject(this.value()),
  );

  /** Whether the viewer should render the streaming/partial state. */
  readonly ghost = computed(() => this.streaming() || this.partial());

  /** Whether a value is available to render. */
  readonly hasValue = computed(
    () => this.value() !== null && this.value() !== undefined,
  );

  /** Combined committed and supplied history entries. */
  readonly entries = computed<AgentChatStructuredObjectEntry[]>(() => [
    ...this.committedEntries(),
    ...this.history(),
  ]);

  /** i18n key for the current state label. */
  readonly stateLabelKey = computed(() =>
    this.ghost()
      ? "agent.chat.structuredObject.ghost"
      : "agent.chat.structuredObject.committed",
  );

  /** English fallback for the current state label. */
  readonly stateLabelFallback = computed(() =>
    this.ghost() ? "Streaming preview" : "Committed",
  );

  private wasStreaming = false;
  private initialized = false;

  constructor() {
    effect(() => {
      const streaming = this.streaming() || this.partial();
      const value = this.value();
      const runId = this.runId();
      if (!this.initialized) {
        this.initialized = true;
        this.wasStreaming = streaming;
        return;
      }
      if (
        this.wasStreaming &&
        !streaming &&
        value !== null &&
        value !== undefined
      ) {
        const entry: AgentChatStructuredObjectEntry = {
          runId,
          value,
          committedAt: new Date().toISOString(),
        };
        this.committedEntries.update((entries) => [entry, ...entries]);
        this.committed.emit(entry);
      }
      this.wasStreaming = streaming;
    });
  }

  /** Short display summary for a nested value. */
  summary(value: unknown): string {
    return summarizeAgentChatStructuredValue(value);
  }

  /** Tracks flattened rows by path. */
  trackRow(_: number, row: AgentChatStructuredRow): string {
    return row.path;
  }

  /** Tracks history entries by run id and commit time. */
  trackEntry(index: number, entry: AgentChatStructuredObjectEntry): string {
    return `${entry.runId}:${entry.committedAt ?? index}`;
  }

  /** Emits the selected history entry. */
  selectHistory(entry: AgentChatStructuredObjectEntry): void {
    this.historySelected.emit(entry);
  }
}
