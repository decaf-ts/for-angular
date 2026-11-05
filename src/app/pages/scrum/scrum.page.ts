import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import {
  BacklogComponent,
  SprintBoardComponent,
  SprintSelectorComponent,
  type BacklogReorderEvent,
  type BacklogReorderRejectedEvent,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRejectedEvent,
  type SprintAssignmentRequestedEvent,
  type SprintBoardMoveEvent,
  type SprintBoardMoveRejectedEvent,
  type SprintBoardReorderEvent,
  type SprintSelectionEvent,
} from '@decaf-ts/for-angular/scrum';
import { HeaderComponent } from 'src/app/components/header/header.component';

interface DemoTask {
  id: string;
  title: string;
  status: string;
  sprintId: string | null;
  assignee: string;
}

const COLUMNS = [
  { id: 'todo', title: 'To do', wipLimit: 4 },
  { id: 'doing', title: 'In progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const SPRINTS: ScrumSprint[] = [
  { id: 'sprint-1', title: 'Sprint 1 — Now' },
  { id: 'sprint-2', title: 'Sprint 2 — Next' },
  { id: 'sprint-3', title: 'Sprint 3 — Later' },
];

const INITIAL_TASKS: DemoTask[] = [
  { id: 'task-1', title: 'Refine backlog ordering rules', status: 'todo', sprintId: null, assignee: 'Ada' },
  { id: 'task-2', title: 'Document sprint scoping contract', status: 'todo', sprintId: null, assignee: 'Grace' },
  { id: 'task-3', title: 'Triage sprint assignment feedback', status: 'todo', sprintId: null, assignee: 'Linus' },
  { id: 'task-4', title: 'Align filter predicates with search', status: 'todo', sprintId: null, assignee: 'Ada' },
  { id: 'task-5', title: 'Compose sprint board from Kanban', status: 'done', sprintId: 'sprint-1', assignee: 'Ada' },
  { id: 'task-6', title: 'Reuse Kanban drag/drop mechanics', status: 'doing', sprintId: 'sprint-1', assignee: 'Grace' },
  { id: 'task-7', title: 'Sprint selector keyboard flow', status: 'review', sprintId: 'sprint-1', assignee: 'Linus' },
  { id: 'task-8', title: 'Typed sprint assignment events', status: 'todo', sprintId: 'sprint-1', assignee: 'Ada' },
  { id: 'task-9', title: 'Velocity follow-on spike', status: 'todo', sprintId: 'sprint-2', assignee: 'Grace' },
  { id: 'task-10', title: 'Backlog grooming session', status: 'doing', sprintId: 'sprint-2', assignee: 'Linus' },
];

@Component({
  selector: 'app-scrum-page',
  imports: [
    IonContent,
    HeaderComponent,
    SprintSelectorComponent,
    BacklogComponent,
    SprintBoardComponent,
  ],
  templateUrl: './scrum.page.html',
  styleUrl: './scrum.page.scss',
})
export class ScrumPage {
  @ViewChild('scrumContent', { read: ElementRef })
  private content?: ElementRef<HTMLElement>;
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tasks = signal<DemoTask[]>(INITIAL_TASKS);
  protected readonly sprints = SPRINTS;
  protected readonly selectedSprintId = signal<string | null>('sprint-1');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly readOnly = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly lastEvent = signal('No scrum event yet.');

  constructor() {
    afterNextRender(() => {
      const element = this.content?.nativeElement;
      if (!element) {
        return;
      }
      const stripMainLandmark = () => {
        if (element.getAttribute('role') === 'main') {
          element.removeAttribute('role');
        }
      };
      stripMainLandmark();
      const observer = new MutationObserver(stripMainLandmark);
      observer.observe(element, { attributes: true, attributeFilter: ['role'] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected readonly config: ScrumConfig<DemoTask> = {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    sprint: (task) => task.sprintId,
    columns: COLUMNS,
  };

  protected readonly filter = computed<((task: DemoTask) => boolean) | null>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return null;
    }
    return (task: DemoTask) =>
      task.title.toLowerCase().includes(term) ||
      task.assignee.toLowerCase().includes(term);
  });

  protected onSprintSelected(event: SprintSelectionEvent): void {
    this.selectedSprintId.set(event.sprintId);
    this.lastEvent.set(`sprintSelected: ${event.sprintId ?? 'none'}`);
  }

  protected onBacklogReordered(event: BacklogReorderEvent<DemoTask>): void {
    this.tasks.update((tasks) =>
      reorderWithin(tasks, event.task.id, (task) => !task.sprintId, event.currentIndex)
    );
    this.lastEvent.set(
      `backlogReordered: ${event.task.id} @ ${event.currentIndex}`
    );
  }

  protected onBacklogRejected(event: BacklogReorderRejectedEvent<DemoTask>): void {
    this.lastEvent.set(
      `backlogReorderRejected: ${event.task.id} ${event.reason}`
    );
  }

  protected onAssignmentRequested(
    event: SprintAssignmentRequestedEvent<DemoTask>
  ): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === event.task.id ? { ...task, sprintId: event.sprintId } : task
      )
    );
    this.lastEvent.set(
      `sprintAssignmentRequested: ${event.task.id} -> ${event.sprintId}`
    );
  }

  protected onAssignmentRejected(
    event: SprintAssignmentRejectedEvent<DemoTask>
  ): void {
    this.lastEvent.set(
      `sprintAssignmentRejected: ${event.task.id} ${event.reason}`
    );
  }

  protected onMoved(event: SprintBoardMoveEvent<DemoTask>): void {
    this.tasks.update((tasks) =>
      moveWithin(tasks, event.task.id, event.sprintId, event.toColumn, event.currentIndex)
    );
    this.lastEvent.set(
      `taskMoved: ${event.task.id} -> ${event.toColumn} @ ${event.currentIndex}`
    );
  }

  protected onReordered(event: SprintBoardReorderEvent<DemoTask>): void {
    this.tasks.update((tasks) =>
      reorderWithin(
        tasks,
        event.task.id,
        (task) => task.sprintId === event.sprintId && task.status === event.column,
        event.currentIndex
      )
    );
    this.lastEvent.set(
      `taskReordered: ${event.task.id} @ ${event.currentIndex}`
    );
  }

  protected onSelected(event: { task: DemoTask }): void {
    this.selectedId.set(event.task.id);
    this.lastEvent.set(`taskSelected: ${event.task.id}`);
  }

  protected onEditRequested(event: { task: DemoTask }): void {
    this.lastEvent.set(`taskEditRequested: ${event.task.id}`);
  }

  protected onSelectionCleared(): void {
    this.selectedId.set(null);
    this.lastEvent.set('selectionCleared');
  }

  protected onBoardRejected(event: SprintBoardMoveRejectedEvent<DemoTask>): void {
    this.lastEvent.set(`taskMoveRejected: ${event.task.id} ${event.reason}`);
  }

  protected onRetry(): void {
    this.error.set(null);
    this.lastEvent.set('retryRequested');
  }

  protected reset(): void {
    this.tasks.set(INITIAL_TASKS);
    this.selectedSprintId.set('sprint-1');
    this.selectedId.set(null);
    this.search.set('');
    this.readOnly.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.lastEvent.set('Scrum demo reset.');
  }

  protected toggleReadOnly(): void {
    this.readOnly.update((value) => !value);
  }

  protected toggleLoading(): void {
    this.loading.update((value) => !value);
  }

  protected toggleError(): void {
    this.error.update((value) =>
      value ? null : 'The sprint could not be loaded. Try again.'
    );
  }
}

