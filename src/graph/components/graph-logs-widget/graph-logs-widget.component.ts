/**
 * @module for-angular/graph/components/graph-logs-widget
 * @summary Chrome-console-style run log drawer docked to the canvas bottom.
 * @description Renders the streamed `GRAPH_RUN_LOG` entries plus the
 * run-lifecycle lines (created/validated/validation issues) from the
 * {@link graphRunLog} singleton store as a collapsible, filterable console the
 * user opens on demand. Level filtering follows browser devtools semantics:
 * picking a level shows that level plus everything above it.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import type { GraphRunLogEntry } from '@decaf-ts/ui-decorators/graph';
import {
  GRAPH_LOG_FILTER_LABELS,
  GRAPH_LOG_LEVEL_SEVERITY,
  GRAPH_RUN_LOG_LIFECYCLE_LABELS,
  graphRunLog,
  type GraphLogFilterLevel,
  type GraphRunLogLifecycleEntry,
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
 * CSS modifier class for a run-lifecycle line based on its kind.
 * @param kind Lifecycle transition the line reports.
 * @returns `graph-logs__lifecycle-entry--{created|validated|validation-issues}`.
 */
function lifecycleClassFn(kind: GraphRunLogLifecycleEntry['kind']): string {
  return `graph-logs__lifecycle-entry--${kind}`;
}

/**
 * Docked bottom-drawer run log console (DECAF-50 §4.22/D6). Renders the
 * streamed `GRAPH_RUN_LOG` entries and the run-lifecycle lines held by the
 * shared {@link graphRunLog} signal store, with a header bar of level presets, a
 * warnings/errors counter, and clear / collapse / dismiss actions. When closed it
 * renders an open affordance so the user can open it on demand regardless of
 * whether the run produced any entries; when open with nothing to show it renders
 * an empty state. Purely presentational: it never writes to the store beyond the
 * user actions it exposes, so the store remains the single source of truth.
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

  /** Opens the on-demand console from its docked handle (D6/G3-19). */
  protected openLogs(): void {
    this.store.setOpen(true);
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

  /** Readable label rendered as a run-lifecycle line's badge (D6/G3-21). */
  protected lifecycleLabel(line: GraphRunLogLifecycleEntry): string {
    return GRAPH_RUN_LOG_LIFECYCLE_LABELS[line.kind];
  }

  /** CSS modifier class for a run-lifecycle line based on its kind. */
  protected lifecycleClass(line: GraphRunLogLifecycleEntry): string {
    return lifecycleClassFn(line.kind);
  }

  /** Local `HH:MM:SS` time for a log line's ISO timestamp. */
  protected entryTime(line: { timestamp: string }): string {
    return entryTimeFn(line.timestamp);
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

  /**
   * ngFor track key for a run-lifecycle line, keyed by kind, timestamp and
   * message so repeated lifecycle lines stay distinct.
   */
  protected trackLifecycle(_: number, line: GraphRunLogLifecycleEntry): string {
    return `${line.kind}-${line.timestamp}-${line.message}`;
  }
}
