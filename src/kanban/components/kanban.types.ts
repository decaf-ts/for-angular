/**
 * Reasons a card move was rejected by the board before being committed.
 *
 * @category Kanban
 */
export type KanbanMoveRejectionReason =
  | 'cancelled'
  | 'disabled'
  | 'invalid-index'
  | 'readonly'
  | 'unchanged'
  | 'unknown-column'
  | 'wip-limit';

/**
 * Static definition of one Kanban column.
 *
 * @property id - Stable column identifier referenced by {@link KanbanConfig.status} values.
 * @property title - Human-readable column title rendered in the column header.
 * @property wipLimit - Maximum number of cards allowed in the column; extra drops are rejected with `wip-limit`.
 *
 * @category Kanban
 */
export interface KanbanColumnConfig {
  readonly id: string;
  readonly title: string;
  readonly wipLimit?: number;
}

/**
 * Typed configuration contract for the Kanban board.
 *
 * The board is data-driven: accessors project host items into the strings the
 * renderer needs, so no task shape is imposed on consumers.
 *
 * @property id - Stable unique identifier of a task.
 * @property title - Display title of a task.
 * @property status - Column id the task currently belongs to.
 * @property columns - Ordered column definitions of the board.
 * @property swimlane - Optional swimlane id; tasks sharing a swimlane are grouped horizontally.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface KanbanConfig<T> {
  readonly id: (item: T) => string;
  readonly title: (item: T) => string;
  readonly status: (item: T) => string;
  readonly columns: readonly KanbanColumnConfig[];
  readonly swimlane?: (item: T) => string | undefined;
}

/**
 * Emitted after a card was moved or reordered and the board accepted the move.
 *
 * @property task - The moved task.
 * @property fromColumn - Column id the task was dragged from (equals `toColumn` for reorders).
 * @property toColumn - Column id the task was dropped into.
 * @property previousIndex - Index within the source column before the move.
 * @property currentIndex - Index within the target column after the move.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface TaskMoveEvent<T> {
  readonly task: T;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * Emitted after a card was reordered within a single column.
 *
 * @property task - The reordered task.
 * @property column - Column id the task stays in.
 * @property previousIndex - Index within the column before the reorder.
 * @property currentIndex - Index within the column after the reorder.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface TaskReorderEvent<T> {
  readonly task: T;
  readonly column: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
}

/**
 * Emitted when a card is selected (single click) or an edit is requested (double click / `E`).
 *
 * @property task - The selected task.
 * @property column - Column id the task was in when selected.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface KanbanSelectionEvent<T> {
  readonly task: T;
  readonly column: string;
}

/**
 * Emitted when a drag-and-drop or keyboard move was rejected.
 *
 * The board never mutates host data; it only reports the attempted move and why
 * it was refused so the host can surface feedback.
 *
 * @property task - The task the move was attempted for.
 * @property fromColumn - Column id the task was dragged from.
 * @property toColumn - Column id the task was dropped into (empty when unknown).
 * @property previousIndex - Index within the source column before the move.
 * @property currentIndex - Index within the target column after the move.
 * @property reason - Why the move was refused.
 * @property wipLimit - The WIP limit that was hit, when {@link KanbanMoveRejectionReason}`'wip-limit'`.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface TaskMoveRejectedEvent<T> {
  readonly task: T;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly reason: KanbanMoveRejectionReason;
  readonly wipLimit?: number;
}

/**
 * Template context exposed to the `*decafKanbanCard` template.
 *
 * @property $implicit - The task, so templates can use `let-task`.
 * @property task - The task being rendered.
 * @property column - Column the task is rendered in.
 * @property index - Zero-based position of the card within its column.
 * @property selected - Whether the card is currently selected.
 * @property readOnly - Whether the board is in read-only mode.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface KanbanCardTemplateContext<T> {
  readonly $implicit: T;
  readonly task: T;
  readonly column: KanbanColumnConfig;
  readonly index: number;
  readonly selected: boolean;
  readonly readOnly: boolean;
}

/**
 * Template context exposed to the `*decafKanbanColumnHeader` template.
 *
 * @property $implicit - The column config, so templates can use `let-column`.
 * @property column - The column being rendered.
 * @property count - Number of visible cards in the column.
 * @property wipLimit - The column WIP limit, when defined.
 * @property readOnly - Whether the board is in read-only mode.
 *
 * @category Kanban
 */
