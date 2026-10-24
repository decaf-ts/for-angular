# Run Console & Failed-Run Surfacing

Every run streams its lifecycle and log lines into a docked run console, and a
failed run is surfaced on the canvas, in the console, and on the nodes.

## The docked run console

The console (`GraphLogsWidgetComponent`, backed by the shared `graphRunLog`
store) is a bottom dock with two persistent states:

- **Lowered** — an always-visible top bar stays mounted at the bottom edge: the
  "Run console" title, the warning/error counters (`W · E`), a chevron toggle
  and a "Run log" handle. The drawer body is still mounted but `inert` and
  `aria-hidden`, so a lowered console cannot trap focus.
- **Raised** — the drawer animates open under the same top bar
  (`aria-expanded` on the chevron, `aria-controls="graph-logs-body"`).
  Dismissing (×) lowers it back to the bar; the bar itself is never unmounted.

A store-collapsed console (`graphRunLog.collapsed()`) counts as lowered, and the
chevron re-expands it. The run starts and a `workflow.failed` terminal both
raise the console automatically.

The body content is unchanged: lifecycle entries (validated, validation issues,
cancelled, replayed, restored — and now **failed**, rendered with the `error`
level badge) followed by the filtered log entries with per-level devtools-style
filtering and the severity mapping documented in
[Execution events](./execution-events.md#run-log-severity).

## Failed-run surfacing

When the run reaches a `workflow.failed` terminal, three surfaces light up:

1. **Canvas alert** — the renderer overlays a `role="alert"`
   (`aria-live="assertive"`) failure panel above the canvas: *"Workflow run
   failed"* with the message below.
2. **Message** — `graphRunFailureMessageOf(runId, error)` formats the engine's
   structured error: `Run '<id>' failed [<code>]: <detail>` when the engine sent
   one, otherwise *"Run '<id>' failed before producing a result. Open the run
   console for details."*
3. **Failure anchor on the canvas** — engines may fail a run without emitting a
   `node.failed` event (pre-execution validation, an execution gate, an
   engine-level abort). `GraphExecutionStateMapper` anchors the run failure on
   the node the run was working on: the event's node when known, else the node
   still running, else the first node that never reached a terminal state. That
   node turns failed (with the run's structured error), and every node/edge that
   never executed renders skipped — a failed run can no longer read as a
   neutral, successful canvas.

The console records a `failed` lifecycle entry with the same message, so the
canvas alert, the console timeline, and the node states always tell the same
story.
