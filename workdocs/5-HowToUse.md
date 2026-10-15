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

## Running the graph UI against a backend

The graph pages (`/graph`, workflow list, runs) talk to a standalone `@decaf-ts/as-graph` backend
over `http://localhost:3000` (the `GRAPH_BACKEND_URL` injection token, default
`http://localhost:3000`). The UI is backend-agnostic: it lists whatever engine catalogue the backend
serves and gates create/run/save from the served capability manifest, so switching engines needs no
UI change.

The backend is booted by the `@decaf-ts/as-graph` standalone host. `for-angular` wires one script
per variant:

| Script | Backend it boots |
| --- | --- |
| `npm run start:backend` / `start:backend:local` | local built-in engine |
| `npm run start:backend:mastra` | Mastra (`@mastra/core`) |
| `npm run start:backend:dagster` | Dagster (needs `DAGSTER_GRAPHQL_URL`) |

`npm run start` runs the UI dev server on `http://localhost:8110`. To boot a backend and the UI
together, use `npm run start:dev` (local), `npm run start:dev:mastra`, or
`npm run start:dev:dagster`.

**Prerequisites**

- `@decaf-ts/as-graph` must be installed with the variant-capable standalone host
  (`lib/cjs/nest/graph/main.cjs`); if the installed version predates it, build and link the local
  `as-graph` package first.
- `mastra`: the `@mastra/core` peer (`^1.77.0`) is installed with the backend package.
- `dagster`: a Dagster gateway plus `DAGSTER_GRAPHQL_URL`; the `as-graph` package's
  `npm run prepare-it-tests` provisions the pinned fixture, and `npm run teardown-it-tests` stops it.

See the `@decaf-ts/as-graph` "Running each backend + UI combination" guide for the full setup, port,
and verification details.

**Verification** — with a backend on `:3000`, open `http://localhost:8110/graph`; the workflow table
lists the selected engine's scenarios. The UI unit tests for this surface are `npm run test:graph`.

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
