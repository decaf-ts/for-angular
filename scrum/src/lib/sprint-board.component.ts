import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';
import {
  DecafKanbanCardDirective,
  KanbanBoardComponent,
  type KanbanFilter,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from '@decaf-ts/for-angular/kanban';
import {
  type ScrumConfig,
  type SprintBoardMoveEvent,
  type SprintBoardMoveRejectedEvent,
  type SprintBoardReorderEvent,
  type SprintBoardSelectionEvent,
  scrumSprintIdOf,
} from './scrum.types';

/**
 * Sprint status board composed from `/kanban`.
 *
 * Tasks are scoped to the selected sprint through `ScrumConfig.sprint`; the
 * status columns, drag/drop mechanics, keyboard move flow and card templates
 * are the `/kanban` implementation. Every emitted event carries the sprint id
 * so the host can apply the change deterministically.
 */
@Component({
  selector: 'decaf-scrum-sprint-board',
  standalone: true,
  imports: [NgTemplateOutlet, KanbanBoardComponent, DecafKanbanCardDirective],
  templateUrl: './sprint-board.component.html',
  styleUrls: ['./sprint-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-scrum-sprint-board-host',
    '[attr.data-sprint-id]': 'sprintId()',
  },
})
export class SprintBoardComponent<T = unknown> {
  private readonly cardDirective = contentChild(DecafKanbanCardDirective);

  readonly items = input<readonly T[]>([]);
  readonly config = input.required<ScrumConfig<T>>();
  readonly sprintId = input.required<string>();
  readonly selectedId = input<string | null>(null);
  // eslint-disable-next-line @angular-eslint/no-input-rename -- `readonly` is the documented template binding
  readonly readOnly = input(false, { alias: 'readonly' });
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly filter = input<KanbanFilter<T> | null>(null);
  readonly label = input('Sprint board');
  readonly emptyMessage = input('No tasks in this sprint');
  readonly loadingMessage = input('Loading sprint...');
  readonly errorMessage = input('Unable to load the sprint.');
  readonly retryLabel = input('Retry');
  readonly showDragHandles = input(true);
  readonly instanceId = input('');

  readonly taskMoved = output<SprintBoardMoveEvent<T>>();
  readonly taskReordered = output<SprintBoardReorderEvent<T>>();
  readonly taskSelected = output<SprintBoardSelectionEvent<T>>();
  readonly taskEditRequested = output<SprintBoardSelectionEvent<T>>();
  readonly selectionCleared = output<void>();
  readonly taskMoveRejected = output<SprintBoardMoveRejectedEvent<T>>();
  readonly retryRequested = output<void>();

  readonly cardTemplate = computed(
    () => this.cardDirective()?.templateRef ?? null
  );
  readonly scopedItems = computed(() =>
    this.items().filter(
      (item) => scrumSprintIdOf(this.config(), item) === this.sprintId()
    )
  );

  onMoved(event: TaskMoveEvent<T>): void {
    this.taskMoved.emit({ ...event, sprintId: this.sprintId() });
  }

  onReordered(event: TaskReorderEvent<T>): void {
    this.taskReordered.emit({ ...event, sprintId: this.sprintId() });
  }

  onSelected(event: KanbanSelectionEvent<T>): void {
    this.taskSelected.emit({ ...event, sprintId: this.sprintId() });
  }

  onEditRequested(event: KanbanSelectionEvent<T>): void {
    this.taskEditRequested.emit({ ...event, sprintId: this.sprintId() });
  }

  onRejected(event: TaskMoveRejectedEvent<T>): void {
    this.taskMoveRejected.emit({ ...event, sprintId: this.sprintId() });
  }
}
