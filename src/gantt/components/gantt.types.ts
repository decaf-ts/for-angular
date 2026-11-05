/**
 * Accepted representations of a task date: an existing `Date`, an ISO/parsable
 * string, or an epoch timestamp in seconds or milliseconds.
 *
 * @category Gantt
 */
export type GanttDateInput = Date | string | number;

/**
 * Timeline scale the Gantt renders: one bar unit per day, week, month, quarter or year.
 *
 * @category Gantt
 */
export type GanttViewScale = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * All {@link GanttViewScale} values in rendering order, used by the toolbar scale picker.
 *
 * @category Gantt
 */
export const GANTT_VIEW_SCALES: readonly GanttViewScale[] = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
];

/**
 * Finish/start dependency semantics between two tasks: `fs` (finish-to-start),
 * `ff` (finish-to-finish), `ss` (start-to-start) and `sf` (start-to-finish).
 *
 * @category Gantt
 */
export type GanttDependencyType = 'fs' | 'ff' | 'ss' | 'sf';

/**
 * All {@link GanttDependencyType} values.
 *
 * @category Gantt
 */
export const GANTT_DEPENDENCY_TYPES: readonly GanttDependencyType[] = [
  'fs',
  'ff',
  'ss',
  'sf',
];

/**
 * Reference to another task this task depends on.
 *
 * @property id - Id of the predecessor task.
 * @property type - Dependency semantics; defaults to `fs` when omitted.
 *
 * @category Gantt
 */
export interface GanttDependency {
  readonly id: string;
  readonly type?: GanttDependencyType;
}

/**
 * Dependency as accepted in task data: a bare predecessor id (finish-to-start)
 * or a full {@link GanttDependency}.
 *
 * @category Gantt
 */
export type GanttDependencyInput = string | GanttDependency;

/**
 * Typed configuration contract for the Gantt component.
 *
 * Accessor-based so no task shape is imposed on consumers; all accessors may
 * return `null`/`undefined` for optional projections (they render as missing).
 *
 * @property id - Stable unique identifier of a task.
 * @property title - Display title shown in the side list and bar labels.
 * @property start - Task start date; unparseable values are reported as model issues.
 * @property end - Task end date; must not precede `start`.
 * @property progress - Completion ratio between 0 and 1, when tracked.
 * @property parent - Id of the parent task for hierarchical grouping, when any.
 * @property dependencies - Predecessors of the task, when any.
 * @property milestone - Whether the task renders as a milestone marker instead of a bar.
 * @property color - Optional CSS color overriding the bar color.
 * @property editable - Whether the task may be dragged/resized; defaults to editable.
 * @property tooltip - Optional tooltip text; the default derives one from dates and progress.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttConfig<T> {
  readonly id: (task: T) => string;
  readonly title: (task: T) => string;
  readonly start: (task: T) => GanttDateInput | null | undefined;
  readonly end: (task: T) => GanttDateInput | null | undefined;
  readonly progress?: (task: T) => number | null | undefined;
  readonly parent?: (task: T) => string | null | undefined;
  readonly dependencies?: (
    task: T,
  ) => readonly GanttDependencyInput[] | null | undefined;
  readonly milestone?: (task: T) => boolean;
  readonly color?: (task: T) => string | null | undefined;
  readonly editable?: (task: T) => boolean;
  readonly tooltip?: (task: T) => string | null | undefined;
}

/**
 * Declarative field mapping used by {@link ganttConfigFromFields} to derive a
 * {@link GanttConfig} from property names instead of accessors.
 *
 * @property id - Property holding the task id.
 * @property title - Property holding the display title.
 * @property start - Property holding the start date.
 * @property end - Property holding the end date.
 * @property progress - Property holding the completion ratio.
 * @property parent - Property holding the parent task id.
 * @property dependencies - Property holding the predecessor list.
 * @property milestone - Property holding the milestone flag.
 * @property color - Property holding the bar color.
 * @property editable - Property holding the editable flag.
 * @property tooltip - Property holding the tooltip text.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttFieldMap<T> {
  readonly id: keyof T;
  readonly title: keyof T;
  readonly start: keyof T;
  readonly end: keyof T;
  readonly progress?: keyof T;
  readonly parent?: keyof T;
  readonly dependencies?: keyof T;
  readonly milestone?: keyof T;
  readonly color?: keyof T;
  readonly editable?: keyof T;
  readonly tooltip?: keyof T;
}

/**
 * Normalized start/end of a task in both instant and `yyyy-MM-dd` form.
 *
 * @property start - Normalized start instant, or `null` when unreadable.
 * @property end - Normalized end instant, or `null` when unreadable.
 * @property startDate - Start formatted as `yyyy-MM-dd` in local time, or `null`.
 * @property endDate - End formatted as `yyyy-MM-dd` in local time, or `null`.
 *
 * @category Gantt
 */
