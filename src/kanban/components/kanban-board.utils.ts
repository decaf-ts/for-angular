import { KanbanConfig } from './kanban.types';

/**
 * In-flight keyboard move shown as a preview before the host commits it.
 *
 * @property taskId - Id of the grabbed task.
 * @property fromColumn - Column the task is leaving.
 * @property toColumn - Column the task is entering.
 * @property index - Target position within the destination column.
 * @category Kanban
 */
export interface KanbanPreview<T> {
  readonly task: T;
  readonly taskId: string;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly fromVisibleIndex: number;
  readonly toVisibleIndex: number;
}

/**
 * Result of translating a drop-list move into full-column indices.
 *
 * @property previousIndex - Index within the full source column.
 * @property currentIndex - Index within the full target column.
 * @category Kanban
 */
export interface ResolvedMove {
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * Clamps a number into the inclusive `[min, max]` range.
 * @category Kanban
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Groups tasks by their configured column id, preserving the column order and,
 * within a column, the input order of the tasks.
 *
 * @param items - Host tasks to group.
 * @param config - Board configuration providing the status accessor and column order.
 * @returns Map of column id to the tasks currently in it (empty lists for empty columns).
 * @category Kanban
 */
export function groupByStatus<T>(
  items: readonly T[],
  config: KanbanConfig<T>
): Map<string, readonly T[]> {
  const grouped = new Map<string, T[]>();
  for (const column of config.columns) {
    grouped.set(column.id, []);
  }
  for (const item of items) {
    const bucket = grouped.get(config.status(item));
    if (bucket) {
      bucket.push(item);
    }
  }
  return grouped;
}

/**
 * Applies the optional visibility filter to each column's tasks.
 *
 * @param grouped - Tasks grouped by column id.
 * @param filter - Predicate a task must satisfy to stay visible, or `null` for no filtering.
 * @returns A new map with only the visible tasks per column.
 * @category Kanban
 */
export function applyFilter<T>(
  grouped: ReadonlyMap<string, readonly T[]>,
  filter: ((item: T) => boolean) | null
): Map<string, readonly T[]> {
  const filtered = new Map<string, readonly T[]>();
  for (const [columnId, items] of grouped) {
    filtered.set(columnId, filter ? items.filter(filter) : items.slice());
  }
  return filtered;
}

/**
 * Applies an in-flight keyboard move preview to the grouped view so the moving
 * card appears in its destination column while grabbed.
 *
 * @param grouped - Tasks grouped by column id.
 * @param preview - The active preview, or `null` when nothing is grabbed.
 * @param idOf - Accessor extracting a task's id.
 * @returns A new map reflecting the previewed position.
 * @category Kanban
 */
export function applyPreview<T>(
  lists: ReadonlyMap<string, readonly T[]>,
  preview: KanbanPreview<T> | null,
  idOf: (item: T) => string
): Map<string, readonly T[]> {
  const result = new Map<string, readonly T[]>();
  for (const [columnId, items] of lists) {
    result.set(columnId, items);
  }
  if (!preview) {
    return result;
  }
  const source = lists.get(preview.fromColumn) ?? [];
  const sourceIndex = source.findIndex((item) => idOf(item) === preview.taskId);
  if (sourceIndex < 0) {
    return result;
  }
  const task = source[sourceIndex];
  const sourceWithoutTask = source.filter((_item, index) => index !== sourceIndex);
  if (preview.fromColumn === preview.toColumn) {
    const target = sourceWithoutTask.slice();
    target.splice(clamp(preview.toVisibleIndex, 0, target.length), 0, task);
    result.set(preview.fromColumn, target);
    return result;
  }
  result.set(preview.fromColumn, sourceWithoutTask);
  const target = (lists.get(preview.toColumn) ?? []).slice();
  target.splice(clamp(preview.toVisibleIndex, 0, target.length), 0, task);
  result.set(preview.toColumn, target);
  return result;
}

/**
 * Translates visible (possibly filtered) drop indices into indices over the
 * full, unfiltered column contents so the host can commit moves on real data.
 *
 * @param task - The moved task.
 * @param fromColumn - Source column id.
 * @param toColumn - Target column id.
 * @param previousIndex - Visible index in the source column.
 * @param currentIndex - Visible index in the target column.
 * @param fullSource - Full unfiltered task list of the source column.
 * @param fullTarget - Full unfiltered task list of the target column.
 * @param visibleSource - Filtered (visible) task list of the source column.
 * @param visibleTarget - Filtered (visible) task list of the target column.
 * @param idOf - Accessor extracting a task's id.
 * @returns The resolved full-column indices, or `null` when the move cannot be resolved.
 * @category Kanban
 */
export function resolveMoveIndices<T>(
  task: T,
  fromColumn: string,
  toColumn: string,
  previousVisibleIndex: number,
  currentVisibleIndex: number,
  fullSource: readonly T[],
  fullTarget: readonly T[],
  visibleSource: readonly T[],
  visibleTarget: readonly T[],
  idOf: (item: T) => string
): ResolvedMove | null {
  const taskId = idOf(task);
  const previousIndex = fullSource.findIndex((item) => idOf(item) === taskId);
  if (previousIndex < 0) {
    return null;
  }
  if (
    previousVisibleIndex < 0 ||
    previousVisibleIndex >= visibleSource.length ||
    idOf(visibleSource[previousVisibleIndex]) !== taskId
  ) {
    return null;
  }
  if (fromColumn === toColumn) {
    if (currentVisibleIndex === previousVisibleIndex || currentVisibleIndex < 0) {
      return { previousIndex, currentIndex: previousIndex };
    }
    const reordered = visibleSource.slice();
    const moved = reordered.splice(previousVisibleIndex, 1)[0];
    const safeCurrent = clamp(currentVisibleIndex, 0, reordered.length);
    reordered.splice(safeCurrent, 0, moved);
    const next = reordered[safeCurrent + 1];
    const previous = reordered[safeCurrent - 1];
    const remaining = fullSource.filter((item) => idOf(item) !== taskId);
    let insertAt = remaining.length;
    if (next) {
      const index = remaining.findIndex((item) => idOf(item) === idOf(next));
      if (index >= 0) {
        insertAt = index;
      }
    } else if (previous) {
      const index = remaining.findIndex((item) => idOf(item) === idOf(previous));
      if (index >= 0) {
        insertAt = index + 1;
      }
    }
    const target = remaining.slice();
    target.splice(insertAt, 0, task);
    return {
      previousIndex,
      currentIndex: target.findIndex((item) => idOf(item) === taskId),
    };
  }
  const safeCurrent = clamp(currentVisibleIndex, 0, visibleTarget.length);
  const remaining = fullTarget.filter((item) => idOf(item) !== taskId);
  const insertBefore = visibleTarget[safeCurrent];
  const insertAfter = visibleTarget[safeCurrent - 1];
  let insertAt = remaining.length;
  if (insertBefore) {
    const index = remaining.findIndex((item) => idOf(item) === idOf(insertBefore));
    if (index >= 0) {
      insertAt = index;
    }
  } else if (insertAfter) {
    const index = remaining.findIndex((item) => idOf(item) === idOf(insertAfter));
    if (index >= 0) {
      insertAt = index + 1;
    }
  }
  const target = remaining.slice();
  target.splice(insertAt, 0, task);
  return {
    previousIndex,
    currentIndex: target.findIndex((item) => idOf(item) === taskId),
  };
}
