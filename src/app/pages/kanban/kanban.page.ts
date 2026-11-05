import { Component, signal } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import {
  DecafKanbanCardDirective,
  KanbanBoardComponent,
  type KanbanConfig,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from '@decaf-ts/for-angular/kanban';
import { HeaderComponent } from 'src/app/components/header/header.component';

interface DemoTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

const COLUMNS = [
  { id: 'todo', title: 'To do', wipLimit: 4 },
  { id: 'doing', title: 'In progress', wipLimit: 2 },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const INITIAL_TASKS: DemoTask[] = [
  { id: 'task-1', title: 'Draft Kanban API contract', status: 'todo', assignee: 'Ada' },
  { id: 'task-2', title: 'Wire CDK drag/drop', status: 'todo', assignee: 'Grace' },
  { id: 'task-3', title: 'Document keyboard move flow', status: 'todo', assignee: 'Linus' },
  { id: 'task-4', title: 'Project card templates', status: 'doing', assignee: 'Ada' },
  { id: 'task-5', title: 'Enforce WIP limits', status: 'doing', assignee: 'Grace' },
  { id: 'task-6', title: 'Screen reader announcements', status: 'review', assignee: 'Linus' },
  { id: 'task-7', title: 'Phase 2 bundle isolation', status: 'done', assignee: 'Ada' },
];

/**
 * `/kanban` demo page: exercises `KanbanBoardComponent` from
 * `@decaf-ts/for-angular/kanban` with host-owned task state, WIP limits,
 * read-only and loading states, and an add-card playground.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-kanban-page',
  imports: [
    IonContent,
    HeaderComponent,
    TranslatePipe,
    KanbanBoardComponent,
    DecafKanbanCardDirective,
  ],
  templateUrl: './kanban.page.html',
  styleUrl: './kanban.page.scss',
})
export class KanbanPage {
  private nextTaskNumber = INITIAL_TASKS.length + 1;

  protected readonly tasks = signal<DemoTask[]>(INITIAL_TASKS);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly readOnly = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly lastEvent = signal('No board event yet.');

  protected readonly config: KanbanConfig<DemoTask> = {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    columns: COLUMNS,
  };

  protected onMoved(event: TaskMoveEvent<DemoTask>): void {
    this.tasks.update((tasks) => {
      const next = tasks.filter((task) => task.id !== event.task.id);
      const target = next.filter((task) => task.status === event.toColumn);
      const insertAt =
        event.currentIndex >= 0 && event.currentIndex <= target.length
          ? event.currentIndex
          : target.length;
      const moved = { ...event.task, status: event.toColumn };
      const targetIndex = next.findIndex((task) => task.status === event.toColumn);
      const before =
        targetIndex < 0
          ? next.length
          : targetIndex + Math.min(insertAt, target.length);
      next.splice(before, 0, moved);
      return next;
    });
    this.lastEvent.set(`taskMoved: ${event.task.id} -> ${event.toColumn} @ ${event.currentIndex}`);
  }

  protected onReordered(event: TaskReorderEvent<DemoTask>): void {
    this.tasks.update((tasks) => {
      const columnTasks = tasks.filter((task) => task.status === event.column);
      const others = tasks.filter((task) => task.status !== event.column);
      const from = columnTasks.findIndex((task) => task.id === event.task.id);
      if (from < 0) {
        return tasks;
      }
      const reordered = columnTasks.slice();
      const [moved] = reordered.splice(from, 1);
      reordered.splice(
        Math.min(Math.max(event.currentIndex, 0), reordered.length),
        0,
        moved
      );
      return [...others, ...reordered];
    });
    this.lastEvent.set(
      `taskReordered: ${event.task.id} @ ${event.currentIndex}`
    );
  }

  protected onSelected(event: KanbanSelectionEvent<DemoTask>): void {
    this.selectedId.set(event.task.id);
    this.lastEvent.set(`taskSelected: ${event.task.id}`);
  }

  protected onEditRequested(event: KanbanSelectionEvent<DemoTask>): void {
    this.lastEvent.set(`taskEditRequested: ${event.task.id}`);
  }

  protected onRejected(event: TaskMoveRejectedEvent<DemoTask>): void {
    this.lastEvent.set(`taskMoveRejected: ${event.task.id} ${event.reason}`);
  }

  protected onRetry(): void {
    this.error.set(null);
    this.lastEvent.set('retryRequested');
  }

  protected addTask(): void {
    const id = `task-${this.nextTaskNumber++}`;
    this.tasks.update((tasks) => [
      ...tasks,
      {
        id,
        title: `New task ${this.nextTaskNumber - 1}`,
        status: 'todo',
        assignee: 'You',
      },
    ]);
    this.lastEvent.set(`taskAdded: ${id}`);
  }

  protected clear(): void {
    this.tasks.set([]);
    this.lastEvent.set('All tasks cleared.');
  }

  protected reset(): void {
    this.tasks.set(INITIAL_TASKS);
    this.selectedId.set(null);
    this.readOnly.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.lastEvent.set('Board reset.');
  }

  protected toggleReadOnly(): void {
    this.readOnly.update((value) => !value);
  }

  protected toggleLoading(): void {
    this.loading.update((value) => !value);
  }

  protected toggleError(): void {
    this.error.update((value) =>
      value ? null : 'The board could not be loaded. Try again.'
    );
  }
}
