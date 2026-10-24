# Node I/O Panel

Capped, read-only rendering of a node's run inputs/outputs with a full-payload download.

After a run, the node inspection split view renders each node's inputs (right pane) and outputs or error (left pane) through `GraphIoViewerComponent` (`app-graph-io-viewer`, standalone). The same component backs the workflow-input editor and node inspection surfaces, so every I/O pane shares one cap and one download path.

## Rendering cap

A large run payload can never overflow the browser: the rendered text is capped at a configurable byte/line limit — default **256 KB / 2000 lines** — applied in that order (bytes first, so a single huge line cannot blow the DOM, then lines). The cap is a rendering cap only: it never mutates the source payload.

In `table` mode the cap also covers each row: both the row key and the cell text are capped to the same limit, and the visible rows share one aggregate UTF-8 byte budget over their keys and cell texts in addition to the line cap — the first row that would overflow the remaining budget is trimmed to what still fits, and any later rows are dropped. `json` and `raw` stay at the single-value byte/line cap.

The cap is the `GRAPH_IO_PANEL_LIMIT` injection token (`{ bytes, lines }`), provided root-wide with the 256 KB / 2000-line default. Hosts override it with their own provider:

```typescript
import { GRAPH_IO_PANEL_LIMIT } from "@decaf-ts/for-angular/graph";

providers: [
  { provide: GRAPH_IO_PANEL_LIMIT, useValue: { bytes: 512 * 1024, lines: 4000 } },
]
```

When content was dropped, the pane shows a truncation notice with a **download full payload** action instead of silently clipping.

## Full-payload download

The download action fetches the **entire untruncated payload from the server run detail endpoint** (`GET /graph/runs/:runId`) — not the rendered value — and saves it as a file. It is enabled only when the pane knows both the `runId` and the `nodeId` inputs; without either, the action stays disabled.

| Input | Type | Description |
| --- | --- | --- |
| `title` | `string` | Pane label (e.g. "Inputs", "Outputs") |
| `value` | `unknown` | Value to render in the selected mode |
| `error` | `{ name?, message?, stack? }` | Error payload; when present it replaces the value rendering |
| `runId` | `string` | Run id the value belongs to (enables the download) |
| `nodeId` | `string` | Node id the value belongs to (enables the download) |
| `field` | `'inputs' \| 'outputs'` | Node payload field the pane renders and downloads |

## Representations

Three toggleable representations: `json` (default, pretty-printed), `table` (key/value row grid for records and arrays; array entries keyed `[index]`), and `raw` (pretty-printed text). In `json`/`raw` the cap applies to the single rendered text; in `table` each row's key and cell text are capped individually and the rows share the aggregate byte budget described under [Rendering cap](#rendering-cap).
