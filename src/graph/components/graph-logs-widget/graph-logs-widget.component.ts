/**
 * @module for-angular/graph/components/graph-logs-widget
 * @summary Chrome-console-style run log widget docked to the canvas.
 * @description Renders the streamed `GRAPH_RUN_LOG` entries from the
 * {@link graphRunLog} singleton store as a collapsible, filterable console.
 * Level filtering follows browser devtools semantics: picking a level shows
 * that level plus everything above it.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import type { GraphRunLogEntry } from '@decaf-ts/integrations/graph/shared';
import {
  GRAPH_LOG_FILTER_LABELS,
  GRAPH_LOG_LEVEL_SEVERITY,
  graphRunLog,
  type GraphLogFilterLevel,
} from '../../execution/GraphRunLogStore';

function entryLevelClassFn(level: GraphRunLogEntry['level']): string {
  return GRAPH_LOG_LEVEL_SEVERITY[level] >= 6
    ? 'graph-logs__entry--error'
    : GRAPH_LOG_LEVEL_SEVERITY[level] >= 5
      ? 'graph-logs__entry--warn'
      : GRAPH_LOG_LEVEL_SEVERITY[level] >= 4
        ? 'graph-logs__entry--info'
        : 'graph-logs__entry--debug';
}

function entryLevelLabelFn(level: GraphRunLogEntry['level']): string {
  return level.toUpperCase();
}

function entryTimeFn(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatValueFn(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Docked Chrome-console-style run log console. Renders the streamed
 * `GRAPH_RUN_LOG` entries held by the shared {@link graphRunLog} signal store
 * with a header bar of level presets, a warnings/errors counter, and clear /
 * collapse / dismiss actions. Purely presentational: it never writes to the
 * store beyond the user actions it exposes, so the store remains the single
 * source of truth for entries and filter state.
 */
@Component({
  selector: 'app-graph-logs-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-logs-widget.component.html',
  styleUrl: './graph-logs-widget.component.scss',
})
export class GraphLogsWidgetComponent {
  /** The shared run-log store this console projects. */
  protected readonly store = graphRunLog;
  /** Display labels for the console-style filter presets. */
  protected readonly filterLabels = GRAPH_LOG_FILTER_LABELS;
  /** Presets rendered as the filter buttons, broadest first. */
  protected readonly levelOptions: GraphLogFilterLevel[] = ['verbose', 'info', 'warn', 'error'];

  /**
   * Applies a console-style filter preset to the shared store.
   * @param filter Preset to activate (hides, never drops, non-matching lines).
   */
  protected setFilter(filter: GraphLogFilterLevel): void {
    this.store.setFilter(filter);
  }

  /** Clears all buffered entries in the shared store. */
  protected clearLogs(): void {
    this.store.clear();
  }

  /** Dismisses the console from the canvas. */
  protected closeLogs(): void {
    this.store.setOpen(false);
  }

  /** Flips the console body between collapsed and expanded states. */
  protected toggleCollapsed(): void {
    this.store.setCollapsed(!this.store.collapsed());
  }

  /**
   * CSS modifier class for a log line based on its severity.
   * @param entry Log entry to classify.
   * @returns One of `graph-logs__entry--{debug|info|warn|error}`.
   */
  protected entryLevelClass(entry: GraphRunLogEntry): string {
    return entryLevelClassFn(entry.level);
  }

  /** Uppercased severity label rendered as the line's badge. */
  protected entryLevelLabel(entry: GraphRunLogEntry): string {
    return entryLevelLabelFn(entry.level);
  }

  /** Local `HH:MM:SS` time for a log entry's ISO timestamp. */
  protected entryTime(entry: GraphRunLogEntry): string {
    return entryTimeFn(entry.timestamp);
  }

  /** Stable-ish display string for arbitrary log payload values. */
  protected formatValue(value: unknown): string {
    return formatValueFn(value);
  }

  /**
   * ngFor track key for a log entry, keyed by run, timestamp and message so
   * streamed duplicates collapse without re-rendering the list.
   */
  protected trackEntry(_: number, entry: GraphRunLogEntry): string {
    return `${entry.runId}-${entry.timestamp}-${entry.message}`;
  }
}
