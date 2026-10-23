import type {
  KanbanConfig,
  KanbanMoveRejectionReason,
  KanbanSelectionEvent,
  TaskMoveEvent,
  TaskMoveRejectedEvent,
  TaskReorderEvent,
} from '@decaf-ts/for-angular/kanban';

/** Identifier of the synthetic column used to compose the backlog through `/kanban`. */
export const SCRUM_BACKLOG_COLUMN_ID = 'backlog';

/**
 * Host-owned sprint descriptor. The component only reads the stable `id` and
 * the display `title`; lifecycle state (planned/active/completed) and the rules
 * that govern it stay in the host application.
 */
export interface ScrumSprint {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

/**
 * Scrum configuration. It extends the Kanban contract with the sprint accessor
 * that scopes tasks to a sprint and identifies backlog tasks.
 */
export interface ScrumConfig<T> extends KanbanConfig<T> {
  /** Sprint the task belongs to, or `null`/`undefined`/`''` when it is in the backlog. */
  readonly sprint: (item: T) => string | null | undefined;
}

/** Emitted when the host-controlled sprint selection changes. */
export interface SprintSelectionEvent {
  readonly sprintId: string | null;
}

/** Emitted when a backlog task is ordered by the user. */
export interface BacklogReorderEvent<T> {
  readonly task: T;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/** Deterministic rejection for an ordering operation the component refused. */
export interface BacklogReorderRejectedEvent<T> {
  readonly task: T;
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly reason: KanbanMoveRejectionReason;
}

/** Why an assignment request was refused without mutating host state. */
export type ScrumAssignmentRejectionReason =
  | 'disabled'
  | 'error'
  | 'loading'
  | 'readonly'
  | 'unchanged'
  | 'unknown-sprint';

/** Emitted when the user asks to assign a backlog task to a sprint. */
export interface SprintAssignmentRequestedEvent<T> {
  readonly task: T;
  readonly sprintId: string;
  readonly previousSprintId: string | null;
}

/** Emitted when an assignment request was refused without mutating host state. */
export interface SprintAssignmentRejectedEvent<T> {
  readonly task: T;
  readonly sprintId: string;
  readonly previousSprintId: string | null;
  readonly reason: ScrumAssignmentRejectionReason;
}

/** Sprint board move event, scoped to the sprint the board renders. */
export interface SprintBoardMoveEvent<T> extends TaskMoveEvent<T> {
  readonly sprintId: string;
}

/** Sprint board reorder event, scoped to the sprint the board renders. */
export interface SprintBoardReorderEvent<T> extends TaskReorderEvent<T> {
  readonly sprintId: string;
}

/** Sprint board selection event, scoped to the sprint the board renders. */
export interface SprintBoardSelectionEvent<T> extends KanbanSelectionEvent<T> {
  readonly sprintId: string;
}

/** Sprint board move rejection, scoped to the sprint the board renders. */
export interface SprintBoardMoveRejectedEvent<T> extends TaskMoveRejectedEvent<T> {
  readonly sprintId: string;
}

/**
 * Normalizes the value returned by `ScrumConfig.sprint` to a sprint id or
 * `null` for backlog items. The component never trims or otherwise rewrites a
 * host-provided id; only empty values are treated as "backlog".
 */
export function scrumSprintIdOf<T>(config: ScrumConfig<T>, item: T): string | null {
  const value = config.sprint(item);
  return value === null || value === undefined || value === '' ? null : String(value);
}
