/**
 * @module for-angular/graph/execution/GraphRunLogStore
 * @summary Singleton signal store backing the bottom-docked run log console.
 * @description Holds the `graph.run.log` streamed entries plus the
 * Chrome-console-style filter state. The widget is a pure projection of this
 * store, so a page can forward SSE `GRAPH_RUN_LOG` events with a single
 * `graphRunLog.append(entry)` call.
 */
import { computed, signal } from "@angular/core";

import type { GraphRunLogEntry, LogNodeLevel } from "@decaf-ts/integrations/graph/shared";

/**
 * Console-style log presets for the run log filter.
 */
export type GraphLogFilterLevel = "verbose" | "info" | "warn" | "error";

/**
 * Display labels for the console-style filter presets (Req-4).
 */
export const GRAPH_LOG_FILTER_LABELS: Record<GraphLogFilterLevel, string> = {
  verbose: "Verbose",
  info: "Info",
  warn: "Warnings",
  error: "Errors",
};

/**
 * Severity ordering for every {@link LogNodeLevel} plus the `benchmark` level
 * emitted by the Log node. Lower values are more noisy; every filter preset is
 * a minimum severity threshold (Chrome-console semantics: selecting a level
 * shows that level and everything above it).
 */
export const GRAPH_LOG_LEVEL_SEVERITY: Record<LogNodeLevel | "benchmark", number> = {
  silly: 0,
  trace: 1,
  debug: 2,
  verbose: 3,
  info: 4,
  warn: 5,
  error: 6,
  critical: 7,
  fatal: 8,
  benchmark: 4,
};

/**
 * Minimum severity threshold for each console-style preset.
 */
export const GRAPH_LOG_FILTER_THRESHOLD: Record<GraphLogFilterLevel, number> = {
  verbose: 0,
  info: 3,
  warn: 5,
  error: 6,
};

/** Maximum buffered console entries; appending beyond this drops the oldest. */
const MAX_ENTRIES = 500;

/**
 * Angular-signal store backing the bottom-docked run log console. Holds the
 * streamed `GRAPH_RUN_LOG` entries, the console open/collapsed/filter UI state,
 * and the derived projections (`visibleEntries`, `counts`). The page wiring
 * forwards SSE entries via {@link append}; the widget is a pure projection of
 * this store.
 */
class GraphRunLogStore {
  /** Run log entries buffered for the current run, capped at {@link MAX_ENTRIES}. */
  readonly entries = signal<GraphRunLogEntry[]>([]);
  /** Whether the console is currently shown on the canvas. */
  readonly open = signal(false);
  /** Whether the console body is collapsed to just its header bar. */
  readonly collapsed = signal(false);
  /** Active Chrome-console-style preset (see {@link GraphLogFilterLevel}). */
  readonly filter = signal<GraphLogFilterLevel>("verbose");

  /**
   * Entries passing the active filter preset. A preset is a minimum severity
   * threshold (Chrome-console semantics), so narrower presets are subsets of
   * the buffered {@link entries} rather than separate streams (Req-4).
   */
  readonly visibleEntries = computed(() => {
    const threshold = GRAPH_LOG_FILTER_THRESHOLD[this.filter()];
    return this.entries().filter(
      (entry) => GRAPH_LOG_LEVEL_SEVERITY[entry.level] >= threshold,
    );
  });

  /**
   * Console header counters: total entries, warnings (`warn` and above) and
   * errors (`error` and above).
   */
  readonly counts = computed(() => {
    const total = this.entries().length;
    let warnings = 0;
    let errors = 0;
    for (const entry of this.entries()) {
      if (GRAPH_LOG_LEVEL_SEVERITY[entry.level] >= 6) errors++;
      if (GRAPH_LOG_LEVEL_SEVERITY[entry.level] >= 5) warnings++;
    }
    return { total, warnings, errors };
  });

  /**
   * Appends a single log entry to the buffer, dropping the oldest entries when
   * the buffer exceeds {@link MAX_ENTRIES}.
   * @param entry The streamed `GRAPH_RUN_LOG` payload originating from the run.
   */
  append(entry: GraphRunLogEntry): void {
    this.entries.update((current) => {
      const next = [...current, entry];
      if (next.length > MAX_ENTRIES) return next.slice(next.length - MAX_ENTRIES);
      return next;
    });
  }

  /**
   * Appends a batch of log entries (e.g. buffered history loaded on run start).
   * No-op for an empty array. Applies the same {@link MAX_ENTRIES} cap as
   * {@link append}.
   * @param entries Entries to append, preserving their order.
   */
  appendAll(entries: GraphRunLogEntry[]): void {
    if (!entries.length) return;
    this.entries.update((current) => {
      const next = [...current, ...entries];
      if (next.length > MAX_ENTRIES) return next.slice(next.length - MAX_ENTRIES);
      return next;
    });
  }

  /** Clears every buffered entry (the console header "Clear" action). */
  clear(): void {
    this.entries.set([]);
  }

  /**
   * Sets the active filter preset without dropping buffered entries (they stay
   * in {@link entries} and are only hidden from {@link visibleEntries}).
   * @param filter One of the console-style presets.
   */
  setFilter(filter: GraphLogFilterLevel): void {
    this.filter.set(filter);
  }

  /**
   * Shows or hides the console on the canvas. Opening the console also expands
   * a collapsed body so the user sees the stream immediately on run start.
   * @param open Whether the console should be visible.
   */
  setOpen(open: boolean): void {
    this.open.set(open);
    if (open) this.collapsed.set(false);
  }

  /** Sets whether the console body is collapsed to just its header bar. */
  setCollapsed(collapsed: boolean): void {
    this.collapsed.set(collapsed);
  }

  /** Resets the console to its initial state for the next run. */
  reset(): void {
    this.clear();
    this.setFilter("verbose");
    this.setOpen(false);
    this.setCollapsed(false);
  }
}

/** Singleton shared by the page wiring and the run log widget. */
export const graphRunLog = new GraphRunLogStore();
