# `@decaf-ts/for-angular/kanban`

Accessible, controlled Kanban board built on `@angular/cdk/drag-drop`. The entry
point owns no data: it renders columns from a host-supplied mapping, emits typed
move/reorder/selection events and never mutates a task. Drag/drop mechanics are
implemented once here and reused by [`/scrum`](../scrum).

## Install

```bash
npm install @decaf-ts/for-angular @angular/cdk@^21.2.14
```

`@angular/cdk` is an **optional peer dependency** of `@decaf-ts/for-angular`.
Install it only in applications that import `/kanban` (or `/scrum`, which
composes this entry point). The entry point adds no other runtime dependency
and imports nothing except `@angular/*`, `@angular/cdk/drag-drop` and the core
package.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@angular/cdk` | `^21.2.14` (optional peer) |
| `@decaf-ts/for-angular` | `1.0.x` |

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and then collides with this package's `^21.2.17` anchor.
That is an npm optional-peer resolution artifact, not a manifest defect, and it
does not occur in an Angular 21 host that already pins `@angular/core`,
`@angular/common` and `@angular/cdk` to 21.x. For an empty or non-Angular host
use `npm install @decaf-ts/for-angular --legacy-peer-deps`; otherwise install
`@angular/cdk@^21.2.14` explicitly. The `--legacy-peer-deps` fallback is the
supported scratch-host contract for every entry point in this package.

## Controlled-view contract

The board is presentation only. It never mutates a task, calls an API or moves a
card on its own. The host owns:

- the task array and the task → column mapping (`KanbanConfig.status`);
- column order and WIP limits (`KanbanConfig.columns`);
- what happens after a move, reorder or selection;
- `selectedId`, `readonly`, `disabled`, `loading` and `error` state.

When an interaction is refused the board emits `taskMoveRejected` with a
deterministic `reason` and leaves the task where it was. Rejection reasons are
`cancelled`, `disabled`, `invalid-index`, `readonly`, `unchanged`,
`unknown-column` and `wip-limit`. A rejected move is never applied silently.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  DecafKanbanCardDirective,
  KanbanBoardComponent,
  type KanbanConfig,
  type KanbanSelectionEvent,
  type TaskMoveEvent,
  type TaskMoveRejectedEvent,
  type TaskReorderEvent,
} from '@decaf-ts/for-angular/kanban';

interface Task {
  id: string;
  title: string;
  status: string;
}

const COLUMNS = [
  { id: 'todo', title: 'To do', wipLimit: 4 },
  { id: 'doing', title: 'In progress', wipLimit: 2 },
  { id: 'done', title: 'Done' },
];

@Component({
  standalone: true,
  imports: [KanbanBoardComponent, DecafKanbanCardDirective],
  template: `
    <decaf-kanban-board
      [items]="tasks()"
      [config]="config"
      [selectedId]="selectedId()"
      [readonly]="readOnly()"
      [loading]="loading()"
      [error]="error()"
      (taskMoved)="onMoved($event)"
      (taskReordered)="onReordered($event)"
      (taskSelected)="onSelected($event)"
      (taskEditRequested)="onEdit($event)"
      (selectionCleared)="selectedId.set(null)"
      (taskMoveRejected)="onRejected($event)"
      (retryRequested)="reload()"
    >
      <ng-template decafKanbanCard let-task let-column="column">
        <strong>{{ task.title }}</strong>
        <span>{{ column.title }}</span>
      </ng-template>
    </decaf-kanban-board>
  `,
})
export class SprintBoardComponent {
  readonly tasks = signal<Task[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly readOnly = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly config: KanbanConfig<Task> = {
    id: (task) => task.id,
    title: (task) => task.title,
    status: (task) => task.status,
    columns: COLUMNS,
  };

  onMoved(event: TaskMoveEvent<Task>): void {
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === event.task.id
          ? { ...task, status: event.toColumn }
          : task
      )
    );
  }

  onReordered(event: TaskReorderEvent<Task>): void {
    // Apply event.currentIndex inside event.column, then update tasks.
  }

  onSelected(event: KanbanSelectionEvent<Task>): void {
    this.selectedId.set(event.task.id);
  }

  onEdit(event: KanbanSelectionEvent<Task>): void {
    // Open the host-owned detail surface (Decaf form / model renderer).
  }

  onRejected(event: TaskMoveRejectedEvent<Task>): void {
    // Surface event.reason; the board already snapped the card back.
  }

  reload(): void {
    this.error.set(null);
  }
}
```

