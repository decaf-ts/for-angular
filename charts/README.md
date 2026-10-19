# `@decaf-ts/for-angular/charts`

Interactive curve editor and interpolation helpers backed by Apache ECharts and
the Cortex compute engine. The entry point keeps both engines out of the root
bundle and exposes only plain `CurvePoint` data — no ECharts, MathLive or
compute-engine types leak through the public API.

## Install

```bash
npm install @decaf-ts/for-angular echarts@^6.1.0 @cortex-js/compute-engine@^0.147.0
```

`echarts` and `@cortex-js/compute-engine` are **optional peer dependencies** of
`@decaf-ts/for-angular`. Install them only in applications that import
`/charts`. The compute engine is used to evaluate LaTeX formulas against the
control points; the editor still renders points when the formula is empty.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `echarts` | `^6.1.0` (optional peer) |
| `@cortex-js/compute-engine` | `^0.147.0` (optional peer) |
| `@decaf-ts/for-angular` | `1.0.x` |

See the package `NOTICE` for the exact SPDX identifiers (ECharts is
Apache-2.0; the compute engine is MIT).

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

## Controlled-view contract

The component never persists or publishes a curve. The host owns the points and
the formula; the component reports what the user did.

- `points` and `formula` are two-way bindings. Writing `points` re-renders and
  regenerates the formula; writing `formula` samples it over `xRange` and
  replaces the points.
- Every interaction emits a typed event (`pointAdded`, `pointRemoved`,
  `pointMoved`, `curveChanged`, `formulaChanged`). Apply the event to your own
  state and feed `points` back in.
- Points are always sorted by ascending `x` before emission. Locked endpoints
  (`lockEndpoints`) keep the first/last `x` pinned to `xRange` and cannot be
  removed.
- Values are clamped to `xRange`/`yRange`; nothing is silently extrapolated.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  CurveEditorComponent,
  type CurvePoint,
  type CurveEditorPointEvent,
} from '@decaf-ts/for-angular/charts';

@Component({
  standalone: true,
  imports: [CurveEditorComponent],
  template: `
    <decaf-curve-editor
      [(points)]="points"
      [(formula)]="formula"
      interpolation="monotonic"
      [xRange]="[0, 10]"
      [yRange]="[0, 100]"
      [height]="360"
      (pointAdded)="log('added', $event)"
      (pointRemoved)="log('removed', $event)"
      (pointMoved)="log('moved', $event)"
      (curveChanged)="sampled.set($event)"
      (formulaChanged)="log('formula', $event)"
    />
  `,
})
export class CurveEditorDemoComponent {
  points = signal<CurvePoint[]>([
    { x: 0, y: 0 },
    { x: 5, y: 40 },
    { x: 10, y: 100 },
  ]);
  formula = signal('');
  readonly sampled = signal<CurvePoint[]>([]);

  log(kind: string, payload: unknown): void {
    // Persist or display the interaction.
  }
}
```

### Inputs

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `points` | `CurvePoint[]` (model) | `[]` | Control points, sorted by `x`. |
| `formula` | `string` (model) | `''` | LaTeX description of the curve. |
| `interpolation` | `'monotonic' \| 'linear'` | `'monotonic'` | Fritsch–Carlson monotone cubic (no overshoot) or straight segments. |
| `xRange` | `[number, number]` | `[0, 1]` | Inclusive abscissa domain; bounds dragging and sampling. |
| `yRange` | `[number, number]` | `[0, 1]` | Inclusive ordinate domain; clamps points. |
| `lockEndpoints` | `boolean` | `false` | Pin first/last point `x` to the range bounds. |
| `height` | `number` | `320` | Rendered chart height in pixels. |

### Outputs

| Output | Payload | When |
| --- | --- | --- |
| `pointAdded` | `CurvePoint` | A point is added. |
| `pointRemoved` | `CurvePoint` | A point is removed (never a locked endpoint). |
| `pointMoved` | `{ index, point, previous }` | A point is dragged. |
| `curveChanged` | `CurvePoint[]` | The sampled curve is re-rendered (121 samples). |
| `formulaChanged` | `string` | The formula changes from either direction. |

### Imperative API

`setPoints(points, { regenerateFormula? })`, `addPoint(x, y)`,
`removePoint(index)`, `movePoint(index, x, y)`, `applyFormula(latex, { emit? })`,
`formulaToPoints(latex)`, `generateFormula()` and `resize()`. Use them only when
a host control must drive the editor; normal interaction flows through bindings
and outputs.

### Pure helpers

`CurvePoint`, `CurveInterpolation`, `sortCurvePoints`, `computeMonotoneTangents`,
`evaluateCurve`, `sampleCurve`, `curveToLatex`, `polynomialLatex`,
`formatLatexNumber`, `dataToPixel` and `pixelToData` are exported for hosts that
need the same math or coordinate mapping outside the component.

## Accessibility and SSR

- The ECharts host is labelled and focusable; control points are added/moved by
  pointer and the formula input is a normal keyboard-editable field.
- Rendering runs outside the Angular zone and a `ResizeObserver` refits the
  chart; the instance is disposed on destroy.
- The chart is only instantiated after the view initializes. Import-time code
  does not touch `window` or `document`.

## License

ECharts is Apache-2.0 and `@cortex-js/compute-engine` is MIT. Both are external
peers and are not vendored. Their notices remain with their own packages.
