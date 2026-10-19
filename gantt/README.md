# `@decaf-ts/for-angular/gantt`

A typed, Decaf-owned Gantt adapter over [`@worktile/gantt`](https://github.com/worktile/ngx-gantt).
The secondary entry point keeps the renderer out of the root bundle and keeps vendor types out of
the public Decaf API.

## Install

```bash
npm install @decaf-ts/for-angular @worktile/gantt@^21.0.0 html2canvas@^1.4.1 date-fns@^4 @date-fns/tz@^1
```

`@worktile/gantt` is an **optional peer dependency** of `@decaf-ts/for-angular`. Install it only in
applications that import `/gantt`. `date-fns` and `@date-fns/tz` are peers of the renderer; npm 7+
installs them automatically, but declaring them explicitly keeps the dependency set auditable.

`html2canvas` is required because `@worktile/gantt@21.0.0` contains a lazy `import('html2canvas')`
for its print service but does not declare it in its own manifest. Application bundlers resolve
that dynamic import at build time even when print/export is never used. It is an optional peer of
this package so non-Gantt consumers do not install it, and `/gantt` consumers must install it
explicitly. This is a documented workaround for the renderer's packaging defect.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@worktile/gantt` | `21.0.0` (peer range `^21.0.0`) |
| `html2canvas` | `^1.4.1` (required by the renderer's lazy print import) |
| `@decaf-ts/for-angular` | `1.0.x` |

`@worktile/gantt@22.x` requires Angular 22 and is intentionally outside the peer range. Pin the
renderer to `^21.0.0` while the library supports Angular 21.

The adapter defaults the renderer's calendar locale to `en-us` (the vendor default is `zh-hans`).
`@worktile/gantt@21.0.0` provides `GanttConfigService` at the application root, so its locale map
does not see module-level `GANTT_GLOBAL_CONFIG` or i18n providers. The adapter patches the root
service with the supported locale set (`en-us`, `de-de`, `ja-jp`, `ru-ru`, `zh-hans`, `zh-hant`) and
pins `en-us` for this version; host-level `GANTT_GLOBAL_CONFIG.locale` override is not effective
until the renderer fixes its root-provided service.

### Bare-host install note

A plain `npm install @decaf-ts/for-angular` in an empty directory (no `@angular/*` packages yet) can
fail with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer, resolves it to a
newer CDK that accepts Angular 22, and then picks `@angular/common@22` against this package's
`^21.2.17` peer. This is an npm optional-peer resolution artifact, not a manifest error. It does not
occur in an Angular 21 host that already pins `@angular/core`, `@angular/common`, and
`@angular/cdk` to 21.x. For a scratch or non-Angular host, use:

```bash
npm install @decaf-ts/for-angular --legacy-peer-deps
```

The packed-package hygiene test documents this contract; do not replace the optional peer with a
regular dependency.

## Usage

```ts
import { Component } from '@angular/core';
import {
  GanttBarDirective,
  GanttComponent,
  GanttConfig,
} from '@decaf-ts/for-angular/gantt';

interface Task {
  id: string;
  title: string;
  start: string;
  end: string;
  progress: number;
  parentId?: string;
  dependencies?: string[];
  milestone?: boolean;
}

@Component({
  standalone: true,
  imports: [GanttComponent, GanttBarDirective],
  template: `
    <decaf-gantt
      [items]="tasks"
      [config]="config"
      [selectedId]="selectedId"
      (taskSelected)="onSelected($event)"
      (taskEditRequested)="onEdit($event)"
      (taskDateChanged)="onDateChanged($event)"
      (taskDateChangeRejected)="onDateRejected($event)"
      (taskProgressChanged)="onProgressChanged($event)"
      (taskProgressChangeRejected)="onProgressRejected($event)"
    >
      <ng-template decafGanttBar let-task let-milestone="milestone">
        {{ task.title }}{{ milestone ? ' (milestone)' : '' }}
      </ng-template>
    </decaf-gantt>
  `,
})
export class ProjectTimelineComponent {
  readonly tasks: Task[] = [];

  readonly config: GanttConfig<Task> = {
    id: (task) => task.id,
    title: (task) => task.title,
    start: (task) => task.start,
    end: (task) => task.end,
    progress: (task) => task.progress,
    parent: (task) => task.parentId,
    dependencies: (task) => task.dependencies,
    milestone: (task) => Boolean(task.milestone),
    editable: (task) => true,
  };

  selectedId: string | null = null;

  onSelected(event: { taskId: string }) {
    this.selectedId = event.taskId;
  }

  onEdit(event: { taskId: string }) {
    // Open the host-owned detail surface.
  }

  onDateChanged(event: unknown) {
    // Persist the accepted date range, then update `tasks`.
  }

  onDateRejected(event: unknown) {
    // Show the deterministic rejection reason.
  }

  onProgressChanged(event: unknown) {
    // Persist the accepted progress value.
  }

  onProgressRejected(event: unknown) {
    // Show the deterministic rejection reason.
  }
}
```

### Inputs

| Input | Purpose |
| --- | --- |
| `items` | Task collection. |
| `config` | Accessor mapping from tasks to ids, titles, dates, progress, parents, dependencies, milestones, colour, editability, and tooltips. |
| `selectedId` | Controlled selection. |
| `readonly`, `disabled`, `loading`, `error` | Host-controlled states. |
| `viewType` | `day \| week \| month \| quarter \| year`; supports `[(viewType)]`. |
| `start`, `end` | Optional explicit timeline range. |
| `showToolbar`, `draggable`, `selectable`, `showTodayLine` | Renderer behaviour. |
| `label`, `emptyLabel`, `loadingLabel`, `retryLabel`, `taskColumnLabel`, `progressColumnLabel`, `toolbarLabel`, `keyboardHelp` | User-facing labels. |
| `viewTypeLabels` | Per-scale label overrides. |
| `instanceId`, `sideWidth` | Accessible id prefix and table width. |

### Outputs

- `taskSelected` and `taskEditRequested` — `{ task, taskId }`.
- `taskDateChanged` — `{ task, taskId, previous, current, reason, mode }`, where `reason` is
  `drag | keyboard | control` and `mode` is `move | resize`.
- `taskDateChangeRejected` — deterministic reasons: `disabled`, `readonly`, `invalid-date`,
  `milestone`, `dependency-violation`, `unknown-task`, or `unchanged`.
- `taskProgressChanged` and `taskProgressChangeRejected`.
- `viewTypeChange`, `modelIssuesChange`, `retryRequested`.

The component is controlled: it never mutates consumer task objects. After a drag it re-derives the
timeline from `items`; persist the accepted event and update `items` to keep the new position.

### Templates

- `[decafGanttBar]` — custom bar content. Context: `$implicit`/`task`, `taskId`, `title`, `start`,
  `end`, `progress`, `progressPercent`, `milestone`, `selected`, `readOnly`, `tooltip`.
- `[decafGanttTaskDetail]` — host-owned task detail surface. Context: `$implicit`/`task`, `taskId`,
  `title`. Use it to project a Decaf form or model renderer.
- `[decafGanttEmpty]` — custom empty state.

## Dates, dependencies, and safety

- **Date-only strings** (`YYYY-MM-DD`) are treated as local calendar dates, not UTC instants, so
  `2026-10-05` renders as 5 October in every timezone.
- **Instants** can be `Date` objects or numbers. Numbers with fewer than 13 digits are interpreted
  as Unix **seconds**; 13 or more digits are milliseconds.
- Event ranges expose both `Date` values and stable `YYYY-MM-DD` strings (`startDate`, `endDate`).
- **Dependencies** accept `"task-id"` (finish-to-start by default) or
  `{ id: "task-id", type: "fs" | "ff" | "ss" | "sf" }`.
- Invalid dates, duplicate ids, unknown parents/dependencies, parent cycles, dependency cycles, and
  invalid progress are reported through `modelIssuesChange` and an inline warning list. Invalid
  tasks remain visible in the table without a bar.
- Date and progress edits are rejected deterministically when they are disabled, read-only,
  invalid, milestone-resized, or would violate a dependency. Rejected drags snap back.

## Styles and theme

`/gantt` ships the renderer stylesheet inside the component (`ViewEncapsulation.None`); no global
`@worktile/gantt` CSS import is required. The adapter scopes every custom rule under `.dcf-gantt`.

Theme through Decaf tokens:

```scss
.dcf-gantt {
  --dcf-color-primary: #0057b8;
  --dcf-color-text: #17202a;
  --dcf-color-text-secondary: #566573;
  --dcf-color-gray-1: #f8f9fa;
  --dcf-color-gray-4: #dee2e6;
}
```

Or override the renderer variables directly:

```scss
.dcf-gantt {
  --gantt-color-primary: #0057b8;
  --gantt-header-height: 40px;
  --gantt-row-height: 40px;
  --gantt-bar-height: 22px;
}
```

## Accessibility and SSR

- Bars are keyboard reachable (`Tab`). `Enter`/`Space` selects, `E` requests edit, `Alt+Arrow`
  moves by one day, `Alt+Shift+Arrow` resizes, and `[` / `]` changes progress by 10%.
- A polite live region announces selections, accepted edits, and rejections.
- Visible focus rings, forced-colors support, and `prefers-reduced-motion` handling are included.
- The renderer is only instantiated in the browser. Server rendering emits a sized placeholder, and
  no import-time code touches `window` or `document`.

## License

`@worktile/gantt` is MIT-licensed. This package imports it as an external optional peer and does not
vendor or relicense its code. See the renderer repository for its complete license and notices.
