/**
 * @module for-angular/graph/execution/GraphExecutionStateMapper
 * @summary Maps graph execution events to Angular UI state updates.
 * @description Translates GraphExecutionEvent instances into updates for GraphNodeUiExecutionState and GraphEdgeUiExecutionState maps.
 */
import type { GraphExecutionEvent, GraphVisualState } from "@decaf-ts/integrations/graph/shared";

import type {
  GraphEdgeExecutionStateMap,
  GraphEdgeUiExecutionState,
  GraphNodeExecutionStateMap,
  GraphNodeUiExecutionState,
} from "../types";

const TERMINAL_NODE_STATUSES = new Set(['succeeded', 'failed', 'cached', 'skipped']);
const TERMINAL_EDGE_STATUSES = new Set(['succeeded', 'failed', 'skipped']);

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
    if (event.type === 'workflow.failed') {
      this.markUnexecutedSkipped(nodes, edges);
    }
    if (event.nodeId) this.applyNodeEvent(event, nodes);
    if (event.edgeId) this.applyEdgeEvent(event, edges);
  }

  /**
   * Derives the post-failure visual state for every node/edge that never
   * reached a terminal execution state: BLOCKED/pending/idiing nodes and
   * their un-routed edges are marked `skipped` (faded/disabled).
   */
  private markUnexecutedSkipped(
    nodes: GraphNodeExecutionStateMap,
    edges: GraphEdgeExecutionStateMap
  ): void {
    for (const [id, state] of Object.entries(nodes)) {
      if (!TERMINAL_NODE_STATUSES.has(state.status) && state.status !== 'failed') {
        nodes[id] = { ...state, status: 'skipped' };
      }
    }
    for (const [id, state] of Object.entries(edges)) {
      if (!TERMINAL_EDGE_STATUSES.has(state.status)) {
        edges[id] = { ...state, status: 'skipped' };
      }
    }
  }

  /**
   * Applies a node-scoped event to the node state map, mutating a per-node
   * entry in place. Handles the legacy `node.*`/`loop.*` events as before plus
   * the DECAF-48 visual-state events: `node.stateChanged` writes the
   * frontend-safe {@link GraphVisualState} (running/succeeded/failed/skipped)
   * with derived `startedAt`/`finishedAt`, and `node.skipped` marks the node
   * as not executed.
   * @param event Graph execution event carrying a `nodeId`.
   * @param nodes State map mutated in place for the event's node.
   */
  private applyNodeEvent(
    event: GraphExecutionEvent,
    nodes: GraphNodeExecutionStateMap
  ): void {
    const id = event.nodeId!;
    const existing = nodes[id] ?? {};
    const state: GraphNodeUiExecutionState = { ...existing };

    switch (event.type) {
      case "node.stateChanged": {
        const visualState = (event.payload as { state?: GraphVisualState } | undefined)?.state;
        if (visualState) {
          state.status = visualState;
          state.visualState = visualState;
          if (visualState === 'running') state.startedAt ??= event.timestamp.toISOString();
          if (visualState === 'succeeded' || visualState === 'failed' || visualState === 'skipped') {
            state.finishedAt ??= event.timestamp.toISOString();
          }
        }
        break;
      }
      case "node.started":
        state.status = "running";
        state.visualState = "running";
        state.startedAt = event.timestamp.toISOString();
        break;
      case "node.output":
        state.progress = event.payload;
        break;
      case "node.completed":
        state.status = "succeeded";
        state.visualState = "succeeded";
        state.finishedAt = event.timestamp.toISOString();
      if (event.payload && typeof event.payload === "object") {
        state.outputs = (event.payload as { outputs?: Record<string, unknown> }).outputs;
      }
        break;
      case "node.failed":
        state.status = "failed";
        state.visualState = "failed";
        state.finishedAt = event.timestamp.toISOString();
        state.error = event.error;
        break;
      case "node.cacheHit":
        state.fromCache = true;
        state.status = "cached";
        state.visualState = "succeeded";
        break;
      case "node.skipped":
        state.status = "skipped";
        state.visualState = "skipped";
        state.finishedAt = event.timestamp.toISOString();
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
        state.visualState = "running";
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
        state.visualState = "succeeded";
        state.finishedAt = event.timestamp.toISOString();
        break;
      default:
        break;
    }

    nodes[id] = state;
  }

  /**
   * Applies an edge-scoped event to the edge state map, mutating a per-edge
   * entry in place. `edge.stateChanged` writes the frontend-safe
   * {@link GraphVisualState} (which the edge template restyles from) and
   * `edge.valueRouted` marks the edge as having carried its value.
   * @param event Graph execution event carrying an `edgeId`.
   * @param edges State map mutated in place for the event's edge.
   */
  private applyEdgeEvent(
    event: GraphExecutionEvent,
    edges: GraphEdgeExecutionStateMap
  ): void {
    const id = event.edgeId!;
    const existing = edges[id] ?? {};
    const state: GraphEdgeUiExecutionState = { ...existing };

    if (event.type === "edge.stateChanged") {
      const visualState = (event.payload as { state?: GraphVisualState } | undefined)?.state;
      if (visualState) {
        state.status = visualState;
        state.visualState = visualState;
        if (visualState === 'succeeded' || visualState === 'failed' || visualState === 'skipped') {
          state.updatedAt = event.timestamp.toISOString();
        }
      }
    }

    if (event.type === "edge.valueRouted") {
      state.status = "succeeded";
      state.visualState = "succeeded";
      state.lastValue = (event.payload as { value?: unknown } | undefined)?.value;
      state.updatedAt = event.timestamp.toISOString();
    }

    edges[id] = state;
  }
}
