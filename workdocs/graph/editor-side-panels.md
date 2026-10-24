# Editor Side Panels & Typed Workflow Inputs

The editor page floats two collapsible panels over the canvas — **Workflow
inputs** (left) and **Run result** (right) — and the inputs panel is the source
of typed, drag-to-canvas input boundaries.

## Floating collapsible panels

Each panel collapses to a narrow rail (48 px) with a chevron toggle
(`aria-expanded` / `aria-controls` wired to its body, distinct expand/collapse
labels); a collapsed panel keeps a vertical rail label so the affordance stays
discoverable. Panel widths are measured from the live layout (after view init
and after every collapse/expand), and the canvas re-fits itself to the remaining
viewport:

- The `zoomToFit` padding accounts for both panel widths plus a bottom reserve
  for the run console (larger while the console is raised).
- Re-fits are debounced (~300 ms) so a collapse/expand/console toggle settles
  before the canvas zooms.
- Below the 1100 px viewport breakpoint the flex layout stacks and the padding
  falls back to a fixed 24 px frame.

The loaded canonical document is authoritative for both panels: the inputs form
is built from the document's declared input ports — even when it declares zero
inputs, the decorated demo root's fields never leak in — and the Run result
panel's labels come from the document's declared output ports (e.g. `collected`)
instead of the demo root's ports. Port fields merge their validators with the
decorated workflow model's fields (a required port adds the required validator).

## Typed drag-to-canvas inputs

Every input field header is both a **drag handle** and a **place button**:

- Dragging a field onto the canvas moves that input's boundary node to the drop
  point. The drag carries the field path as
  `application/x-graph-workflow-input` (with a `text/plain` fallback), the
  canvas shows a drop highlight and a `copy` drop effect while eligible, and the
  drop converts client coordinates to flow coordinates through the diagram
  viewport service (with a canvas-relative fallback).
- The `+` button places the boundary node at a default position inside the fit
  padding.

The control each field renders is derived from the port's declared value schema,
so the form always matches the engine's expected input type:

| Schema | Control |
| --- | --- |
| `number`, or a model named `number`/`integer`/`float`/`double`/`bigint` | number input |
| `boolean` (type or model name) | checkbox |
| string with a date/time `format`, or a `date` model | date input |
| `array`, `object`, `any`, or a model named `array`/`object`/`any`/`map`/`set`/`collection` | textarea (JSON) |
| anything else | text input |

Expression/template values (`GraphValueTemplate`) keep their dedicated editor —
see [Graph Value Parameters](./value-parameters.md).
