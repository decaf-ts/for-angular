# `@decaf-ts/for-angular/math`

Standalone LaTeX input field wrapping the MathLive `<math-field>` custom
element. MathLive is loaded lazily from this entry point, so the root bundle
never imports it.

## Install

```bash
npm install @decaf-ts/for-angular mathlive@^0.111.1
```

`mathlive` is an **optional peer dependency** of `@decaf-ts/for-angular`.
Install it only in applications that import `/math`. If the dynamic import
fails (for example in a non-browser environment), the field stays inert instead
of throwing.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `mathlive` | `^0.111.1` (optional peer) |
| `@decaf-ts/for-angular` | `1.0.x` |

MathLive is MIT-licensed; see the package `NOTICE`.

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

## Controlled-view contract

`MathInputComponent` is a form control surface with no persistence and no
validation policy of its own.

- `value` is a two-way `model<string>` holding LaTeX. Writing it updates the
  field; typing in the field updates the model.
- `disabled` renders the field read-only; the component never derives disabled
  state from surrounding forms.
- There is no output other than the model change. Service calls, validation and
  submission belong to the host.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { MathInputComponent } from '@decaf-ts/for-angular/math';

@Component({
  standalone: true,
  imports: [MathInputComponent],
  template: `
    <decaf-math-input
      [(value)]="latex"
      placeholder="\\frac{a}{b}"
      [disabled]="readOnly()"
    />
  `,
})
export class FormulaFieldComponent {
  latex = signal('\\frac{a}{b}');
  readonly readOnly = signal(false);
}
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `value` | `string` (model) | LaTeX content of the field. |
| `placeholder` | `string` (input) | Placeholder text when empty. |
| `disabled` | `boolean` (input) | Render but reject edits. |

Selector: `<decaf-math-input>`.

## Accessibility and SSR

- The underlying MathLive field provides its own keyboard editing and math
  semantics. The host supplies a visible label/description as with any form
  field.
- MathLive is imported with a dynamic `import()` only after the view is
  initialized. Server rendering emits the empty `<math-field>` host; no
  import-time code touches `window` or `document`.

## License

MathLive is MIT-licensed. It is an external optional peer and is not vendored.
