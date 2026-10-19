# `@decaf-ts/for-angular/diagrams`

Graph and workflow editing surfaces: a `ng-diagram` canvas bound to a Decaf
workflow document, the node catalogue, execution/run clients, validation,
history/autosave, parameter renderers and the inspection/log panes. The entry
point keeps `@decaf-ts/as-graph` and `ng-diagram` out of the root bundle.

## Install

```bash
npm install @decaf-ts/for-angular @decaf-ts/as-graph@^0.6.0 ng-diagram@^1.4.0
```

`@decaf-ts/as-graph` and `ng-diagram` are **optional peer dependencies** of
`@decaf-ts/for-angular`. Install them only in applications that import
`/diagrams`. The entry point also uses these required root peers:
`@angular/*`, `@ionic/angular`, `@ngx-translate/core`, `rxjs`, `@decaf-ts/core`,
`@decaf-ts/db-decorators`, `@decaf-ts/decorator-validation`,
`@decaf-ts/for-http`, `@decaf-ts/logging` and `@decaf-ts/ui-decorators`.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@decaf-ts/as-graph` | `^0.6.0` (optional peer) |
| `ng-diagram` | `^1.4.0` (optional peer) |
| `@decaf-ts/for-angular` | `1.0.x` |

`@decaf-ts/as-graph` is MIT-licensed; `ng-diagram` is Apache-2.0. See the
package `NOTICE`.

### Bare-host / non-Angular install

A plain `npm install @decaf-ts/for-angular` in a truly empty directory can fail
with `ERESOLVE` because npm 11 auto-installs the optional `@angular/cdk` peer,
floats Angular to 22 and collides with this package's `^21.2.17` anchor. That is
an npm optional-peer resolution artifact, not a manifest defect. For a scratch or
non-Angular host use `npm install @decaf-ts/for-angular --legacy-peer-deps`; the
fallback is the supported scratch-host contract for every entry point in this
package (see [`/kanban`](../kanban/README.md) for the full explanation).

### Production backend URL

`GRAPH_BACKEND_URL` defaults to `http://localhost:3000`, which is a
development-only address. Production hosts **must** override it with the
deployed graph backend origin:

```ts
import { GRAPH_BACKEND_URL } from '@decaf-ts/for-angular/diagrams';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: GRAPH_BACKEND_URL, useValue: 'https://graph.example.com' },
  ],
});
```

When a production build resolves the token without an override, the library
emits one `console.warn` naming `GRAPH_BACKEND_URL`; it never performs a
network call to the default on its own.

### Feature isolation

`/diagrams` does **not** import `/code-editor` or `/model-builder` at runtime.
Those surfaces are host-provided through the `GRAPH_CODE_EDITOR_COMPONENT` and
`GRAPH_MODEL_BUILDER_COMPONENT` injection tokens. A diagram consumer therefore
installs no CodeMirror package and no `@decaf-ts/as-zod`/`zod`; this retired the
Phase 1 feature-to-feature debt. `@decaf-ts/as-zod` can still appear
transitively through `@decaf-ts/as-graph`, never through this package.

The only feature→feature edge in the package remains `/scrum → /kanban`.

## Controlled-view contract

The graph editor is a document editor, not a hidden orchestrator.

- The host supplies `graphRoot` (the workflow document/snapshot) and receives
  change notifications through the document store; the renderer reconciles the
  canvas to the document and never runs a workflow on its own.
- Execution is explicit: `GraphExecutionService` / `GraphRunClient` call the
  configured backend (`GRAPH_BACKEND_URL`), and run state lands in the
  singleton stores (`graphExecutionState`, `graphRunLog`, `graphInspection`).
- Feature hosts (code editor, model builder) are injected components; the
  diagram entry point ships the host shells and tokens, not the features.
- Selection, validity and history are exposed as read-only signals/stores so a
  host toolbar can gate actions without reaching into the canvas.

### Storage and services

`GraphWorkflowDocumentStore` owns the workflow document. `GraphHistoryService`,
`GraphSaveService`, `GraphAutoSaveService`, `GraphMutationDetectorService` and
`GraphKeyboardShortcutsService` implement undo/redo, persistence and
autosave; provide their backend clients (for example `GraphWorkflowValidateClient`,
`GraphRunClient`) from the host application.

## Usage