function reorderWithin(
  tasks: DemoTask[],
  taskId: string,
  matches: (task: DemoTask) => boolean,
  currentIndex: number
): DemoTask[] {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) {
    return tasks;
  }
  const next = tasks.slice();
  const [task] = next.splice(index, 1);
  const group = next.filter(matches);
  const insertAt = Math.min(Math.max(currentIndex, 0), group.length);
  const anchor = group[insertAt];
  const targetIndex = anchor
    ? next.findIndex((candidate) => candidate.id === anchor.id)
    : lastMatchingIndex(next, matches) + 1;
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, task);
  return next;
}

function lastMatchingIndex(
  tasks: DemoTask[],
  matches: (task: DemoTask) => boolean
): number {
  for (let index = tasks.length - 1; index >= 0; index -= 1) {
    if (matches(tasks[index])) {
      return index;
    }
  }
  return -1;
}

function moveWithin(
  tasks: DemoTask[],
  taskId: string,
  sprintId: string,
  status: string,
  currentIndex: number
): DemoTask[] {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) {
    return tasks;
  }
  const next = tasks.slice();
  const [task] = next.splice(index, 1);
  const moved = { ...task, status };
  const group = next.filter(
    (candidate) => candidate.sprintId === sprintId && candidate.status === status
  );
  const insertAt = Math.min(Math.max(currentIndex, 0), group.length);
  const anchor = group[insertAt];
  const targetIndex = anchor
    ? next.findIndex((candidate) => candidate.id === anchor.id)
    : lastMatchingIndex(
        next,
        (candidate) => candidate.sprintId === sprintId && candidate.status === status
      ) + 1;
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, moved);
  return next;
}
