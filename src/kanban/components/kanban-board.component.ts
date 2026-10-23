import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  TemplateRef,
  afterNextRender,
  computed,
  contentChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  DecafKanbanCardDirective,
  DecafKanbanColumnHeaderDirective,
  DecafKanbanEmptyDirective,
} from './kanban-card.directive';
import { KanbanColumnComponent } from './kanban-column.component';
import {
  KanbanCardKeyboardEvent,
  KanbanCardTemplateContext,
  KanbanColumnConfig,
  KanbanColumnDropEvent,
  KanbanColumnHeaderTemplateContext,
  KanbanConfig,
  KanbanEmptyTemplateContext,
  KanbanFilter,
  KanbanMoveRejectionReason,
  KanbanSelectionEvent,
  TaskMoveEvent,
  TaskMoveRejectedEvent,
  TaskReorderEvent,
} from './kanban.types';
import {
  KanbanPreview,
  applyFilter,
  applyPreview,
  clamp,
  groupByStatus,
  resolveMoveIndices,
} from './kanban-board.utils';

let nextKanbanInstance = 0;

/**
 * Standalone Kanban board rendering host tasks as draggable cards across
 * configured columns, backed by `@angular/cdk/drag-drop`.
 *
 * The board is fully controlled: it never mutates host data. Moves are emitted
 * as {@link TaskMoveEvent} / {@link TaskReorderEvent} for the host to commit,
 * and refused moves (WIP limits, read-only, unknown columns, unchanged drops)
 * are emitted as {@link TaskMoveRejectedEvent} with a rejection reason.
 * Cards support pointer drag-and-drop as well as a keyboard move flow
 * (Space to pick up, arrows to move, Enter to drop, Escape to cancel).
 *
 * Rendering can be customized through the `*decafKanbanCard`,
 * `*decafKanbanColumnHeader` and `*decafKanbanEmpty` template directives.
 *
 * @example
 * ```html
 * <decaf-kanban-board
 *   [items]="tasks"
 *   [config]="kanbanConfig"
 *   [selectedId]="selectedId"
 *   (taskMoved)="moveTask($event)"
 *   (taskMoveRejected)="announce($event.reason)"
 *   (taskSelected)="select($event.task)"
 *   (selectionCleared)="clearSelection()">
 *   <ng-template decafKanbanCard let-task>{{ task.title }}</ng-template>
 * </decaf-kanban-board>
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant Host as Host application
 *   participant Board as KanbanBoardComponent
 *   participant CDK as CDKDragDrop
 *   Host->>Board: items / config inputs
 *   Board->>Board: group + filter columns
 *   Host->>CDK: drags card
 *   CDK->>Board: drop event (lists + indices)
 *   alt move accepted
 *     Board->>Host: taskMoved / taskReordered
 *   else move refused
 *     Board->>Host: taskMoveRejected (reason)
 *   end
 *
 * @template T - Host task type rendered by the board.
 * @category Kanban
 */