export interface GanttTaskDateRange {
  readonly start: Date | null;
  readonly end: Date | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
}

/**
 * What triggered a task date change: mouse drag, keyboard shortcut, or programmatic control.
 *
 * @category Gantt
 */
export type GanttDateChangeReason = 'drag' | 'keyboard' | 'control';

/**
 * Whether a date change moved the whole bar (`move`) or resized one of its edges (`resize`).
 *
 * @category Gantt
 */
export type GanttDateChangeMode = 'move' | 'resize';

/**
 * Reasons a requested task date change was rejected by the component before
 * being emitted as an accepted change.
 *
 * @category Gantt
 */
export type GanttDateChangeRejectionReason =
  | 'disabled'
  | 'readonly'
  | 'invalid-date'
  | 'milestone'
  | 'dependency-violation'
  | 'unknown-task'
  | 'unchanged';

/**
 * What triggered a task progress change: keyboard shortcut or programmatic control.
 *
 * @category Gantt
 */
export type GanttProgressChangeReason = 'keyboard' | 'control';

/**
 * Reasons a requested task progress change was rejected before being emitted as accepted.
 *
 * @category Gantt
 */
export type GanttProgressChangeRejectionReason =
  | 'disabled'
  | 'readonly'
  | 'invalid-progress'
  | 'unknown-task'
  | 'unchanged';