The board re-derives every column from `items` after each interaction. Persist
the accepted event and update `items` to keep the new position; do not mutate
the task objects in place.

### `selectionCleared`

`selectionCleared` (no payload) is emitted when the user presses `Escape` on a
focused card and the board had a keyboard-selected card. Clear the host's
`selectedId` in that handler. It is separate from `taskSelected` so a host can
distinguish "selection moved" from "selection dismissed" and keep DOM/ARIA
state aligned. Pressing `Escape` also cancels an in-progress keyboard move.

## API summary

### `<decaf-kanban-board>`

| Input | Type | Purpose |
| --- | --- | --- |
| `items` | `readonly T[]` | Task collection. |
| `config` | `KanbanConfig<T>` (required) | id/title/status accessors, columns, optional swimlane. |
| `selectedId` | `string \| null` | Controlled selection. |
| `readonly` | `boolean` | View-only board; selection still emits. |
| `disabled` | `boolean` | Suppresses selection, edit and drag. |
| `loading` | `boolean` | Renders the loading state and suspends dragging. |
| `error` | `string \| null` | Renders the error state plus retry action. |
| `filter` | `((task: T) => boolean) \| null` | Host search/filter predicate. |
| `label`, `emptyMessage`, `loadingMessage`, `errorMessage`, `retryLabel`, `keyboardHelp` | `string` | User-facing copy. |
| `showDragHandles` | `boolean` | Show per-card drag handles. |
| `instanceId` | `string` | Stable id prefix for accessible relationships. |

| Output | Payload |
| --- | --- |
| `taskMoved` | `{ task, fromColumn, toColumn, previousIndex, currentIndex }` |
| `taskReordered` | `{ task, column, previousIndex, currentIndex }` |
| `taskSelected` | `{ task, column }` |
| `taskEditRequested` | `{ task, column }` |
| `selectionCleared` | `void` |
| `taskMoveRejected` | `{ task, fromColumn, toColumn, previousIndex, currentIndex, reason, wipLimit? }` |
| `retryRequested` | `void` |

### Types and helpers

`KanbanConfig<T>`, `KanbanColumnConfig`, `KanbanMoveRejectionReason`,
`TaskMoveEvent<T>`, `TaskReorderEvent<T>`, `KanbanSelectionEvent<T>`,
`TaskMoveRejectedEvent<T>`, `KanbanCardTemplateContext<T>`,
`KanbanColumnHeaderTemplateContext`, `KanbanEmptyTemplateContext`,
`KanbanCardKeyboardEvent<T>`, `KanbanColumnDropEvent<T>`, `KanbanRetryHandler`,
`KanbanFilter<T>`, `KanbanFieldMap<T>` and `kanbanConfigFromFields()`.

`KanbanColumnComponent`, `KanbanCardComponent` and the
`DecafKanbanCardDirective` / `DecafKanbanColumnHeaderDirective` /
`DecafKanbanEmptyDirective` template hooks are exported for hosts that compose
their own layout.

## Templates

- `[decafKanbanCard]` — card content. Context: `$implicit`/`task`, `column`,
  `index`, `selected`, `readOnly`.
- `[decafKanbanColumnHeader]` — column heading. Context: `$implicit`/`column`,
  `count`, `wipLimit`, `readOnly`.
- `[decafKanbanEmpty]` — empty state. Context: `$implicit`/`column`, `count`,
  `board` (`true` when the whole board is empty).

## Accessibility and SSR

- Cards are `role="listitem"` with accessible names; columns are labelled
  lists. Columns and cards expose stable ids so hosts can attach descriptions.
- Keyboard: `Tab` moves focus, `Space` picks up/commits a card, arrow keys move
  it, `Enter` selects (second `Enter` requests edit), `E`/`F2` requests edit,
  `Escape` cancels a move or clears selection.
- A polite live region announces picks, drops, accepted moves and rejections.
  Focus rings and `prefers-reduced-motion` are handled in the shipped styles.
- Drag/drop is only wired in the browser. The component does not touch
  `window` or `document` at import time, so server rendering emits the static
  column/card structure.
- WIP limits are enforced by rejection, not by hiding or silently dropping a
  card, so assistive technology sees the same outcome as pointer users.

## License

This entry point ships no third-party code beyond the external `@angular/cdk`
peer (MIT). Styles are component-scoped; no global stylesheet import is
required.