```ts
import { Component, signal } from '@angular/core';
import { GraphRendererComponent } from '@decaf-ts/for-angular/diagrams';

@Component({
  standalone: true,
  imports: [GraphRendererComponent],
  template: `
    <app-graph-renderer
      [graphRoot]="workflow()"
      [availableNodes]="nodes()"
      [outputs]="runOutputs()"
      [runResultState]="runState()"
      [validationIssues]="issues()"
      (nodeDragEnded)="markDirty()"
      (edgeDrawn)="markDirty()"
      (elementsRemoved)="markDirty()"
      (retryRunResult)="reloadRun()"
    />
  `,
})
export class WorkflowEditorComponent {
  readonly workflow = signal<unknown>(null);
  readonly nodes = signal<unknown[]>([]);
  readonly runOutputs = signal<Record<string, unknown> | null>(null);
  readonly runState = signal<'idle' | 'running' | 'success' | 'error'>('idle');
  readonly issues = signal<unknown[]>([]);
  markDirty(): void {}
  reloadRun(): void {}
}
```

### `<app-graph-renderer>` inputs and outputs

| Input | Purpose |
| --- | --- |
| `graphRoot` (required) | Workflow document/snapshot to render. |
| `outputs` | Last run's output values for the inspection pane. |
| `availableNodes` | Node manifests from the catalogue. |
| `runResultState` | Run lifecycle driving the split view. |
| `validationIssues` | Structured issues from the last run. |

Outputs: `nodeDragEnded`, `edgeDrawn`, `elementsRemoved` and `retryRunResult`.
All are notifications; the host decides whether to persist.

### Public API surface

The barrel re-exports the following modules:

| Module | Representative exports |
| --- | --- |
| `capabilities` | `GraphEngineCapability`, its gates, API, store and service. |
| `catalog` | `GraphNodeCatalogService`, store, reader, composite source, manifest fixtures and resolution. |
| `components` | `GraphRendererComponent`, `GraphToolbarComponent`, node/edge/boundary templates, palette, inspection, logs, I/O viewer, condition editor, feature hosts, `ForAngularGraphComponentsModule`. |
| `document` | `GraphWorkflowDocumentStore`, `GraphDiagramAdapter`, mutation translator/commands, selectors, palette factory, value hydration. |
| `execution` | `GraphExecutionService`, state mapper/store, `graphSelection`, `graphRunLog`, `graphInspection`, `ghostNodeStore`. |
| `parameters` | Parameter form builder, visibility/validation mapping, renderer registry and the per-type parameter components. |
| `runs` | `GraphRunClient`, `GraphRunEventClient`, `GraphRunPresentation`, `GraphRunStateStore`. |
| `services` | History, save, autosave, mutation detector and keyboard shortcuts. |
| `tokens` | `GRAPH_HISTORY_LIMIT`, `GRAPH_AUTOSAVE_DEBOUNCE_MS`, `GRAPH_DEV_MODE`, `GRAPH_IO_PANEL_LIMIT`, `GRAPH_BACKEND_URL`, `GRAPH_CODE_EDITOR_COMPONENT`, `GRAPH_MODEL_BUILDER_COMPONENT`. |
| `validation` | `GraphWorkflowValidateClient`, `graphValidity`. |
| `workflow-inputs`, `types`, `utils` | Workflow input field/form builders, shared types and helpers. |

### Styles

Two optional theme sources ship alongside the entry point:

```scss
@use '@decaf-ts/for-angular/diagrams/assets/theme/graph-theme.scss';
/* or the lower-level token mapping */
@use '@decaf-ts/for-angular/diagrams/assets/theme/ng-diagram.scss';
```

Component styles are encapsulation-scoped; no global stylesheet import is
required for the editor to render.

## Accessibility and SSR

- The canvas is keyboard reachable; node selection, edge creation and deletion
  are exposed through the toolbar and keyboard shortcuts service.
- Status and validation feedback use the shared live-region/log panes.
- The renderer is browser-only: `ng-diagram` is instantiated after view
  initialization and no import-time code touches `window` or `document`. Server
  rendering emits the host element placeholder.

## License

`@decaf-ts/as-graph` is MIT-licensed and `ng-diagram` is Apache-2.0. Both are
external optional peers and are not vendored; their notices remain with their
own packages.
