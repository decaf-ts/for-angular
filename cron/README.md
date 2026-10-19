# `@decaf-ts/for-angular/cron`

Cron-expression authoring surfaces: the standalone `ngx-decaf-cron-selector`
component and the `app-cron-selector-field` form-field adapter built on the
root `CrudFieldComponent`.

The entry point owns the only feature-specific runtime dependency,
`cronstrue` (imported as `cronstrue/i18n` for locale-aware descriptions). It is
an optional peer, so a core-only installation never installs it.

## Install

```bash
npm install @decaf-ts/for-angular cronstrue@^3.24.0
```

`cronstrue` is an **optional peer dependency** of `@decaf-ts/for-angular`.
Install it only in applications that import `/cron`. The entry point also uses
the required root peers: `@angular/*`, `@ionic/angular`,
`@ngx-translate/core`, `rxjs`, `@decaf-ts/db-decorators`,
`@decaf-ts/decorator-validation`, `@decaf-ts/logging` and
`@decaf-ts/ui-decorators`.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `cronstrue` | `^3.24.0` (optional peer) |
| `@decaf-ts/for-angular` | `0.11.x` |

`cronstrue` is MIT-licensed. See the package `NOTICE`.

## Usage

```ts
import { Component } from '@angular/core';
import { CronSelectorComponent } from '@decaf-ts/for-angular/cron';

@Component({
  standalone: true,
  imports: [CronSelectorComponent],
  template: `
    <ngx-decaf-cron-selector
      [(value)]="cron"
      [describeCron]="true"
    />
  `,
})
export class ScheduleEditorComponent {
  cron = '0 9 * * *';
}
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `value` | `model<string>` | Two-way bound cron expression. |
| `formControl` | `FormControl` (input) | Optional reactive-form binding. |
| `describeCron` | `boolean` (input) | Render a human-readable `cronstrue` description. |
| `hideDaily` / `hideInterval` / `hideWeekly` | `boolean` (input) | Hide schedule modes. |
| `disabled` | `boolean` (input) | Disable the selector. |

`CronSelectorFieldComponent` extends the root `CrudFieldComponent` for use in
Decaf model-driven forms (selector: `app-cron-selector-field`). It accepts
`allowEmpty`, `hideDaily`, `hideInterval`, `hideWeekly`, `describeCron`, and
the inherited form-field inputs.

## License

`cronstrue` is an external optional peer and is not vendored.
