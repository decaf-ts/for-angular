### How to Use

- [Initial Setup](./workdocs/tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./workdocs/tutorials/For%20Developers.md#installation)

## Components

### `<decaf-curve-editor>`

Standalone interactive curve editor backed by Apache ECharts: a line series with draggable control points, drawn with linear or monotone cubic (Fritsch–Carlson, no overshoot) interpolation. The control points are the source of truth for the rendered curve; a LaTeX formula can also be set, and is sampled over the x range into control points. Curve drags regenerate the formula, so both stay consistent. MathLive and ECharts types never leak through the public API.

| Binding | Type | Description |
| --- | --- | --- |
| `[(points)]` | `CurvePoint[]` (`{ x, y }`) | Control points, kept sorted by ascending `x` (two-way) |
| `[(formula)]` | `string` | LaTeX formula describing the curve (two-way) |
| `[interpolation]` | `'monotonic' \| 'linear'` | Interpolation strategy (default `'monotonic'`) |
| `[xRange]` / `[yRange]` | `[number, number]` | Inclusive `[min, max]` domains (default `[0, 1]`) |
| `[lockEndpoints]` | `boolean` | Pins the first/last points to the x range bounds and prevents their removal |
| `[height]` | `number` | Rendered chart height in pixels (default `320`) |

Outputs: `pointAdded` (`CurvePoint`), `pointRemoved` (`CurvePoint`), `pointMoved` (`{ index, point, previous }`), `curveChanged` (sampled `CurvePoint[]`), `formulaChanged` (`string`).

```html
<decaf-curve-editor
  [(points)]="points"
  [(formula)]="formula"
  [interpolation]="'monotonic'"
  [xRange]="[0, 10]"
  [yRange]="[0, 1]"
  [lockEndpoints]="true"
  (pointMoved)="onPointMoved($event)">
</decaf-curve-editor>
```

### `<decaf-math-input>`

Standalone LaTeX formula input wrapping the MathLive `<math-field>` custom element (lazy-loaded on first render, no MathLive types in the public API). The field value is a plain LaTeX string emitted on every input.

| Binding | Type | Description |
| --- | --- | --- |
| `[(value)]` | `string` | LaTeX value, emitted on input (two-way) |
| `[placeholder]` | `string` | Placeholder shown when the field is empty |
| `[disabled]` | `boolean` | Renders the field read-only |

```html
<decaf-math-input [(value)]="formula" placeholder="f(x) = ..."></decaf-math-input>
```

Typical pairing: bind both components to the same `formula` string — editing the math field re-samples the curve over the x range, and dragging curve points regenerates the formula.

## Coding Principles

- group similar functionality in folders (analog to namespaces but without any namespace declaration)
- one class per file;
- one interface per file (unless interface is just used as a type);
- group types as other interfaces in a types.ts file per folder;
- group constants or enums in a constants.ts file per folder;
- group decorators in a decorators.ts file per folder;
- always import from the specific file, never from a folder or index file (exceptions for dependencies on other packages);
- prefer the usage of established design patters where applicable:
  - Singleton (can be an anti-pattern. use with care);
  - factory;
  - observer;
  - strategy;
  - builder;
  - etc;

## Release Documentation Hooks
Stay aligned with the automated release pipeline by reviewing [Release Notes](./workdocs/reports/RELEASE_NOTES.md) and [Dependencies](./workdocs/reports/DEPENDENCIES.md) after trying these recipes (updated on 2025-11-26).
