### How to Use

- [Initial Setup](./workdocs/tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./workdocs/tutorials/For%20Developers.md#installation)

## Components

> The curve editor and math input below now live in the `/charts` and `/math`
> entry points. Import them from their dedicated entry point; the root barrel
> no longer re-exports feature components.

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

### Chart components

Four CRD chart layout components backed by Apache ECharts are exported from the
`/charts` entry point: `ngx-decaf-line-chart`, `ngx-decaf-bar-chart`,
`ngx-decaf-pie-chart` and `ngx-decaf-scatter-chart` (base:
`ngx-decaf-chart`). In `READ` operation each renders its dataset; in
`CREATE`/`UPDATE` it also renders its decorated configuration model through
`ngx-decaf-model-renderer`.

| Binding | Type | Description |
| --- | --- | --- |
| `[operation]` | `CrudOperations` | `READ` renders the chart; `CREATE`/`UPDATE` also render the configuration form |
| `[config]` | `ChartConfig \| Model` | Plain configuration or a decorated family config model |
| `[dataset]` | `VirtualDataset \| VirtualDatasetView` | Query source to sub-query or an already narrowed view |
| `[datasetQuery]` | `VirtualDatasetQuery` | Sub-query applied to a `VirtualDataset` source |
| `[data]` | `readonly unknown[]` | Direct rows, taking precedence over `dataset` |
| `[height]` | `number \| string` | Canvas height (default `320`) |

Outputs: `configChanged` after a submitted configuration and `chartError` for
dataset/render failures. `VirtualDataset` composes a sub-query over a global
`@decaf-ts/core` query — AND-combined conditions, the smaller limit and additive
offsets — and delegates execution to the source loader. See
[charts/README.md](./charts/README.md#chart-components) for the configuration
models, option builder and dataset examples.

```html
<ngx-decaf-bar-chart
  operation="READ"
  [dataset]="salesDataset"
  [datasetQuery]="{ where: regionCondition }"
  [config]="{ title: 'Sales', xField: 'month', yField: 'revenue' }">
</ngx-decaf-bar-chart>
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

### `<ngx-decaf-agent-chat>`

Standalone agent conversation UI over a graph workflow run, exported from the
[`/agent`](./agent/README.md) secondary entry point. `/agent` reuses the graph
I/O viewer from [`/diagrams`](./diagrams/README.md) through its public specifier,
so it needs the same optional peers (`@decaf-ts/as-graph`, `ng-diagram`). Ships
together with its transport contract (`AgentChatTransport` with
`send`/`replay`/`cancel`), the `AGENT_CHAT_TRANSPORT` injection token, the
composer/message models, the envelope fold, the `AgentChatService`, and the
translation fallback pipe. The transcript is a `role="log"` live region with
per-role styling, action/attachment chips and auto-scroll; the composer handles
Enter-to-send / Shift+Enter newline, metadata-only attachments (file contents
are never read), and a knowledge-base selector forwarded as `knowledgeBaseIds`
run inputs. A collapsible telemetry strip shows per-roundtrip rows, a
structured-object panel reuses the graph I/O viewer for the latest structured
output, and namespace chips derive from the configured workflow document's auth
metadata. All user-facing strings resolve through the `agent.chat.*` i18n
subtree with hardcoded English fallbacks.

| Binding | Type | Description |
| --- | --- | --- |
| `[workflow]` | `GraphWorkflowDocument \| null` | Workflow document the chat runs against (namespace chips derive from its auth metadata) |
| `[workflowId]` | `string \| null` | Backend workflow id to run (`null` clears a previously configured value) |
| `[sessionId]` | `string \| null` | Conversation session id (generated as `agent-chat-<epoch>-<seq>` when unset) |
| `[headerTitleKey]` | `string` | Localized header title key (default `agent.chat.title`) |
| `[headerTitleFallback]` | `string` | Header title fallback when the key is missing (default `Agent chat`) |
| `[knowledgeSources]` | `AgentChatKnowledgeSource[]` | Knowledge-base options offered in the composer |

Runs go through the injectable `AgentChatTransport`: the default `GraphRunAgentChatTransport` runs the configured workflow over the graph backend's `POST /graph/runs` + SSE envelope stream (replay from sequence zero, idempotent cancel). Override the `AGENT_CHAT_TRANSPORT` token to plug in a scripted or alternative transport (e.g. the optional `@ai-sdk/angular` peer). Storybook coverage (`src/stories/agent-chat.stories.ts`) mounts the component with a scripted transport, so no backend is needed.

```html
<ngx-decaf-agent-chat [workflow]="document" [workflowId]="id"></ngx-decaf-agent-chat>
```

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

**The `/workflows` catalogue** — `/workflows` is the catalog surface: it lists the selected engine's
served catalogue (`graph/engines/{engineId}/workflows`) and falls back to the legacy
`GET /graph/workflows` endpoint when the manifest does not advertise catalogue browsing. Create
Workflow routes to the empty canvas (`graph/create`) only when the selected engine's served manifest
allows authoring (`canCreateWorkflow`); otherwise the button is hidden and its tooltip reports that
the engine does not support creating workflows.

**Node I/O panels** — after a run, each node's inputs/outputs render capped at
`GRAPH_IO_PANEL_LIMIT` (default 256 KB / 2000 lines, provider-overridable) so a large run payload
cannot overflow the page; a download action fetches the entire untruncated payload from the run
detail endpoint (requires the run id and node id). See
[Node I/O panel](./workdocs/graph/node-io-panel.md).

**Verification** — with a backend on `:3000`, open `http://localhost:8110/workflows`; the workflow
table lists the selected engine's scenarios. The UI unit tests for this surface are
`npm run test:graph`, and the per-engine UI validation lane — booting each engine's backend and
driving list/show/replay/node-I-O for every fixture with Playwright — runs through
`tests/playwright/graph/per-engine/run-per-engine-ui.sh`. All graph components carry Storybook
stories (`npm run storybook`).

### Editor dark mode & accessibility gate

The graph editor surfaces carry their palette in `src/graph/styles/graph-theme.scss` (`--gx-*`
custom properties, plus canvas `--ngd-*` remaps): the `:root` values are byte-identical to the
literals they replaced (light mode pixel-for-pixel unchanged), and the dark palette applies under
both triggers the decaf engine uses — `html.dcf-palette-dark` (engine toggle) and
`@media (prefers-color-scheme: dark)` (OS preference) — so the editor follows both without touching
surfaces outside the graph editor. Host apps embedding the editor must load `graph-theme.scss`
globally. The editor is covered by an axe-core accessibility gate
(`tests/playwright/graph/a11y.spec.ts`, WCAG 2.x AA) over the canvas/toolbar/palette, the node
inspection split view and inline editor, the node/switch edit modals, the model-builder surface,
the workflow-create modal, and the workflow/executions lists — including a forced dark-mode pass.

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
