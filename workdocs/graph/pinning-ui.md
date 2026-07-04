# Pinning UI in Angular

Add pin buttons, pinned badges, and cache-hit indicators to the graph renderer.

## Pinning a Node

After a successful execution, call `GraphExecutionService.pinNode()`:

```typescript
import { GraphExecutionService } from "@decaf-ts/for-angular/graph";

@Component({
  template: `
    <button (click)="pin(nodeId)" [disabled]="!canPin">
      Pin
    </button>
  `,
})
export class NodePinButton {
  readonly graphService = inject(GraphExecutionService);
  nodeId = "merge";
  canPin = true;

  async pin(id: string) {
    try {
      await this.graphService.pinNode({
        workflow: this.workflow,
        plan: this.lastResult.plan,
        result: this.lastResult,
        nodeId: id,
        includeDependencies: true,
      });
    } catch (err) {
      // GraphPinningError: a dependency is not pinnable
      console.error("Pin failed:", err);
    }
  }
}
```

## Pinned Badge

Track pin state from the event stream:

```typescript
const mapper = new GraphExecutionStateMapper();
const nodeStates: GraphNodeExecutionStateMap = {};

graphService.events$.subscribe((event) => {
  mapper.apply(event, nodeStates, {});
});

// In template:
// nodeStates["merge"]?.pinned -> show pin badge
```

## Cache-Hit Indicator

When a node is served from the pinned cache, its state has `fromCache: true` and `status: "cached"`:

```typescript
// After second run with same inputs:
// nodeStates["merge"].fromCache === true
// nodeStates["merge"].status === "cached"
```

Display a "cached" badge or icon when `fromCache` is true.

## Unpinning

```typescript
async unpin(id: string, fingerprint: string) {
  await this.graphService.unpinNode({
    workflow: this.workflow,
    nodeId: id,
    fingerprint,
  });
}
```

After unpinning, a `node.unpinned` event is emitted and `nodeStates[id].pinned` becomes `false`.

## Dependency Pinning

When `includeDependencies: true` (the default), pinning a node also pins all upstream dependencies. The UI can show which dependencies were pinned by listening for multiple `node.pinned` events.
