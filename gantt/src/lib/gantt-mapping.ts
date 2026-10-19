import { GanttLinkType, GanttViewType } from '@worktile/gantt';
import type { GanttItem } from '@worktile/gantt';

import {
  addGanttDays,
  ganttDependencyType,
  startOfGanttDay,
  normalizeGanttDate,
  type GanttConfig,
  type GanttDependencyType,
  type GanttModelIssue,
  type GanttViewScale,
} from './gantt.types';

/**
 * Where a mapped task came from: a validated host task or one of the synthetic
 * issue placeholders rendered when the model has problems.
 *
 * @category Gantt
 */
export interface GanttTaskOrigin<T> {
  readonly task: T;
  readonly taskId: string;
  readonly milestone: boolean;
}

/**
 * A task projected into the shape `@worktile/gantt` consumes.
 *
 * @property origin - The host task backing the mapping, when it came from validated data.
 * @property id - Configured task id.
 * @property title - Configured title.
 * @property start - Normalized start instant, or `null` when unreadable.
 * @property end - Normalized end instant, or `null` when unreadable.
 * @property progress - Completion ratio (0-1), 0 when untracked.
 * @property milestone - Whether the task renders as a milestone marker.
 * @property color - Resolved bar color, or `null` for the default.
 * @property editable - Whether the task may be dragged/resized.
 * @property tooltip - Resolved tooltip text, or `null` for the default.
 * @property parentId - Id of the parent task, when grouped hierarchically.
 * @property dependencies - Normalized predecessors of the task.
 * @category Gantt
 */
export interface GanttMappedTask<T> {
  readonly item: GanttItem<GanttTaskOrigin<T>>;
  readonly task: T;
  readonly taskId: string;
  readonly title: string;
  readonly milestone: boolean;
  readonly start: Date | null;
  readonly end: Date | null;
  readonly progress: number | null;
  readonly editable: boolean;
  readonly tooltip: string | null;
}

/**
 * Outcome of projecting the host model onto the timeline.
 *
 * @property tasks - Mapped tasks in host order.
 * @property issues - Model issues found while mapping (see {@link validateGanttModel}).
 * @property byId - Lookup of mapped tasks by configured id.
 * @category Gantt
 */
export interface GanttMappingResult<T> {
  readonly items: readonly GanttItem<GanttTaskOrigin<T>>[];
  readonly byId: ReadonlyMap<string, GanttMappedTask<T>>;
  readonly dependencies: ReadonlyMap<
    string,
    readonly { id: string; type: GanttDependencyType }[]
  >;
  readonly taskCount: number;
  readonly hasValidTasks: boolean;
  readonly timelineStart: Date | null;
  readonly timelineEnd: Date | null;
}

/**
 * Options controlling how the host model is projected onto the timeline.
 *
 * @property draggable - Whether bars may be dragged/resized at all.
 * @property includeIssuePlaceholders - Whether tasks that failed validation still render (as non-editable placeholders).
 * @category Gantt
 */
export interface GanttMappingOptions {
  readonly draggable: boolean;
  readonly revision?: number;
}

const LINK_TYPES: Record<GanttDependencyType, GanttLinkType> = {
  fs: GanttLinkType.fs,
  ff: GanttLinkType.ff,
  ss: GanttLinkType.ss,
  sf: GanttLinkType.sf,
};

const VIEW_TYPES: Record<GanttViewScale, GanttViewType> = {
  day: GanttViewType.day,
  week: GanttViewType.week,
  month: GanttViewType.month,
  quarter: GanttViewType.quarter,
  year: GanttViewType.year,
};

/**
 * Maps a component {@link GanttViewScale} onto the `@worktile/gantt` view type.
 *
 * @param scale - Timeline scale selected in the toolbar.
 * @returns The matching `@worktile/gantt` view type.
 * @category Gantt
 */
export function ganttViewType(scale: GanttViewScale): GanttViewType {
  return VIEW_TYPES[scale];
}

