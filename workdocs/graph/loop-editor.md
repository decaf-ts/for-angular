# Loop Editor: Ghost Rules, Chain Repair & Edge Labels

A `core.loop.foreach` body is an **ordered canvas chain**: `foreach:item →
first body node → … → last body node → foreach:loop`, wired over mandatory
(non-deletable) chain edges. The editor keeps that chain a single ordered path
through every edit.

## Loop ghost-node rules

The `graph.ghost` "Add node" placeholder is an **editor-only affordance for an
empty loop**, with rules that keep it out of the real workflow:

- A ghost is never persisted into the workflow document. Picking a node from the
  ghost's palette makes that node the **first body node** and writes the
  canonical chain `foreach:item → added → foreach:loop`; the ghost itself
  disappears.
- Adding a node from a `+` connector **inside** a loop body splices it into the
  chain right after its source node instead of creating a parallel edge; adding
  from the loop's own `item` output prepends it as the first body node.
- Ghost nodes are excluded from the body-order walk, and while a run is on the
  canvas the loop ghosts are not projected at all (they are editor affordances,
  not workflow members).
- The ghost's palette opens anchored at the pointer that clicked it; a keyboard
  activation (Enter/Space) anchors it at the ghost's centre instead, and the
  popup is clamped/flipped to stay inside the viewport.

## Chain repair

Deleting a mid-loop node does not strand the loop: the editor captures the
ordered body **before** the removal, splices the deleted node out, and
reconnects the surviving neighbours — recovering the removed node's output port
from the pre-removal order ahead of the generic `result` fallback. The repair
(`graphLoopChainCommandsFor`) is idempotent: chain edges whose endpoint pairs
already match the desired order are left untouched, so a no-op pass never
churns the document.

## Loop edge labels

The mandatory chain edges carry labels — `item` on the loop's entry edge, the
next node's input port name between body nodes, and `loop` on the back edge into
the loop's connection port. The custom edge template
(`ngx-decaf-graph-edge-template`) renders the label at the middle of the line
(`positionOnEdge`, default `0.5`) and applies the run's visual state to the
stroke (`running` / `blocked` / `succeeded` / `failed` / `skipped`, resolved
through the engine plan-edge id).

## Nested body inspection

Selecting a loop node after a run lists the body nodes it executed (the direct
nested body only — a nested loop's body stays under its own loop), each with its
run inputs/outputs; a `core.flow.break` inside the body derives its payload from
the enclosing loop's `broken` result, since break declares no output port.
