# `@decaf-ts/for-angular/charts`

CRD-ready chart layout components, a virtual-dataset layer over the decaf core
query types, an interactive curve editor and interpolation helpers backed by
Apache ECharts and the Cortex compute engine. The entry point keeps both engines
out of the root bundle and exposes only plain data and option types — no ECharts,
MathLive or compute-engine types leak through the public API.

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

## Chart components

Four CRD wrappers render a chart from a query-backed dataset and, in
`CREATE`/`UPDATE` operation, render their decorated configuration model through
`ngx-decaf-model-renderer`:

| Selector | Family | Configuration model |
| --- | --- | --- |
| `ngx-decaf-line-chart` | line | `LineChartConfigModel` |
| `ngx-decaf-bar-chart` | bar | `BarChartConfigModel` |
| `ngx-decaf-pie-chart` | pie | `PieChartConfigModel` |
| `ngx-decaf-scatter-chart` | scatter | `ScatterChartConfigModel` |

All wrappers extend `BaseChartComponent`; the base itself is registered as
`ngx-decaf-chart` and defaults to a line chart, so it can also be used directly
through `@uielement`. Every chart inherits the standard decaf component inputs,
including the required `operation` (`CREATE`, `READ`, `UPDATE`, `DELETE`).

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `[operation]` | `CrudOperations` | `CREATE` | `READ` renders the chart; `CREATE`/`UPDATE` also render the configuration form. |
| `[config]` | `ChartConfig \| Model` | family defaults | Plain configuration or a decorated configuration model instance. |
| `[dataset]` | `VirtualDataset \| VirtualDatasetView` | – | Query source to sub-query or an already narrowed view. |
| `[datasetQuery]` | `VirtualDatasetQuery` | `{}` | Sub-query applied to a `VirtualDataset` source. |
| `[data]` | `readonly unknown[]` | – | Direct rows; takes precedence over `dataset`. |
| `[height]` | `number \| string` | `320` | Canvas height; numbers are pixels. |

Outputs: `configChanged` (`ChartConfig`) after a submitted configuration,
`chartError` (`unknown`) for dataset/render failures, plus the inherited
`listenEvent` and `submitEvent` emitters.

```html
<ngx-decaf-line-chart
  operation="READ"
  [dataset]="salesDataset"
  [datasetQuery]="{ where: regionCondition }"
  [config]="{ title: 'Sales', xField: 'month', yField: 'revenue', seriesField: 'region' }"
  (chartError)="onChartError($event)">
</ngx-decaf-line-chart>
```

### Virtual datasets

`VirtualDataset` is a thin pavement over `@decaf-ts/core` query types. It does not
re-implement query execution: a sub-query is merged over the source's global
query (conditions are AND-combined, projections are intersected, limits take the
smaller bound, offsets add) and the source's loader owns execution. `QueryOptions`
allow flags are enforced with the core semantics (`QueryError` by default,
stripped when `throws` is `false`). `[datasetQuery]` is developer-trusted input:
build it from application code, never from unvalidated end-user input.

```ts
import { Condition } from '@decaf-ts/core';
import { VirtualDataset, type VirtualDatasetQuery } from '@decaf-ts/for-angular/charts';

const dataset = new VirtualDataset<Sale>({
  model: Sale,
  query: { where: Condition.attribute<Sale>('active').eq(true) },
  options: { allowLimit: true, allowOffset: true },
  load: (query, options) => {
    let statement = repository.select();
    if (query.where) statement = statement.where(query.where);
    if (query.limit !== undefined) statement = statement.limit(query.limit);
    if (query.offset !== undefined) statement = statement.offset(query.offset);
    return statement.execute();
  },
});

const north: VirtualDatasetQuery = {
  where: Condition.attribute<Sale>('region').eq('north'),
  limit: 50,
};
```

`mergeVirtualDatasetQuery`, `applyVirtualDatasetQueryOptions`,
`toChartRows`, `toChartDatasetSource` and `buildChartOption` are exported for
hosts that need the same composition or option mapping outside the components.


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