@Component({
  selector: 'decaf-kanban-board',
  standalone: true,
  imports: [NgTemplateOutlet, CdkDropListGroup, KanbanColumnComponent],
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-kanban-host',
    '[attr.data-kanban-instance]': 'resolvedInstanceId()',
  },
})
export class KanbanBoardComponent<T = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly generatedInstanceId = `decaf-kanban-${++nextKanbanInstance}`;

  readonly items = input<readonly T[]>([]);
  readonly config = input.required<KanbanConfig<T>>();
  readonly selectedId = input<string | null>(null);
  // eslint-disable-next-line @angular-eslint/no-input-rename -- `readonly` is the documented template binding
  readonly readOnly = input(false, { alias: 'readonly' });
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly filter = input<KanbanFilter<T> | null>(null);
  readonly label = input('Kanban board');
  readonly emptyMessage = input('No tasks');
  readonly loadingMessage = input('Loading tasks...');
  readonly errorMessage = input('Unable to load tasks.');
  readonly retryLabel = input('Retry');
  readonly keyboardHelp = input(
    'Press Space to pick up a card, use the arrow keys to move it, press Enter to select or drop, press Enter again to edit, press E to edit, and Escape to cancel or clear the selection.'
  );
  readonly showDragHandles = input(true);
  readonly instanceId = input('');

  readonly taskMoved = output<TaskMoveEvent<T>>();
  readonly taskReordered = output<TaskReorderEvent<T>>();
  readonly taskSelected = output<KanbanSelectionEvent<T>>();
  readonly taskEditRequested = output<KanbanSelectionEvent<T>>();
  readonly selectionCleared = output<void>();
  readonly taskMoveRejected = output<TaskMoveRejectedEvent<T>>();
  readonly retryRequested = output<void>();

  private readonly keyboardSelectedId = signal<string | null>(null);
  private readonly cardDirective = contentChild(DecafKanbanCardDirective);
  private readonly columnHeaderDirective = contentChild(DecafKanbanColumnHeaderDirective);
  private readonly emptyDirective = contentChild(DecafKanbanEmptyDirective);

  readonly resolvedInstanceId = computed(
    () => this.instanceId() || this.generatedInstanceId
  );
  readonly helpId = computed(() => `${this.resolvedInstanceId()}-keyboard-help`);
  readonly columns = computed<readonly KanbanColumnConfig[]>(() => this.config().columns);
  readonly isReadOnly = computed(() => this.readOnly() || this.disabled());
  readonly isBusy = computed(() => this.loading() || !!this.error());
  readonly dragDisabled = computed(() => this.isReadOnly() || this.isBusy());
  readonly grouped = computed(() => groupByStatus(this.items(), this.config()));
  readonly filtered = computed(() => applyFilter(this.grouped(), this.filter()));
  readonly preview = signal<KanbanPreview<T> | null>(null);
  readonly grabbedId = signal<string | null>(null);
  readonly announcement = signal('');
  readonly visible = computed(() =>
    applyPreview(this.filtered(), this.preview(), (item) => this.config().id(item))
  );
  readonly hasVisibleItems = computed(() => {
    for (const items of this.visible().values()) {
      if (items.length) {
        return true;
      }
    }
    return false;
  });
  readonly columnViews = computed(() =>
    this.columns().map((column) => ({
      column,
      items: this.visible().get(column.id) ?? [],
    }))
  );
  readonly cardTemplate = computed(
    () =>
      (this.cardDirective()?.templateRef ?? null) as TemplateRef<
        KanbanCardTemplateContext<T>
      > | null
  );
  readonly columnHeaderTemplate = computed(
    () =>
      (this.columnHeaderDirective()?.templateRef ?? null) as TemplateRef<
        KanbanColumnHeaderTemplateContext
      > | null
  );
  readonly emptyTemplate = computed(
    () =>
      (this.emptyDirective()?.templateRef ?? null) as TemplateRef<
        KanbanEmptyTemplateContext
      > | null
  );
  readonly boardEmptyContext = computed<KanbanEmptyTemplateContext>(() => ({
    $implicit: null,
    column: null,
    count: 0,
    board: true,
  }));

  taskId(item: T): string {
    return this.config().id(item);
  }

  titleOf(item: T): string {
    return this.config().title(item);
  }

  columnOf(columnId: string): KanbanColumnConfig | undefined {
    return this.columns().find((column) => column.id === columnId);
  }

  columnIdFromDropListId(dropListId: string): string | null {
    const prefix = `${this.resolvedInstanceId()}-`;
    const suffix = '-drop';
    if (!dropListId.startsWith(prefix) || !dropListId.endsWith(suffix)) {
      return null;
    }
    return dropListId.slice(prefix.length, dropListId.length - suffix.length);
  }

  onCardSelected(event: KanbanSelectionEvent<T>): void {
    if (this.disabled()) {
      return;
    }
    this.keyboardSelectedId.set(null);
    this.taskSelected.emit(event);
  }

  onCardEditRequested(event: KanbanSelectionEvent<T>): void {
    if (this.disabled() || this.isReadOnly()) {
      return;
    }
    this.taskEditRequested.emit(event);
  }

  onCardDrop(event: KanbanColumnDropEvent<T>): void {
    const fromColumn = this.columnIdFromDropListId(event.previousDropListId);
    const toColumn = this.columnIdFromDropListId(event.dropListId);
    if (!fromColumn || !toColumn) {
      this.reject(
        event.task,
        fromColumn ?? '',
        toColumn ?? '',
        event.previousIndex,
        event.currentIndex,
        'unknown-column'
      );
      return;
    }
    if (this.dragDisabled()) {
      this.reject(
        event.task,
        fromColumn,
        toColumn,
        event.previousIndex,
        event.currentIndex,
        this.disabled() ? 'disabled' : 'readonly'
      );
      return;
    }
    this.preview.set(null);
    this.grabbedId.set(null);
    const fullSource = this.grouped().get(fromColumn);
    const fullTarget = this.grouped().get(toColumn);
    if (!fullSource || !fullTarget) {
      this.reject(
        event.task,
        fromColumn,
        toColumn,
        event.previousIndex,
        event.currentIndex,
        'unknown-column'
      );
      return;
    }
    const limit = this.columnOf(toColumn)?.wipLimit;
    if (
      fromColumn !== toColumn &&
      limit !== undefined &&
      fullTarget.length >= limit
    ) {
      this.reject(
        event.task,
        fromColumn,
        toColumn,
        event.previousIndex,
        event.currentIndex,
        'wip-limit',
        limit
      );
      return;
    }
    const visibleSource = this.filtered().get(fromColumn) ?? [];
    const visibleTarget = this.filtered().get(toColumn) ?? [];
    const resolved = resolveMoveIndices(
      event.task,
      fromColumn,
      toColumn,
      event.previousIndex,
      event.currentIndex,
      fullSource,
      fullTarget,
      visibleSource,
      visibleTarget,
      (item) => this.config().id(item)
    );
    if (!resolved) {
      this.reject(
        event.task,
        fromColumn,
        toColumn,
        event.previousIndex,
        event.currentIndex,
        'invalid-index'
      );
      return;
    }
    if (
      fromColumn === toColumn &&
      resolved.previousIndex === resolved.currentIndex
    ) {
      this.reject(
        event.task,
        fromColumn,
        toColumn,
        resolved.previousIndex,
        resolved.currentIndex,
        'unchanged'
      );
      return;
    }
    this.commitMove(event.task, fromColumn, toColumn, resolved);
  }

  onCardKeydown(payload: KanbanCardKeyboardEvent<T>): void {
    const { event, task, column, index } = payload;
    const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
    if (this.disabled()) {
      if (isSpace) {
        event.preventDefault();
        this.reject(task, column, column, -1, index, 'disabled');
      }
      return;
    }
    const isEnter = event.key === 'Enter';
    const isEscape = event.key === 'Escape';
    const isArrow =
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight';
    const grabbed = this.grabbedId() === this.config().id(task);
    if (isSpace) {
      event.preventDefault();
      if (grabbed) {
        this.cancelPreview('cancelled');
      } else {
        this.beginGrab(task, column, index);
      }
      return;
    }
    if (grabbed) {
      if (isEscape) {
        event.preventDefault();
        this.cancelPreview('cancelled');
        return;
      }
      if (isEnter) {
        event.preventDefault();
        this.commitPreview();
        return;
      }
      if (isArrow) {
        event.preventDefault();
        this.movePreview(event.key);
        return;
      }
      return;
    }
    if (isEnter) {
      event.preventDefault();
      const taskId = this.config().id(task);
      if (this.keyboardSelectedId() === taskId) {
        this.keyboardSelectedId.set(null);
        this.onCardEditRequested({ task, column });
      } else {
        this.keyboardSelectedId.set(taskId);
        this.taskSelected.emit({ task, column });
      }
      return;
    }
    if (isEscape) {
      event.preventDefault();
      this.keyboardSelectedId.set(null);
      this.selectionCleared.emit();
      return;
    }
    if (event.key === 'e' || event.key === 'E' || event.key === 'F2') {
      event.preventDefault();
      this.onCardEditRequested({ task, column });
      return;
    }
    if (isArrow) {
      event.preventDefault();
      this.focusAdjacent(column, index, event.key);
    }
  }

  private beginGrab(task: T, columnId: string, index: number): void {
    if (this.dragDisabled()) {
      this.reject(
        task,
        columnId,
        columnId,
        -1,
        -1,
        this.disabled() ? 'disabled' : 'readonly'
      );
      return;
    }
    const full = this.grouped().get(columnId) ?? [];
    const fullIndex = full.findIndex((item) => this.config().id(item) === this.config().id(task));
    if (fullIndex < 0) {
      this.reject(task, columnId, columnId, -1, index, 'invalid-index');
      return;
    }
    if (this.preview() && this.preview()?.taskId !== this.config().id(task)) {
      this.preview.set(null);
      this.grabbedId.set(null);
    }
    this.preview.set({
      task,
      taskId: this.config().id(task),
      fromColumn: columnId,
      toColumn: columnId,
      fromVisibleIndex: index,
      toVisibleIndex: index,
    });
    this.grabbedId.set(this.config().id(task));
    this.announce(
      `${this.titleOf(task)} picked up in ${
        this.columnOf(columnId)?.title ?? columnId
      }. Use the arrow keys to move, Enter to drop, Escape to cancel.`
    );
    this.focusTaskAfterRender(this.config().id(task));
  }

  private movePreview(key: string): void {
    const preview = this.preview();
    if (!preview) {
      return;
    }
    const columns = this.columns();
    const targetColumnIndex = columns.findIndex((column) => column.id === preview.toColumn);
    if (targetColumnIndex < 0) {
      this.cancelPreview('unknown-column');
      return;
    }
    const lists = this.filtered();
    const currentList = lists.get(preview.toColumn) ?? [];
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const delta = key === 'ArrowUp' ? -1 : 1;
      const max =
        preview.fromColumn === preview.toColumn
          ? Math.max(currentList.length - 1, 0)
          : currentList.length;
      const next = clamp(preview.toVisibleIndex + delta, 0, max);
      if (next === preview.toVisibleIndex) {
        return;
      }
      this.preview.set({ ...preview, toVisibleIndex: next });
      this.announce(
        `${this.titleOf(preview.task)}: ${
          this.columnOf(preview.toColumn)?.title ?? preview.toColumn
        }, position ${next + 1}.`
      );
      this.focusTaskAfterRender(preview.taskId);
      return;
    }
    const direction = key === 'ArrowLeft' ? -1 : 1;
    const nextColumnIndex = clamp(
      targetColumnIndex + direction,
      0,
      columns.length - 1
    );
    if (nextColumnIndex === targetColumnIndex) {
      return;
    }
    const nextColumn = columns[nextColumnIndex];
    const limit = nextColumn.wipLimit;
    const targetCount = (this.grouped().get(nextColumn.id) ?? []).length;
    if (
      nextColumn.id !== preview.fromColumn &&
      limit !== undefined &&
      targetCount >= limit
    ) {
      this.reject(
        preview.task,
        preview.fromColumn,
        nextColumn.id,
        -1,
        clamp(preview.toVisibleIndex, 0, targetCount),
        'wip-limit',
        limit
      );
      return;
    }
    const nextIndex = clamp(
      preview.toVisibleIndex,
      0,
      (lists.get(nextColumn.id) ?? []).length
    );
    this.preview.set({
      ...preview,
      toColumn: nextColumn.id,
      toVisibleIndex: nextIndex,
    });
    this.announce(
      `${this.titleOf(preview.task)}: ${nextColumn.title}, position ${nextIndex + 1}.`
    );
    this.focusTaskAfterRender(preview.taskId);
  }

  private commitPreview(): void {
    const preview = this.preview();
    if (!preview) {
      return;
    }
    const fullSource = this.grouped().get(preview.fromColumn);
    const fullTarget = this.grouped().get(preview.toColumn);
    if (!fullSource || !fullTarget) {
      this.cancelPreview('unknown-column');
      return;
    }
    const limit = this.columnOf(preview.toColumn)?.wipLimit;
    if (
      preview.fromColumn !== preview.toColumn &&
      limit !== undefined &&
      fullTarget.length >= limit
    ) {
      this.cancelPreview('wip-limit', limit);
      return;
    }
    const visibleSource = this.filtered().get(preview.fromColumn) ?? [];
    const visibleTarget = this.filtered().get(preview.toColumn) ?? [];
    const resolved = resolveMoveIndices(
      preview.task,
      preview.fromColumn,
      preview.toColumn,
      preview.fromVisibleIndex,
      preview.toVisibleIndex,
      fullSource,
      fullTarget,
      visibleSource,
      visibleTarget,
      (item) => this.config().id(item)
    );
    const fromColumn = preview.fromColumn;
    const toColumn = preview.toColumn;
    if (!resolved) {
      this.cancelPreview('invalid-index');
      return;
    }
    if (fromColumn === toColumn && resolved.previousIndex === resolved.currentIndex) {
      this.cancelPreview('unchanged');
      return;
    }
    this.preview.set(null);
    this.grabbedId.set(null);
    this.commitMove(preview.task, fromColumn, toColumn, resolved);
  }

  private commitMove(
    task: T,
    fromColumn: string,
    toColumn: string,
    resolved: { previousIndex: number; currentIndex: number }
  ): void {
    if (fromColumn === toColumn) {
      this.taskReordered.emit({
        task,
        column: fromColumn,
        previousIndex: resolved.previousIndex,
        currentIndex: resolved.currentIndex,
      });
    } else {
      this.taskMoved.emit({
        task,
        fromColumn,
        toColumn,
        previousIndex: resolved.previousIndex,
        currentIndex: resolved.currentIndex,
      });
    }
    this.announce(
      `${this.titleOf(task)} moved to ${
        this.columnOf(toColumn)?.title ?? toColumn
      }, position ${resolved.currentIndex + 1}.`
    );
    this.focusTaskAfterRender(this.config().id(task));
  }

  private cancelPreview(
    reason: KanbanMoveRejectionReason,
    wipLimit?: number
  ): void {
    const preview = this.preview();
    if (!preview) {
      return;
    }
    const previousIndex = (this.grouped().get(preview.fromColumn) ?? []).findIndex(
      (item) => this.config().id(item) === preview.taskId
    );
    this.reject(
      preview.task,
      preview.fromColumn,
      preview.toColumn,
      previousIndex,
      preview.fromColumn === preview.toColumn ? previousIndex : -1,
      reason,
      wipLimit
    );
    this.preview.set(null);
    this.grabbedId.set(null);
    this.focusTaskNow(preview.taskId);
  }

  private reject(
    task: T,
    fromColumn: string,
    toColumn: string,
    previousIndex: number,
    currentIndex: number,
    reason: KanbanMoveRejectionReason,
    wipLimit?: number
  ): void {
    const event: TaskMoveRejectedEvent<T> = {
      task,
      fromColumn,
      toColumn,
      previousIndex,
      currentIndex,
      reason,
    };
    this.taskMoveRejected.emit(
      wipLimit === undefined ? event : { ...event, wipLimit }
    );
    this.announce(this.rejectionMessage(task, toColumn, reason, wipLimit));
  }

  private rejectionMessage(
    task: T,
    toColumn: string,
    reason: KanbanMoveRejectionReason,
    wipLimit?: number
  ): string {
    const title = this.titleOf(task);
    const column = this.columnOf(toColumn)?.title ?? toColumn;
    switch (reason) {
      case 'wip-limit':
        return `Cannot move ${title} to ${column}: the work-in-progress limit${
          wipLimit === undefined ? '' : ` of ${wipLimit}`
        } is reached.`;
      case 'readonly':
        return `Cannot move ${title}: the board is read-only.`;
      case 'disabled':
        return `Cannot move ${title}: the board is disabled.`;
      case 'unchanged':
        return `${title} was not moved.`;
      case 'cancelled':
        return `Move cancelled. ${title} was not moved.`;
      case 'unknown-column':
        return `Cannot move ${title}: unknown column.`;
      case 'invalid-index':
        return `Cannot move ${title}: invalid drop position.`;
      default:
        return `Cannot move ${title}.`;
    }
  }

  private focusAdjacent(
    columnId: string,
    index: number,
    key: string
  ): void {
    const columns = this.columns();
    const lists = this.visible();
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const list = lists.get(columnId) ?? [];
      if (!list.length) {
        return;
      }
      const next = clamp(index + (key === 'ArrowUp' ? -1 : 1), 0, list.length - 1);
      if (next !== index) {
        this.focusTaskNow(this.config().id(list[next]));
      }
      return;
    }
    const columnIndex = columns.findIndex((column) => column.id === columnId);
    if (columnIndex < 0) {
      return;
    }
    const nextColumnIndex = clamp(
      columnIndex + (key === 'ArrowLeft' ? -1 : 1),
      0,
      columns.length - 1
    );
    if (nextColumnIndex === columnIndex) {
      return;
    }
    const nextColumn = columns[nextColumnIndex];
    const list = lists.get(nextColumn.id) ?? [];
    if (!list.length) {
      this.announce(`${nextColumn.title} is empty.`);
      return;
    }
    const next = clamp(index, 0, list.length - 1);
    this.focusTaskNow(this.config().id(list[next]));
  }

  private focusTaskNow(taskId: string): void {
    if (!this.isBrowser) {
      return;
    }
    const cards = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '[data-kanban-task-id]'
    );
    for (const card of Array.from(cards)) {
      if (card.dataset['kanbanTaskId'] === taskId) {
        card.focus();
        return;
      }
    }
  }

  private focusTaskAfterRender(taskId: string): void {
    if (!this.isBrowser) {
      return;
    }
    afterNextRender(
      () => this.focusTaskNow(taskId),
      { injector: this.injector }
    );
  }

  private announce(message: string): void {
    this.announcement.set(message);
  }
}