export interface KanbanColumnHeaderTemplateContext {
  readonly $implicit: KanbanColumnConfig;
  readonly column: KanbanColumnConfig;
  readonly count: number;
  readonly wipLimit?: number;
  readonly readOnly: boolean;
}

/**
 * Template context exposed to the `*decafKanbanEmpty` template.
 *
 * Rendered per empty column and, with `board: true`, once when the whole board
 * has no visible cards.
 *
 * @property $implicit - The empty column, or `null` for the board-level empty state.
 * @property column - The empty column, or `null` for the board-level empty state.
 * @property count - Number of visible cards in the column (0 when board-level).
 * @property board - Whether this context describes the whole board rather than one column.
 *
 * @category Kanban
 */
export interface KanbanEmptyTemplateContext {
  readonly $implicit: KanbanColumnConfig | null;
  readonly column: KanbanColumnConfig | null;
  readonly count: number;
  readonly board: boolean;
}

/**
 * Raw keyboard interaction on a card, forwarded to the board for its built-in
 * keyboard move flow.
 *
 * @property event - The original keyboard event.
 * @property task - The focused task.
 * @property column - Column id the task was in.
 * @property index - Zero-based position of the card within its column.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface KanbanCardKeyboardEvent<T> {
  readonly event: KeyboardEvent;
  readonly task: T;
  readonly column: string;
  readonly index: number;
}

/**
 * Internal drag-and-drop payload emitted by a column, consumed by the board.
 *
 * @property previousDropListId - CDK drop-list id the drag started from.
 * @property dropListId - CDK drop-list id the drag ended in.
 * @property previousIndex - Index within the source drop list.
 * @property currentIndex - Index within the target drop list.
 * @property task - The dragged task.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface KanbanColumnDropEvent<T> {
  readonly previousDropListId: string;
  readonly dropListId: string;
  readonly previousIndex: number;
  readonly currentIndex: number;
  readonly task: T;
}

/**
 * Callback the host can invoke to retry a failed load after surfacing an error state.
 *
 * @category Kanban
 */
export type KanbanRetryHandler = () => void;

/**
 * Predicate deciding whether a task is visible on the board; tasks it rejects stay in the data but are hidden.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export type KanbanFilter<T> = (item: T) => boolean;

/**
 * Declarative field mapping used by {@link kanbanConfigFromFields} to derive a
 * {@link KanbanConfig} from property names instead of accessors.
 *
 * @property id - Property holding the task id.
 * @property title - Property holding the display title.
 * @property status - Property holding the column id.
 * @property swimlane - Property holding the optional swimlane id.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export interface KanbanFieldMap<T> {
  readonly id: keyof T;
  readonly title: keyof T;
  readonly status: keyof T;
  readonly swimlane?: keyof T;
}

function fieldToString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Builds a {@link KanbanConfig} from property names instead of accessor functions.
 *
 * @param fields - Field mapping describing where id, title, status and swimlane live on the task.
 * @param columns - Ordered column definitions of the board.
 * @returns A config whose accessors read (and stringify) the mapped task properties.
 *
 * @typeParam T - Host task type rendered by the board.
 * @category Kanban
 */
export function kanbanConfigFromFields<T extends object>(
  fields: KanbanFieldMap<T>,
  columns: readonly KanbanColumnConfig[]
): KanbanConfig<T> {
  const config: KanbanConfig<T> = {
    id: (item: T) => fieldToString(item[fields.id]),
    title: (item: T) => fieldToString(item[fields.title]),
    status: (item: T) => fieldToString(item[fields.status]),
    columns,
  };
  if (fields.swimlane) {
    const swimlane = fields.swimlane;
    return {
      ...config,
      swimlane: (item: T) => {
        const value = item[swimlane];
        return value === null || value === undefined ? undefined : String(value);
      },
    };
  }
  return config;
}