/**
 * Emitted when a task bar is selected, or an edit is requested via keyboard/`E`.
 *
 * @property task - The selected task.
 * @property taskId - Configured id of the selected task.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttTaskSelectionEvent<T> {
  readonly task: T;
  readonly taskId: string;
}

/**
 * Emitted after a task's dates changed and the component accepted the change.
 *
 * @property task - The changed task.
 * @property taskId - Configured id of the changed task.
 * @property previous - Date range before the change.
 * @property current - Date range after the change.
 * @property reason - What triggered the change.
 * @property mode - Whether the bar was moved or resized.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttTaskDateChangeEvent<T> {
  readonly task: T;
  readonly taskId: string;
  readonly previous: GanttTaskDateRange;
  readonly current: GanttTaskDateRange;
  readonly reason: GanttDateChangeReason;
  readonly mode: GanttDateChangeMode;
}

/**
 * Emitted when a requested date change was rejected. The component never
 * mutates host data; it reports the attempted change and why it was refused.
 *
 * @property task - The task the change was attempted for, or `null` when it could not be resolved.
 * @property taskId - Configured id of the task, empty when unknown.
 * @property previous - Date range before the change, when known.
 * @property requested - The requested date range, when it could be normalized.
 * @property reason - Why the change was refused.
 * @property mode - Whether a move or a resize was attempted.
 * @property dependencyId - Id of the dependency that was violated, when `reason` is `dependency-violation`.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttTaskDateChangeRejectedEvent<T> {
  readonly task: T | null;
  readonly taskId: string;
  readonly previous: GanttTaskDateRange | null;
  readonly requested: GanttTaskDateRange | null;
  readonly reason: GanttDateChangeRejectionReason;
  readonly mode: GanttDateChangeMode;
  readonly dependencyId?: string;
}

/**
 * Emitted after a task's progress changed and the component accepted the change.
 *
 * @property task - The changed task.
 * @property taskId - Configured id of the changed task.
 * @property previous - Progress before the change (0-1).
 * @property current - Progress after the change (0-1).
 * @property reason - What triggered the change.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttTaskProgressChangeEvent<T> {
  readonly task: T;
  readonly taskId: string;
  readonly previous: number;
  readonly current: number;
  readonly reason: GanttProgressChangeReason;
}

/**
 * Emitted when a requested progress change was rejected.
 *
 * @property task - The task the change was attempted for, or `null` when it could not be resolved.
 * @property taskId - Configured id of the task, empty when unknown.
 * @property previous - Progress before the change, when known.
 * @property requested - The requested progress, when it could be parsed.
 * @property reason - Why the change was refused.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttTaskProgressChangeRejectedEvent<T> {
  readonly task: T | null;
  readonly taskId: string;
  readonly previous: number | null;
  readonly requested: number | null;
  readonly reason: GanttProgressChangeRejectionReason;
}

/**
 * Template context exposed to the `*decafGanttBar` template.
 *
 * @property $implicit - The task, so templates can use `let-task`.
 * @property task - The task the bar renders.
 * @property taskId - Configured id of the task.
 * @property title - Configured title of the task.
 * @property start - Normalized start instant, or `null` when unreadable.
 * @property end - Normalized end instant, or `null` when unreadable.
 * @property progress - Completion ratio (0-1), 0 when untracked.
 * @property progressPercent - Completion ratio as a percentage (0-100).
 * @property milestone - Whether the task renders as a milestone marker.
 * @property selected - Whether the bar is currently selected.
 * @property readOnly - Whether the component is in read-only mode.
 * @property tooltip - Resolved tooltip text, or `null`.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttBarTemplateContext<T> {
  readonly $implicit: T;
  readonly task: T;
  readonly taskId: string;
  readonly title: string;
  readonly start: Date | null;
  readonly end: Date | null;
  readonly progress: number;
  readonly progressPercent: number;
  readonly milestone: boolean;
  readonly selected: boolean;
  readonly readOnly: boolean;
  readonly tooltip: string | null;
}

/**
 * Template context exposed to the `*decafGanttTaskDetail` template, rendered in
 * the side list next to each bar.
 *
 * @property $implicit - The task, so templates can use `let-task`.
 * @property task - The task the row renders.
 * @property taskId - Configured id of the task.
 * @property title - Configured title of the task.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export interface GanttTaskDetailTemplateContext<T> {
  readonly $implicit: T;
  readonly task: T;
  readonly taskId: string;
  readonly title: string;
}

/**
 * Machine-readable codes for problems found by {@link validateGanttModel}:
 * broken identifiers, unreadable dates, out-of-range progress, malformed
 * dependencies and parent/dependency cycles or violations.
 *
 * @category Gantt
 */
export type GanttModelIssueCode =
  | 'invalid-id'
  | 'duplicate-id'
  | 'invalid-date'
  | 'invalid-progress'
  | 'invalid-dependency-type'
  | 'unknown-parent'
  | 'parent-cycle'
  | 'unknown-dependency'
  | 'self-dependency'
  | 'dependency-cycle'
  | 'dependency-violation';

/**
 * One problem found while validating the task model.
 *
 * @property code - Machine-readable issue code.
 * @property taskId - Id of the offending task (empty for unnamed tasks).
 * @property detail - Human-readable explanation of the issue.
 *
 * @category Gantt
 */
export interface GanttModelIssue {
  readonly code: GanttModelIssueCode;
  readonly taskId: string;
  readonly detail: string;
}

