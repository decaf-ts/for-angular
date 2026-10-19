# `@decaf-ts/for-angular/scrum`

Backlog and sprint views for task-management screens. The entry point **composes**
the [`/kanban`](../kanban) board instead of shipping a second drag/drop engine: the
sprint board renders Kanban status columns and the backlog renders a single Kanban
column, so ordering, cross-column movement, keyboard operation, selection and
filtering all come from one implementation.

## Install

```bash
npm install @decaf-ts/for-angular @angular/cdk@^21.2.14
```

`/scrum` renders through `/kanban`, so it needs the same optional peers as that
entry point. `@angular/cdk` remains the **only** feature peer involved: the
`/scrum` entry point adds **no new runtime dependency** of its own and imports
nothing except `@angular/*`, `@decaf-ts/for-angular` core and
`@decaf-ts/for-angular/kanban`.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@angular/cdk` | `^21.2.14` (optional peer of `/kanban`) |
| `@decaf-ts/for-angular` | `1.0.x` |

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

## Controlled-view contract

The components are presentation only. They never mutate a task, call an API or
change sprint lifecycle state. The host owns:

- the task list, sprint list and selected sprint;
- the mapping from a task to its sprint (`ScrumConfig.sprint`) and status
  (`KanbanConfig.status`);
- what happens after a reorder, move or assignment request;
- sprint lifecycle policy (planned → active → completed).

`loading`, `error`, `readonly` and `disabled` are host-controlled inputs and are
forwarded to the underlying Kanban board. When an interaction is refused the
component emits a typed rejection event; it never applies the change silently.

## Usage

```ts
import { Component, computed, signal } from '@angular/core';
import {
  BacklogComponent,
  SprintBoardComponent,
  SprintSelectorComponent,
  type ScrumConfig,
  type ScrumSprint,
  type SprintAssignmentRequestedEvent,
  type SprintBoardMoveEvent,
  type BacklogReorderEvent,
} from '@decaf-ts/for-angular/scrum';

interface Task {
  id: string;
  title: string;
  status: string;
  sprintId: string | null;
}

const STATUS_COLUMNS = [
  { id: 'todo', title: 'To do', wipLimit: 4 },
  { id: 'doing', title: 'In progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

@Component({
  standalone: true,
  imports: [SprintSelectorComponent, BacklogComponent, SprintBoardComponent],
  template: `
    <decaf-sprint-selector
      [sprints]="sprints"
      [selectedSprintId]="selectedSprintId()"
      (sprintSelected)="selectedSprintId.set($event.sprintId)"
    />

    <decaf-scrum-backlog
      [items]="tasks()"
      [config]="config"
      [sprints]="sprints"
      [readonly]="readOnly()"
      [loading]="loading()"
      [error]="error()"
      (backlogReordered)="onBacklogReordered($event)"
      (sprintAssignmentRequested)="onAssign($event)"
      (taskSelected)="select($event.task.id)"
    />

    @if (selectedSprintId(); as sprintId) {
      <decaf-scrum-sprint-board
        [items]="tasks()"
        [config]="config"
        [sprintId]="sprintId"
        [readonly]="readOnly()"
        [loading]="loading()"
        [error]="error()"
        (taskMoved)="onMoved($event)"
        (taskReordered)="onReordered($event)"
        (taskSelected)="select($event.task.id)"
      />
    }
  `,
})
export class ProjectBoardComponent {
  readonly tasks = signal<Task[]>([]);
  readonly sprints: ScrumSprint[] = [
    { id: 'sprint-1', title: 'Sprint 1' },
    { id: 'sprint-2', title: 'Sprint 2' },
  ];
  readonly selectedSprintId = signal<string | null>(null);
  readonly selectedTaskId = signal<string | null>(null);
  readonly readOnly = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly config: ScrumConfig<Task> = {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    sprint: (task) => task.sprintId,
    columns: STATUS_COLUMNS,
  };

  select(taskId: string): void {
    this.selectedTaskId.set(taskId);
  }

  onBacklogReordered(event: BacklogReorderEvent<Task>): void {
    this.tasks.update((tasks) => reorder(tasks, event.task.id, event.currentIndex));
  }

  onAssign(event: SprintAssignmentRequestedEvent<Task>): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === event.task.id ? { ...task, sprintId: event.sprintId } : task
      )
    );
  }

  onMoved(event: SprintBoardMoveEvent<Task>): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === event.task.id ? { ...task, status: event.toColumn } : task
      )
    );
  }

  onReordered(event: { task: Task; column: string; currentIndex: number }): void {
    this.tasks.update((tasks) => reorder(tasks, event.task.id, event.currentIndex));
  }
}

function reorder(tasks: Task[], taskId: string, currentIndex: number): Task[] {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) {
    return tasks;
  }
  const next = tasks.slice();
  const [task] = next.splice(index, 1);
  next.splice(Math.min(Math.max(currentIndex, 0), next.length), 0, task);
  return next;
}
```

### Custom cards

Both views forward a projected card template to the Kanban board, so existing
Decaf summary/model renderers can be reused:

```html
<decaf-scrum-sprint-board [items]="tasks" [config]="config" [sprintId]="sprintId">
  <ng-template decafKanbanCard let-task let-column="column">
    <strong>{{ task.title }}</strong>
    <span>{{ column.title }}</span>
  </ng-template>
</decaf-scrum-sprint-board>
```

The backlog card template only replaces the task summary; the sprint-assignment
control is always rendered by `BacklogComponent` beneath the template.

## API summary

| Component | Inputs | Outputs |
| --- | --- | --- |
| `SprintSelectorComponent` | `sprints`, `selectedSprintId`, `label`, `placeholder`, `disabled`, `loading` | `sprintSelected` |
| `BacklogComponent` | `items`, `config`, `sprints`, `selectedId`, `readonly`, `disabled`, `loading`, `error`, `filter`, `label`, `columnTitle`, messages | `backlogReordered`, `backlogReorderRejected`, `sprintAssignmentRequested`, `sprintAssignmentRejected`, `taskSelected`, `taskEditRequested`, `retryRequested` |
| `SprintBoardComponent` | `items`, `config`, `sprintId`, `selectedId`, `readonly`, `disabled`, `loading`, `error`, `filter`, `label`, messages | `taskMoved`, `taskReordered`, `taskSelected`, `taskEditRequested`, `taskMoveRejected`, `retryRequested` |

`BacklogComponent` and `SprintBoardComponent` accept the same `filter` predicate
as `/kanban`, so a host search box can feed both views. Selection events identify
the task and the column; sprint-board events also carry `sprintId`.

## Bundle composition

`/scrum` imports `KanbanBoardComponent`, the Kanban column/card components and
their published types. It contains no CDK drop-list setup, no duplicate card
renderer and no second drag/drop state machine. A consumer importing `/scrum`
therefore loads one shared `/kanban` chunk; it does not embed a copy of the
Kanban implementation.

Adding `/scrum` does not pull `/gantt`, `/diagrams`, `/charts`, `/code-editor`,
`/math`, `/barcode`, `/model-builder` or any other feature entry point, and the
root FESM stays scrum-free.

## Licensing (Phase 6 inventory note)

`/scrum` introduces **no new runtime dependency, stylesheet, font or asset**. Its
license surface is exactly the license surface of `@decaf-ts/for-angular` itself
plus `@angular/cdk` (MIT), which is already captured for `/kanban`. There is no
additional SPDX entry to add for this entry point.
