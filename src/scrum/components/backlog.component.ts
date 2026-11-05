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
  type KanbanColumnConfig,
  type KanbanConfig,
  type KanbanFilter,
  type KanbanSelectionEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from '@decaf-ts/for-angular/kanban';
import {
  SCRUM_BACKLOG_COLUMN_ID,
  type BacklogReorderEvent,
  type BacklogReorderRejectedEvent,
  type ScrumAssignmentRejectionReason,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRejectedEvent,
  type SprintAssignmentRequestedEvent,
  scrumSprintIdOf,
} from './scrum.types';

let nextBacklogInstance = 0;

/**
 * Ordered backlog view composed from the `/kanban` board.
 *
 * The component renders a single Kanban column, so pointer drag/drop,
 * keyboard ordering, filtering and selection are the `/kanban` implementation
 * rather than a second copy. Assignment to a sprint is a controlled select:
 * the component emits a request and never changes the task itself.
 */
@Component({
  selector: 'decaf-scrum-backlog',
  standalone: true,
  imports: [NgTemplateOutlet, KanbanBoardComponent, DecafKanbanCardDirective],
  templateUrl: './backlog.component.html',
  styleUrls: ['./backlog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-scrum-backlog-host',
  },
})
export class BacklogComponent<T = unknown> {
  private readonly generatedInstanceId = `decaf-scrum-backlog-${++nextBacklogInstance}`;
  private readonly cardDirective = contentChild(DecafKanbanCardDirective);

  readonly items = input<readonly T[]>([]);
  readonly config = input.required<ScrumConfig<T>>();
  readonly sprints = input<readonly ScrumSprint[]>([]);
  readonly selectedId = input<string | null>(null);
  // eslint-disable-next-line @angular-eslint/no-input-rename -- `readonly` is the documented template binding
  readonly readOnly = input(false, { alias: 'readonly' });
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly filter = input<KanbanFilter<T> | null>(null);
  readonly label = input('Backlog');
  readonly columnTitle = input('Backlog');
  readonly emptyMessage = input('No backlog tasks');
  readonly loadingMessage = input('Loading backlog...');
  readonly errorMessage = input('Unable to load the backlog.');
  readonly retryLabel = input('Retry');
  readonly assignmentLabel = input('Assign to sprint');
  readonly assignmentPlaceholder = input('Select a sprint');
  readonly showDragHandles = input(true);
  readonly instanceId = input('');

  readonly backlogReordered = output<BacklogReorderEvent<T>>();
  readonly backlogReorderRejected = output<BacklogReorderRejectedEvent<T>>();
  readonly sprintAssignmentRequested = output<SprintAssignmentRequestedEvent<T>>();
  readonly sprintAssignmentRejected = output<SprintAssignmentRejectedEvent<T>>();
  readonly taskSelected = output<KanbanSelectionEvent<T>>();
  readonly taskEditRequested = output<KanbanSelectionEvent<T>>();
  readonly selectionCleared = output<void>();
  readonly retryRequested = output<void>();

  readonly resolvedInstanceId = computed(
    () => this.instanceId() || this.generatedInstanceId
  );
  readonly cardTemplate = computed(
    () => this.cardDirective()?.templateRef ?? null
  );
  readonly backlogItems = computed(() =>
    this.items().filter((item) => scrumSprintIdOf(this.config(), item) === null)
  );
  readonly boardConfig = computed<KanbanConfig<T>>(() => {
    const config = this.config();
    const column: KanbanColumnConfig = {
      id: SCRUM_BACKLOG_COLUMN_ID,
      title: this.columnTitle(),
    };
    return {
      id: (item: T) => config.id(item),
      title: (item: T) => config.title(item),
      status: () => SCRUM_BACKLOG_COLUMN_ID,
      columns: [column],
    };
  });
  readonly canAssign = computed(
    () =>
      !this.disabled() &&
      !this.readOnly() &&
      !this.loading() &&
      !this.error()
  );

  titleOf(item: T): string {
    return this.config().title(item);
  }

  sprintIdOf(item: T): string | null {
    return scrumSprintIdOf(this.config(), item);
  }

  onReordered(event: TaskReorderEvent<T>): void {
    this.backlogReordered.emit({
      task: event.task,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }

  onRejected(event: TaskMoveRejectedEvent<T>): void {
    this.backlogReorderRejected.emit({
      task: event.task,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      reason: event.reason,
    });
  }

  onAssign(task: T, event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const requested = select?.value ?? '';
    const previousSprintId = this.sprintIdOf(task);
    if (select) {
      select.value = previousSprintId ?? '';
    }
    const reason = this.assignmentRejectionReason(requested, previousSprintId);
    if (reason) {
      this.sprintAssignmentRejected.emit({
        task,
        sprintId: requested,
        previousSprintId,
        reason,
      });
      return;
    }
    this.sprintAssignmentRequested.emit({
      task,
      sprintId: requested,
      previousSprintId,
    });
  }

  stopInteractivePropagation(event: Event): void {
    event.stopPropagation();
  }

  private assignmentRejectionReason(
    requested: string,
    previousSprintId: string | null
  ): ScrumAssignmentRejectionReason | null {
    if (this.disabled()) {
      return 'disabled';
    }
    if (this.readOnly()) {
      return 'readonly';
    }
    if (this.loading()) {
      return 'loading';
    }
    if (this.error()) {
      return 'error';
    }
    if (!requested || requested === previousSprintId) {
      return 'unchanged';
    }
    if (!this.sprints().some((sprint) => sprint.id === requested)) {
      return 'unknown-sprint';
    }
    return null;
  }
}