/**
 * Builds a {@link GanttConfig} from property names instead of accessor functions.
 *
 * @param fields - Field mapping describing where each projection lives on the task.
 * @returns A config whose accessors read the mapped task properties; `editable` defaults to `true` when the mapped property is unset.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export function ganttConfigFromFields<T extends object>(
  fields: GanttFieldMap<T>,
): GanttConfig<T> {
  const read = <K extends keyof T>(task: T, key: K | undefined): T[K] | undefined =>
    key === undefined ? undefined : task[key];

  return {
    id: (task) => String(read(task, fields.id) ?? ''),
    title: (task) => String(read(task, fields.title) ?? ''),
    start: (task) =>
      read(task, fields.start) as unknown as GanttDateInput | null | undefined,
    end: (task) =>
      read(task, fields.end) as unknown as GanttDateInput | null | undefined,
    progress: (task) =>
      read(task, fields.progress) as unknown as number | null | undefined,
    parent: (task) =>
      read(task, fields.parent) as unknown as string | null | undefined,
    dependencies: (task) =>
      read(task, fields.dependencies) as unknown as
        | readonly GanttDependencyInput[]
        | null
        | undefined,
    milestone: (task) =>
      Boolean(read(task, fields.milestone) as unknown as boolean | undefined),
    color: (task) =>
      read(task, fields.color) as unknown as string | null | undefined,
    editable: (task) =>
      Boolean(
        (read(task, fields.editable) as unknown as
          | boolean
          | null
          | undefined) ?? true,
      ),
    tooltip: (task) =>
      read(task, fields.tooltip) as unknown as string | null | undefined,
  };
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Normalizes a {@link GanttDateInput} into a `Date`.
 *
 * Accepts `Date` instances, epoch seconds or milliseconds, `yyyy-MM-dd` strings
 * (interpreted as local midnight), and other `Date`-parsable strings. Values
 * outside a `yyyy-MM-dd` calendar range (e.g. `2024-02-31`) are rejected.
 *
 * @param value - Raw date value from task data.
 * @returns The normalized date, or `null` when the value is empty or unparsable.
 *
 * @category Gantt
 */
export function normalizeGanttDate(
  value: GanttDateInput | null | undefined,
): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const millis = Math.abs(value) < 1e12 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const dateOnly = DATE_ONLY_PATTERN.exec(trimmed);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const date = new Date(year, month - 1, day);
      if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
      ) {
        return null;
      }
      return date;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats a date as a local `yyyy-MM-dd` string.
 *
 * @param value - Date to format.
 * @returns The formatted date, or `null` when the value is empty or invalid.
 *
 * @category Gantt
 */
export function ganttDateOnly(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * Normalizes a start/end pair into a {@link GanttTaskDateRange}.
 *
 * @param start - Raw start value from task data.
 * @param end - Raw end value from task data.
 * @returns The normalized range; unreadable sides are `null`.
 *
 * @category Gantt
 */
export function toGanttDateRange(
  start: GanttDateInput | null | undefined,
  end: GanttDateInput | null | undefined,
): GanttTaskDateRange {
  const normalizedStart = normalizeGanttDate(start);
  const normalizedEnd = normalizeGanttDate(end);
  return {
    start: normalizedStart,
    end: normalizedEnd,
    startDate: ganttDateOnly(normalizedStart),
    endDate: ganttDateOnly(normalizedEnd),
  };
}

/**
 * Returns a copy of the date shifted by the given number of calendar days.
 *
 * @param value - Base date.
 * @param days - Days to add (may be negative).
 * @returns The shifted copy; the input date is not mutated.
 *
 * @category Gantt
 */
export function addGanttDays(value: Date, days: number): Date {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Returns the local midnight instant of the date's calendar day.
 *
 * @param value - Date to truncate.
 * @returns A new date at local midnight of the same day.
 *
 * @category Gantt
 */
export function startOfGanttDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/**
 * Compares two dates for exact instant equality.
 *
 * @param left - First date.
 * @param right - Second date.
 * @returns `true` when both are the same instant (or both `null`/`undefined`).
 *
 * @category Gantt
 */
export function sameGanttInstant(
  left: Date | null | undefined,
  right: Date | null | undefined,
): boolean {
  if (!left || !right) return left === right;
  return left.getTime() === right.getTime();
}

/**
 * Normalizes a {@link GanttDependencyInput} into a resolved dependency.
 *
 * @param input - Raw dependency value from task data.
 * @returns The normalized id and type (bare strings default to `fs`), or `null` when the input is empty or has no id.
 *
 * @category Gantt
 */
export function ganttDependencyType(
  input: GanttDependencyInput | null | undefined,
): { id: string; type: GanttDependencyType } | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') {
    const id = input.trim();
    return id ? { id, type: 'fs' } : null;
  }
  const id = String(input.id ?? '').trim();
  if (!id) return null;
  const type = input.type ?? 'fs';
  return { id, type };
}

