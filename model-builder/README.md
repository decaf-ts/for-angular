# `@decaf-ts/for-angular/model-builder`

Visual builder for Decaf models and Mastra structured-output definitions. The
component authors a model (name, properties, validators, UI metadata, layout),
previews it through the shared `ModelRendererComponent`, and converts it to the
S1 structured-output definition consumed by the backend.

This is the **sixth secondary entry point** ratified at the Phase 1 gate. It is
the only former root component that statically imports `@decaf-ts/as-zod` and
`zod`; keeping it in root would have broken the core-only packaging gate.

## Install

```bash
npm install @decaf-ts/for-angular @decaf-ts/as-zod@^1.15.3 zod@^4.6.7
```

`@decaf-ts/as-zod` and `zod` are **optional peer dependencies** of
`@decaf-ts/for-angular`. Install them only in applications that import
`/model-builder`. The component also uses `@ionic/angular`, `@decaf-ts/core`,
`@decaf-ts/db-decorators`, `@decaf-ts/decorator-validation` and
`@decaf-ts/ui-decorators`, which are already required root peers.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@decaf-ts/as-zod` | `^1.15.3` (optional peer) |
| `zod` | `^4.6.7` (optional peer) |
| `@decaf-ts/for-angular` | `1.0.x` |

`@decaf-ts/as-zod` and `zod` are MIT-licensed. See the package `NOTICE`.

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

## Controlled-view contract

The builder never persists a model or calls the backend.

- Editing is local component state until the host reads it.
- `structuredOutputMode` switches the surface from generic model authoring to
  the S1 definition editor. In that mode `structuredOutputChange` emits
  `{ model, instructions, jsonPromptInjection }` whenever the definition
  changes; persist it and feed it back through `definition`.
- `preview` toggles the read-only rendered form. The preview uses the same
  Decaf model renderer as the rest of the library — there is no second form
  stack.
- `definition` accepts an object or a JSON string. Invalid input is reported in
  the component's build info/error state, not thrown.

## Usage

```html
<ngx-decaf-model-builder
  [preview]="false"
  [structuredOutputMode]="true"
  [definition]="definition()"
  (structuredOutputChange)="definition.set($event)"
/>
```

```ts
import { Component, signal } from '@angular/core';
import { ModelBuilderComponent } from '@decaf-ts/for-angular/model-builder';

@Component({
  standalone: true,
  imports: [ModelBuilderComponent],
  template: `
    <ngx-decaf-model-builder
      [structuredOutputMode]="true"
      [definition]="definition()"
      (structuredOutputChange)="definition.set($event)"
    />
  `,
})
export class StructuredOutputEditorComponent {
  readonly definition = signal<Record<string, unknown> | null>(null);
}
```

### API

| Member | Type | Purpose |
| --- | --- | --- |
| `preview` | `boolean` (input) | Render the generated model as a read-only form. |
| `structuredOutputMode` | `boolean` (input) | Author the S1 structured-output definition. |
| `definition` | `unknown` (input setter) | Object or JSON string to preload. |
| `structuredOutputChange` | `Record<string, unknown>` (output) | Emitted edited S1 definition. |

Selector: `<ngx-decaf-model-builder>`.

### Exported helpers and types

`ModelBuilderStructuredField`, `ModelBuilderInjectionMode` and the re-exported
`modelBuilderStructuredDefinitionOf` from the root package.

## Accessibility and SSR

- The builder is a normal Ionic form: labels are associated with controls,
  groups are announced as accordions, and the preview preserves the renderer's
  labels.
- All rendering is Angular-template based; no import-time code touches
  `window` or `document`.

## License

`@decaf-ts/as-zod` and `zod` are MIT-licensed. They are external optional peers
and are not vendored.
