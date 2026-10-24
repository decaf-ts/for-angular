/**
 * @module for-angular/graph/execution/GraphExecutionStateMapper
 * @summary Maps graph execution events to Angular UI state updates.
 * @description Translates GraphExecutionEvent instances into updates for GraphNodeUiExecutionState and GraphEdgeUiExecutionState maps.
 */
import type { GraphExecutionEvent, GraphVisualState } from "@decaf-ts/as-graph/shared";

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
      this.markRunFailure(event, nodes);
      this.markUnexecutedSkipped(nodes, edges);
    } else if (event.type === 'workflow.cancelled') {
      // Cancellation is not a failure: unexecuted nodes stay `skipped` rather
      // than being anchored as the run's failed node.
      this.markUnexecutedSkipped(nodes, edges);
    }
    if (event.nodeId) this.applyNodeEvent(event, nodes);
    if (event.edgeId) this.applyEdgeEvent(event, edges);
  }

  /**
   * Anchors a run-level failure on the node the run was working on (SAA-1361
   * D8): engines may fail the run without emitting a `node.failed` event
   * (pre-execution validation, an execution gate, an engine-level abort), and
   * a canvas of neutral/skipped nodes then reads as success. When no node is
   * already failed, the running node — or else the first node still waiting to
   * execute — is marked failed with the run's structured error.
   */
  private markRunFailure(
    event: GraphExecutionEvent,
    nodes: GraphNodeExecutionStateMap
  ): void {
    if (Object.values(nodes).some((state) => state.status === 'failed')) return;
    const anchorId =
      (event.nodeId && nodes[event.nodeId] ? event.nodeId : undefined) ??
      this.failureAnchorId(nodes);
    if (!anchorId) return;
    const state = nodes[anchorId] ?? { status: 'failed' };
    nodes[anchorId] = {
      ...state,
      status: 'failed',
      visualState: 'failed',
      finishedAt: state.finishedAt ?? event.timestamp.toISOString(),
      ...(event.error ? { error: event.error } : {}),
    };
  }

  /**
   * Picks the node a run-level failure is anchored on: the node still running,
   * else the first node that never reached a terminal state. A run whose nodes
   * all succeeded has no failure anchor.
   */
  private failureAnchorId(
    nodes: GraphNodeExecutionStateMap
  ): string | undefined {
    const entries = Object.entries(nodes);
    const running = entries.find(([, state]) => state.status === 'running');
    if (running) return running[0];
    const waiting = entries.find(
      ([, state]) => state.status === 'blocked' || state.status === 'pending' || state.status === 'idle'
    );
    if (waiting) return waiting[0];
    const nonTerminal = entries.find(([, state]) => !TERMINAL_NODE_STATUSES.has(state.status));
    return nonTerminal?.[0];
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