const ISSUE_ORDER: Record<GanttModelIssueCode, number> = {
  'invalid-id': 0,
  'duplicate-id': 1,
  'invalid-date': 2,
  'invalid-progress': 3,
  'invalid-dependency-type': 4,
  'unknown-parent': 5,
  'parent-cycle': 6,
  'unknown-dependency': 7,
  'self-dependency': 8,
  'dependency-cycle': 9,
  'dependency-violation': 10,
};

/**
 * Validates a task model against its {@link GanttConfig} before rendering.
 *
 * Detects empty or duplicate ids, unreadable or inverted dates, out-of-range
 * progress, invalid dependency types, unknown parents/dependencies, parent and
 * dependency cycles, and dependency date violations. Emitted (in stable order)
 * through the component's `modelIssuesChange` output so hosts can surface them
 * without the timeline lying about broken data.
 *
 * @param tasks - Host task list to validate.
 * @param config - Configuration projecting the tasks.
 * @returns The issues found, ordered by task position then issue severity.
 *
 * @typeParam T - Host task type rendered on the timeline.
 * @category Gantt
 */
export function validateGanttModel<T>(
  tasks: readonly T[],
  config: GanttConfig<T>,
): readonly GanttModelIssue[] {
  const issues: GanttModelIssue[] = [];
  const byId = new Map<string, T>();
  const order: string[] = [];

  for (const task of tasks) {
    const id = String(config.id(task) ?? '').trim();
    if (!id) {
      issues.push({
        code: 'invalid-id',
        taskId: '',
        detail: 'A task has an empty identifier.',
      });
      continue;
    }
    if (byId.has(id)) {
      issues.push({
        code: 'duplicate-id',
        taskId: id,
        detail: `Duplicate task identifier "${id}" was ignored.`,
      });
      continue;
    }
    byId.set(id, task);
    order.push(id);
  }

  const dates = new Map<string, { start: Date; end: Date }>();

  for (const id of order) {
    const task = byId.get(id) as T;
    const start = normalizeGanttDate(config.start(task));
    const end = normalizeGanttDate(config.end(task));

    if (!start || !end) {
      issues.push({
        code: 'invalid-date',
        taskId: id,
        detail: `Task "${id}" has an unreadable start or end date.`,
      });
    } else if (end.getTime() < start.getTime()) {
      issues.push({
        code: 'invalid-date',
        taskId: id,
        detail: `Task "${id}" ends before it starts.`,
      });
    } else {
      dates.set(id, { start, end });
    }

    const progress = config.progress?.(task);
    if (
      progress !== null &&
      progress !== undefined &&
      (!Number.isFinite(progress) || progress < 0 || progress > 1)
    ) {
      issues.push({
        code: 'invalid-progress',
        taskId: id,
        detail: `Task "${id}" progress must be between 0 and 1.`,
      });
    }

    const parent = config.parent?.(task);
    if (parent !== null && parent !== undefined) {
      const parentId = String(parent).trim();
      if (parentId) {
        if (parentId === id) {
          issues.push({
            code: 'parent-cycle',
            taskId: id,
            detail: `Task "${id}" cannot be its own parent.`,
          });
        } else if (!byId.has(parentId)) {
          issues.push({
            code: 'unknown-parent',
            taskId: id,
            detail: `Task "${id}" references missing parent "${parentId}".`,
          });
        }
      }
    }
  }

  const parentCycles = new Set<string>();
  for (const id of order) {
    const chain: string[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined = id;

    while (cursor && byId.has(cursor)) {
      if (seen.has(cursor)) {
        const index = chain.indexOf(cursor);
        for (const node of chain.slice(index)) {
          if (parentCycles.has(node)) continue;
          parentCycles.add(node);
          issues.push({
            code: 'parent-cycle',
            taskId: node,
            detail: `Task "${node}" participates in a parent cycle.`,
          });
        }
        break;
      }
      seen.add(cursor);
      chain.push(cursor);
      const parent: string | null | undefined = config.parent?.(
        byId.get(cursor) as T,
      );
      cursor =
        parent === null || parent === undefined
          ? undefined
          : String(parent).trim() || undefined;
    }
  }

  const dependencies = new Map<
    string,
    readonly { id: string; type: GanttDependencyType }[]
  >();

  for (const id of order) {
    const task = byId.get(id) as T;
    const raw = config.dependencies?.(task) ?? [];
    const normalized: { id: string; type: GanttDependencyType }[] = [];

    for (const entry of raw) {
      const dependency = ganttDependencyType(entry);
      if (!dependency) continue;

      if (
        typeof entry === 'object' &&
        entry !== null &&
        entry.type !== undefined &&
        !GANTT_DEPENDENCY_TYPES.includes(entry.type)
      ) {
        issues.push({
          code: 'invalid-dependency-type',
          taskId: id,
          detail: `Task "${id}" dependency "${dependency.id}" has invalid type "${String(entry.type)}".`,
        });
        continue;
      }

      if (dependency.id === id) {
        issues.push({
          code: 'self-dependency',
          taskId: id,
          detail: `Task "${id}" depends on itself.`,
        });
        continue;
      }

      if (!byId.has(dependency.id)) {
        issues.push({
          code: 'unknown-dependency',
          taskId: id,
          detail: `Task "${id}" references missing dependency "${dependency.id}".`,
        });
        continue;
      }

      normalized.push(dependency);
    }

    dependencies.set(id, normalized);
  }

  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): void => {
    state.set(id, 1);
    for (const dependency of dependencies.get(id) ?? []) {
      const next = dependency.id;
      const nextState = state.get(next) ?? 0;
      if (nextState === 1) {
        issues.push({
          code: 'dependency-cycle',
          taskId: id,
          detail: `Dependency cycle detected between "${dependency.id}" and "${id}".`,
        });
      } else if (nextState === 0) {
        visit(next);
      }
    }
    state.set(id, 2);
  };

  for (const id of order) {
    if ((state.get(id) ?? 0) === 0) visit(id);
  }

  for (const id of order) {
    const successor = dates.get(id);
    if (!successor) continue;
    for (const dependency of dependencies.get(id) ?? []) {
      const predecessor = dates.get(dependency.id);
      if (!predecessor) continue;
      const violation =
        (dependency.type === 'fs' &&
          predecessor.end.getTime() > successor.start.getTime()) ||
        (dependency.type === 'ss' &&
          predecessor.start.getTime() > successor.start.getTime()) ||
        (dependency.type === 'ff' &&
          predecessor.end.getTime() > successor.end.getTime()) ||
        (dependency.type === 'sf' &&
          predecessor.start.getTime() > successor.end.getTime());
      if (violation) {
        issues.push({
          code: 'dependency-violation',
          taskId: id,
          detail: `Task "${id}" violates its ${dependency.type.toUpperCase()} dependency on "${dependency.id}".`,
        });
      }
    }
  }

  const indexOf = (taskId: string): number => {
    const index = order.indexOf(taskId);
    return index === -1 ? -1 : index;
  };

  return issues.sort((left, right) => {
    const taskDelta = indexOf(left.taskId) - indexOf(right.taskId);
    if (taskDelta !== 0) return taskDelta;
    const codeDelta = ISSUE_ORDER[left.code] - ISSUE_ORDER[right.code];
    if (codeDelta !== 0) return codeDelta;
    return left.detail.localeCompare(right.detail);
  });
}
