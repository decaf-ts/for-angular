# Workflow Deep Link & Row Navigation

The `/workflows` catalogue rows open the workflow editor directly, addressed by
workflow id, and each row carries its own run gate.

## Row-click navigation

The workflow item's icon + name + updated-at block is a single button: clicking
anywhere on it opens the workflow's own `/workflows/<workflowId>` route — the
same editor the explicit open action uses. The selected engine id is forwarded
as the `engine` query parameter so the editor resolves the scenario through the
served engine catalogue. The action buttons (Run, Past executions, Open) stop
propagation, so they never trigger the row navigation, and the row button has a
visible `:focus-visible` outline for keyboard users.

## The `/workflows/:workflowId` deep-link route

`/workflows/:workflowId` loads the same `GraphPage` editor/runner the catalogue
links to (registered as a `read`-operation route, below the
`/workflows/:workflowId/runs` execution list). A direct visit — bookmark,
shared link, or refreshed page — needs no prior list-page state:

- With `?engine=<engineId>` the page resolves the workflow through that engine's
  catalogue; the engine id is also the run target.
- Without the query parameter the page falls back to the served manifest's
  default engine — the same catalogue the list page shows.
- An engine id the served manifest does not know disables Run outright: an
  unknown engine never falls back to a permissive "no manifest" verdict, so a
  page can never start a demo run under an unavailable engine.

Loading prefers the capability catalogue (`workflowLookup`); the legacy save
endpoint (`GET /graph/workflows/:id`) stays the fallback for saved/editor
workflows and accepts both a bare `GraphWorkflowDocument` and the older
`{ document, … }` save wrapper, so a fixture opened without the catalogue still
restores its real document.

## Per-row run gate (`runnable`)

Catalogue rows may carry a `runnable` flag:

- `runnable: false` marks a **read-only canonical document** — a demo/fixture
  document the engine serves for authoring reference but will not execute (for
  example Dagster rows that are not deployed jobs). The row's Run action is
  disabled and its label/tooltip explains: *"This workflow is a read-only
  canonical document, not a deployed job, so it cannot be run"* (locale keys
  `workflows.*.runBlockedReadOnly` / list-item `runBlockedReadOnly`).
- An omitted flag means no per-row restriction beyond the engine's own run
  capability. `canRunListedWorkflow` runs the row only when the engine allows
  runs **and** the row is not marked read-only.

The editor page applies the same gate on a direct deep-link visit: it resolves
the row's catalogue summary (the already-listed row when present, else a fresh
listing) and blocks Run through the toolbar with the same read-only explanation.
