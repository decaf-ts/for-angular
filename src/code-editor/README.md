# `@decaf-ts/for-angular/code-editor`

Code and formula editing surface backed by the CodeMirror 6 family. CodeMirror
is loaded lazily from this entry point; the root bundle never imports it. When
the dynamic import fails, the component falls back to an Ionic textarea so the
host still gets an editable control.

## Install

```bash
npm install @decaf-ts/for-angular \
  @codemirror/state@^6.7.6 @codemirror/view@^6.43.14 \
  @codemirror/commands@^6.11.1 @codemirror/language@^6.13.1 \
  @codemirror/autocomplete@^6.20.3 @codemirror/lint@^6.9.7 \
  @codemirror/lang-javascript@^6.2.5 @codemirror/theme-one-dark@^6.1.3
```

Every CodeMirror package is an **optional peer dependency** of
`@decaf-ts/for-angular`. Install them only in applications that import
`/code-editor`. The component reuses `@ionic/angular` (a required root peer) for
its fallback textarea.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| CodeMirror packages | versions listed above (optional peers) |
| `@decaf-ts/for-angular` | `1.0.x` |

All CodeMirror packages are MIT-licensed; see the package `NOTICE`.

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

## Controlled-view contract

The editor never persists code and never runs it.

- `code` is a plain input. The editor mirrors it; changing the input replaces
  the document while preserving cursor position when the value is unchanged.
- `codeChange` emits the full document after each change. Persist it and feed it
  back through `code`; the component skips echo updates.
- `mode="code"` enables line numbers, folding, lint diagnostics and a JavaScript
  syntax check. `mode="formula"` renders a single-line, compact field for
  expressions. Neither mode executes the content.
- `readonly` is not an input on this component: render it inside a disabled
  host or provide a non-editing view when a read-only surface is required.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { CodeEditorComponent } from '@decaf-ts/for-angular/code-editor';

@Component({
  standalone: true,
  imports: [CodeEditorComponent],
  template: `
    <app-code-editor
      mode="code"
      [code]="source()"
      placeholder="return value * 2;"
      ariaLabel="Transform expression"
      (codeChange)="source.set($event)"
    />
  `,
})
export class ExpressionEditorComponent {
  readonly source = signal('return value * 2;');
}
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `mode` | `'code' \| 'formula'` (input) | Full editor or compact expression field. |
| `code` | `string` (input) | Document content. |
| `placeholder` | `string` (input) | Placeholder when empty. |
| `ariaLabel` | `string` (input) | Accessible name for the CodeMirror content element. |
| `codeChange` | `string` (output) | Full document after each change. |

Selector: `<app-code-editor>`.

The component uses `ViewEncapsulation.None` so CodeMirror's generated DOM can be
styled. All rules are scoped under the editor's own classes.

## Accessibility and SSR

- The CodeMirror content element is given an accessible name from `ariaLabel`.
  Keyboard editing, history and completion use CodeMirror's standard keymaps.
- The focus ring is visible and `prefers-reduced-motion` is respected.
- CodeMirror is loaded only after the view initializes. Import-time code does
  not touch `window` or `document`; server rendering emits the host element.

## License

The CodeMirror packages are MIT-licensed. They are external optional peers and
are not vendored.
