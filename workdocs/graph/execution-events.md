# Execution Events in Angular

Subscribe to graph execution events and map them to renderer UI state.

## GraphExecutionService

The `GraphExecutionService` is an Angular `@Injectable()` that wraps the engine and exposes events as an RxJS observable:

```typescript
import { GraphExecutionService } from "@decaf-ts/for-angular/graph";

@Component({
  // ...
})
export class GraphRunnerComponent {
  private readonly graphService = inject(GraphExecutionService);

  ngOnInit() {
    this.graphService.events$.subscribe((event) => {
      console.log(event.type, event.nodeId);
    });
  }

  async run() {
    await this.graphService.execute(workflow, { a: 2, b: 3 });
  }
}
```

## Event-to-State Mapping

Use `GraphExecutionStateMapper` to translate events into node and edge UI state maps:

```typescript
import { GraphExecutionStateMapper, GraphNodeExecutionStateMap, GraphEdgeExecutionStateMap } from "@decaf-ts/for-angular/graph";

const mapper = new GraphExecutionStateMapper();
const nodeStates: GraphNodeExecutionStateMap = {};
const edgeStates: GraphEdgeExecutionStateMap = {};

graphService.events$.subscribe((event) => {
  mapper.apply(event, nodeStates, edgeStates);
});

// After a node completes:
// nodeStates["adder"] = { status: "succeeded", outputs: { sum: 5 }, ... }
```

## Node UI State

Each entry in `nodeStates` follows `GraphNodeUiExecutionState`:

| Field | Description |
|-------|-------------|
| `status` | `"running"`, `"succeeded"`, `"failed"`, `"cached"` |
| `startedAt` | ISO timestamp when the node started |
| `finishedAt` | ISO timestamp when the node finished |
| `outputs` | The node's output values |
| `error` | Error payload if the node failed |
| `fromCache` | `true` when the value came from a pinned cache |
| `pinned` | `true` when the node is currently pinned |
| `loop` | Loop iteration state (current, completed, max) |

## Edge UI State

Each entry in `edgeStates` follows `GraphEdgeUiExecutionState`:

| Field | Description |
|-------|-------------|
| `status` | `"succeeded"` after a value is routed |
| `lastValue` | The most recent value routed along the edge |
| `updatedAt` | ISO timestamp of the last routing |

## Configuring the Engine

Provide a custom engine config (e.g., custom executors or value store) via the `GRAPH_EXECUTION_ENGINE_CONFIG` token:

```typescript
import { GRAPH_EXECUTION_ENGINE_CONFIG, GraphNodeExecutorRegistry } from "@decaf-ts/for-angular/graph";

const registry = new GraphNodeExecutorRegistry();
registry.register("math.add", { execute: (i) => ({ sum: i.a + i.b }) });

@NgModule({
  providers: [
    { provide: GRAPH_EXECUTION_ENGINE_CONFIG, useValue: { registry } },
  ],
})
export class AppModule {}
```