/**
 * Maps a `@worktile/gantt` view type back onto the component {@link GanttViewScale}.
 *
 * @param viewType - View type reported by the underlying `@worktile/gantt` component.
 * @returns The matching timeline scale.
 * @category Gantt
 */
export function ganttViewScale(type: GanttViewType): GanttViewScale | null {
  const entry = Object.entries(VIEW_TYPES).find(
    ([, value]) => value === type,
  );
  return entry ? (entry[0] as GanttViewScale) : null;
}

function isProgress(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

/**
 * Validates the host model and projects it into {@link GanttMappedTask} entries.
 *
 * Tasks that fail validation are dropped (or rendered as non-editable
 * placeholders when `includeIssuePlaceholders` is set), and every problem is
 * reported through the returned {@link GanttModelIssue} list.
 *
 * @param items - Host tasks to project.
 * @param config - Configuration projecting the tasks.
 * @param options - Projection options.
 * @returns The mapped tasks, lookup and issues.
 * @category Gantt
 */
export function buildGanttMapping<T>(
  tasks: readonly T[],
  config: GanttConfig<T>,
  options: GanttMappingOptions,
): GanttMappingResult<T> {
  const taskById = new Map<string, T>();
  const order: string[] = [];

  for (const task of tasks) {
    const id = String(config.id(task) ?? '').trim();
    if (!id || taskById.has(id)) continue;
    taskById.set(id, task);
    order.push(id);
  }

  const parentOf = new Map<string, string>();
  const effectiveParent = (id: string): string | undefined => {
    const task = taskById.get(id) as T;
    const raw = config.parent?.(task);
    if (raw === null || raw === undefined) return undefined;
    const parentId = String(raw).trim();
    if (!parentId || parentId === id || !taskById.has(parentId)) {
      return undefined;
    }

    const seen = new Set<string>([id]);
    let cursor: string | undefined = parentId;
    while (cursor) {
      if (seen.has(cursor)) return undefined;
      seen.add(cursor);
      const parentTask = taskById.get(cursor);
      if (!parentTask) return undefined;
      const next = config.parent?.(parentTask);
      cursor =
        next === null || next === undefined
          ? undefined
          : String(next).trim() || undefined;
    }
    return parentId;
  };

  for (const id of order) {
    const parentId = effectiveParent(id);
    if (parentId) parentOf.set(id, parentId);
  }

  const dependencies = new Map<
    string,
    { id: string; type: GanttDependencyType }[]
  >();
  for (const id of order) {
    const task = taskById.get(id) as T;
    const normalized: { id: string; type: GanttDependencyType }[] = [];
    for (const entry of config.dependencies?.(task) ?? []) {
      const dependency = ganttDependencyType(entry);
      if (!dependency) continue;
      if (dependency.id === id || !taskById.has(dependency.id)) continue;
      if (typeof entry === 'object' && entry !== null && entry.type) {
        if (!(entry.type in LINK_TYPES)) continue;
      }
      normalized.push(dependency);
    }
    dependencies.set(id, normalized);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const allowedDependencies = new Map<
    string,
    { id: string; type: GanttDependencyType }[]
  >();

  const collectDependencies = (id: string): void => {
    if (visited.has(id)) return;
    visiting.add(id);
    const allowed: { id: string; type: GanttDependencyType }[] = [];
    for (const dependency of dependencies.get(id) ?? []) {
      if (visiting.has(dependency.id)) continue;
      if (!visited.has(dependency.id)) collectDependencies(dependency.id);
      allowed.push(dependency);
    }
    visiting.delete(id);
    visited.add(id);
    allowedDependencies.set(id, allowed);
  };

  for (const id of order) {
    if (!visited.has(id)) collectDependencies(id);
  }

  const outgoingLinks = new Map<
    string,
    { id: string; type: GanttDependencyType }[]
  >();
  for (const id of order) {
    for (const dependency of allowedDependencies.get(id) ?? []) {
      const links = outgoingLinks.get(dependency.id) ?? [];
      links.push({ id, type: dependency.type });
      outgoingLinks.set(dependency.id, links);
    }
  }

  const mappedById = new Map<string, GanttMappedTask<T>>();
  const itemsById = new Map<string, GanttItem<GanttTaskOrigin<T>>>();
  const issues: GanttModelIssue[] = [];
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;

  for (const id of order) {
    const task = taskById.get(id) as T;
    const title = String(config.title(task) ?? id);
    const milestone = Boolean(config.milestone?.(task));
    let start = normalizeGanttDate(config.start(task));
    let end = normalizeGanttDate(config.end(task));

    if (!start || !end) {
      issues.push({
        code: 'invalid-date',
        taskId: id,
        detail: `Task "${id}" has an unreadable start or end date.`,
      });
      start = null;
      end = null;
    } else if (end.getTime() < start.getTime()) {
      issues.push({
        code: 'invalid-date',
        taskId: id,
        detail: `Task "${id}" ends before it starts.`,
      });
      start = null;
      end = null;
    } else if (milestone) {
      end = start;
    }

    if (start && end) {
      if (!minStart || start.getTime() < minStart.getTime()) minStart = start;
      if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end;
    }

    const rawProgress = config.progress?.(task);
    const progress = isProgress(rawProgress) ? rawProgress : null;
    if (
      rawProgress !== null &&
      rawProgress !== undefined &&
      progress === null
    ) {
      issues.push({
        code: 'invalid-progress',
        taskId: id,
        detail: `Task "${id}" progress must be between 0 and 1.`,
      });
    }

    const color = config.color?.(task);
    const tooltip = config.tooltip?.(task);
    const editable =
      options.draggable && (config.editable?.(task) ?? true);

    const item: GanttItem<GanttTaskOrigin<T>> = {
      id,
      title,
      ...(start && end ? { start, end } : {}),
      ...(progress !== null ? { progress } : {}),
      ...(color ? { color } : {}),
      draggable: editable,
      itemDraggable: editable,
      linkable: false,
      expandable: false,
      expanded: true,
      origin: { task, taskId: id, milestone },
      children: [],
    };

    taskById.set(id, task);
    itemsById.set(id, item);
    mappedById.set(id, {
      item,
      task,
      taskId: id,
      title,
      milestone,
      start,
      end,
      progress,
      editable,
      tooltip: tooltip === null || tooltip === undefined ? null : String(tooltip),
    });
  }

  for (const id of order) {
    const item = itemsById.get(id);
    const mapped = mappedById.get(id);
    if (!item || !mapped) continue;

    if (!mapped.start || !mapped.end) {
      item.links = [];
      continue;
    }

    item.links = (outgoingLinks.get(id) ?? []).map((dependency) => ({
      type: LINK_TYPES[dependency.type],
      link: dependency.id,
    }));
  }

  const roots: GanttItem<GanttTaskOrigin<T>>[] = [];
  for (const id of order) {
    const item = itemsById.get(id);
    if (!item) continue;
    const parentId = parentOf.get(id);
    const parent = parentId ? itemsById.get(parentId) : undefined;
    if (parent) {
      (parent.children as GanttItem<GanttTaskOrigin<T>>[]).push(item);
    } else {
      roots.push(item);
    }
  }

  for (const item of itemsById.values()) {
    item.expandable = (item.children?.length ?? 0) > 0;
  }

  const timelineStart = minStart
    ? addGanttDays(startOfGanttDay(minStart), -1)
    : null;
  const timelineEnd = maxEnd
    ? addGanttDays(startOfGanttDay(maxEnd), 1)
    : null;

  return {
    items: roots,
    byId: mappedById,
    dependencies: allowedDependencies,
    taskCount: order.length,
    hasValidTasks: Boolean(minStart && maxEnd),
    timelineStart,
    timelineEnd,
  };
}
