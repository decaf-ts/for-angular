/**
 * @module for-angular/graph/execution/GraphExecutionStateMapper
 * @summary Maps graph execution events to Angular UI state updates.
 * @description Translates GraphExecutionEvent instances into updates for GraphNodeUiExecutionState and GraphEdgeUiExecutionState maps.
 */
import type { GraphExecutionEvent } from "@decaf-ts/integrations/graph/shared";

import type {
  GraphEdgeExecutionStateMap,
  GraphEdgeUiExecutionState,
  GraphNodeExecutionStateMap,
  GraphNodeUiExecutionState,
} from "../types";

/**
 * Maps graph execution events to incremental updates of the Angular renderer
 * state maps.
 */
export class GraphExecutionStateMapper {
  /**
   * Applies an event to the given node and edge state maps, mutating them
   * in place.
   */
  apply(
    event: GraphExecutionEvent,
    nodes: GraphNodeExecutionStateMap,
    edges: GraphEdgeExecutionStateMap
  ): void {
    if (event.nodeId) this.applyNodeEvent(event, nodes);
    if (event.edgeId) this.applyEdgeEvent(event, edges);
  }

  private applyNodeEvent(
    event: GraphExecutionEvent,
    nodes: GraphNodeExecutionStateMap
  ): void {
    const id = event.nodeId!;
    const existing = nodes[id] ?? {};
    const state: GraphNodeUiExecutionState = { ...existing };

    switch (event.type) {
      case "node.started":
        state.status = "running";
        state.startedAt = event.timestamp.toISOString();
        break;
      case "node.output":
        state.progress = event.payload;
        break;
      case "node.completed":
        state.status = "succeeded";
        state.finishedAt = event.timestamp.toISOString();
      if (event.payload && typeof event.payload === "object") {
        state.outputs = (event.payload as { outputs?: Record<string, unknown> }).outputs;
      }
        break;
      case "node.failed":
        state.status = "failed";
        state.finishedAt = event.timestamp.toISOString();
        state.error = event.error;
        break;
      case "node.cacheHit":
        state.fromCache = true;
        state.status = "cached";
        break;
      case "node.pinned":
        state.pinned = true;
        break;
      case "node.unpinned":
        state.pinned = false;
        break;
      case "loop.started":
        state.loop = state.loop ?? {};
        state.status = "running";
        break;
      case "loop.iteration.started":
        state.loop = state.loop ?? {};
        state.loop.currentIteration = event.iteration;
        break;
      case "loop.iteration.completed":
        state.loop = state.loop ?? {};
        state.loop.completedIterations =
          (state.loop.completedIterations ?? 0) + 1;
        break;
      case "loop.completed":
        state.status = "succeeded";
        state.finishedAt = event.timestamp.toISOString();
        break;
      default:
        break;
    }

    nodes[id] = state;
  }

  private applyEdgeEvent(
    event: GraphExecutionEvent,
    edges: GraphEdgeExecutionStateMap
  ): void {
    const id = event.edgeId!;
    const existing = edges[id] ?? {};
    const state: GraphEdgeUiExecutionState = { ...existing };

    if (event.type === "edge.valueRouted") {
      state.status = "succeeded";
      state.lastValue = (event.payload as { value?: unknown } | undefined)?.value;
      state.updatedAt = event.timestamp.toISOString();
    }

    edges[id] = state;
  }
}
