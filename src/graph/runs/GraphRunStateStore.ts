/**
 * @module for-angular/graph/runs/GraphRunStateStore
 * @summary Singleton signal store for the canonical run lifecycle (spec §4.14).
 * @description Owns the run lifecycle's Angular state (run id, workflow id,
 * current status, last observed sequence, last structured error) and folds
 * every canonical run envelope into the canvas execution state via the legacy
 * {@link GraphExecutionStateMapper} plus the run log console.
 *
 * The run's SSE client ({@link GraphRunEventClient}) owns the transport; this
 * store owns the state. The page forwards canonical envelopes here with a
 * single {@link applyEvent} call, so both the HTTP-created runs and the
 * run-status polling fallback share the same fold.
 */
import { Injectable, inject, signal } from '@angular/core';

import type {
  GraphExecutionErrorPayload,
  GraphExecutionEvent,
  GraphNodeInspectionPayload,
  GraphRunEventEnvelope,
  GraphRunStatus,
} from '@decaf-ts/integrations/graph/shared';
import { GraphExecutionEventType, GraphVisualState, isGraphRunStatus } from '@decaf-ts/integrations/graph/shared';

import {
  graphExecutionState,
} from '../execution/GraphExecutionStateService';
import { GraphExecutionStateMapper } from '../execution/GraphExecutionStateMapper';
import { graphRunLog } from '../execution/GraphRunLogStore';
import { graphInspection } from '../execution/GraphInspectionStore';
import type { GraphNodeExecutionStateMap, GraphEdgeExecutionStateMap } from '../types';
import type { GraphRunExecutionResult, GraphRunNodeResult } from './GraphRunClient';

/**
 * Angular signal store owning the canonical run lifecycle's state (§4.14):
 * the run's id, workflow reference, status, last observed sequence, and last
 * structured error. Also re-dispatches run envelopes through the legacy
 * {@link GraphExecutionStateMapper} and run log console.
 */
class GraphRunStateStore {
  /** Mapper reused for every {@link applyEvent} fold. */
  private readonly mapper = new GraphExecutionStateMapper();

  /** Run id of the run the canvas currently observes (server-issued). */
  readonly runId = signal<string | null>(null);
  /** Workflow id the run's document id aligned with (§4.16). */
  readonly workflowId = signal<string | null>(null);
  /** Run lifecycle status; `null` once no run is observing. */
  readonly status = signal<GraphRunStatus | null>(null);
  /** Run id that most recently finished on the canvas. */
  readonly lastRunId = signal<string | null>(null);
  /** Highest sequence observed from the current run's stream. */
  readonly lastSequence = signal<number | null>(null);
  /** Last structured failure payload received for the current run. */
  readonly lastError = signal<GraphExecutionErrorPayload | null>(null);

  /**
   * Starts observing a run: reseeds the run lifecycle signal state and clears
   * the previous run's bookkeeping so the canvas shows a fresh run.
   * @param descriptor The run's own lifecycle reset snapshot.
   * @param descriptor.runId The observed run's own id.
   * @param descriptor.workflowId The run's workflow reference.
   * @param descriptor.status The run's starting status (replayed from the
   *                          run's own status payload's `status` field).
   */
  beginObservation(descriptor: { runId: string; workflowId: string; status: GraphRunStatus | null }): void {
    this.runId.set(descriptor.runId);
    this.workflowId.set(descriptor.workflowId);
    this.status.set(descriptor.status);
    this.lastSequence.set(null);
    this.lastError.set(null);
  }

  /**
   * Folds a canonical run envelope into the canvas execution state, run log
   * console, and run lifecycle signals. The legacy mapper's event shape and
   * the run's own envelope shape are aligned per-event, so the canvas uses the
   * same fold path whatever replay/live path produced the envelope.
   * @param envelope A canonical run envelope replayed or streamed over SSE.
   */
  applyEvent(envelope: GraphRunEventEnvelope): void {
    const legacy = this.toLegacyEvent(envelope);
    const nodes: GraphNodeExecutionStateMap = { ...graphExecutionState.nodeStates() };
    const edges: GraphEdgeExecutionStateMap = { ...graphExecutionState.edgeStates() };
    this.mapper.apply(legacy, nodes, edges);
    graphExecutionState.nodeStates.set(nodes);
    graphExecutionState.edgeStates.set(edges);

    if (envelope.type === 'graph.run.log' && envelope.payload) {
      graphRunLog.append(envelope.payload as never);
    }

    this.observeEvent(envelope);
  }

  /**
   * Folds a terminal run's stored result (the `GET /graph/runs/:runId`
   * `result` payload, spec §4.16) into the run lifecycle signals and the
   * DECAF-48 §4.6 node I/O inspection payloads, so both sides of the
   * legacy/canonical cutover maintain the inspection parity required by
   * §4.14/§4.15. Resolving the run's `result` conservatively closes the
   * inspection payloads from the run's own node results.
   * @param result The terminal run's stored result, or `null` when the run
   *               ranks no stored result (cancelled before the engine landed
   *               one, or the store lost the run).
   */
  applyRunResult(result: GraphRunExecutionResult | null): void {
    if (!result) return;
    this.lastRunId.set(result.runId);
    this.status.set(isGraphRunStatus(result.status) ? result.status : null);
    const nodeResults = Object.values(result.nodeResults ?? {}) as GraphRunNodeResult[];
    if (!nodeResults.length) return;
    graphInspection.setMany(
      nodeResults.map((nodeResult) => this.toInspectionPayload(result, nodeResult)),
    );
  }

  /**
   * Shapes run-result node states into the shared inspection payloads
   * (DECAF-48 §4.6 shape carried across the cutover, §4.16).
   * @param result The run's stored result payload (node results host).
   * @param nodeResult Per-node engine result payload.
   */
  private toInspectionPayload(
    result: GraphRunExecutionResult,
    nodeResult: GraphRunNodeResult,
  ): GraphNodeInspectionPayload {
    return {
      runId: result.runId,
      workflowId: result.workflowId,
      nodeId: nodeResult.nodeId,
      state: graphRunNodeVisualStateOf(nodeResult.status),
      inputs: nodeResult.inputs ?? {},
      ...(nodeResult.outputs !== undefined ? { outputs: nodeResult.outputs } : {}),
      ...(nodeResult.error !== undefined
        ? { error: nodeResult.error as GraphExecutionErrorPayload }
        : {}),
    };
  }

  /**
   * Updates the run lifecycle's own signals for an observed envelope without
   * re-folding the canvas state (used for controlling signals such as the run
   * log console's open/collapsed state).
   * @param envelope A canonical run envelope replayed or streamed over SSE.
   */
  private observeEvent(envelope: GraphRunEventEnvelope): void {
    this.runId.set(envelope.runId);
    this.workflowId.set(envelope.workflowId);
    this.lastRunId.set(envelope.runId);
    this.lastSequence.set(envelope.sequence);
    if (envelope.error !== undefined) this.lastError.set(envelope.error as never);
    const runStatus = graphRunStatusOfEventType(envelope.type);
    if (runStatus) this.status.set(runStatus);
  }

  /**
   * Mirrors the legacy `workflow.failed` fold's visual semantics for the
   * `workflow.cancelled` status (§4.15): nodes/edges that never reached a
   * terminal execution state are demoted to `skipped` (faded/disabled), so a
   * cancelled run carries the mapper's post-terminal visual effect without a
   * dedicated mapper branch.
   * @param runId The observed run's id (unused; the fold is map-global).
   */
  markRunCancelled(): void {
    const nodes: GraphNodeExecutionStateMap = { ...graphExecutionState.nodeStates() };
    const edges: GraphEdgeExecutionStateMap = { ...graphExecutionState.edgeStates() };
    this.mapper.apply(
      {
        id: 'workflow.cancelled#0',
        sequence: 0,
        runId: this.runId() ?? '',
        parentRunId: undefined,
        workflowId: this.workflowId() ?? '',
        type: 'workflow.failed' as never,
        timestamp: new Date(),
        path: [],
      } as GraphExecutionEvent,
      nodes,
      edges,
    );
    graphExecutionState.nodeStates.set(nodes);
    graphExecutionState.edgeStates.set(edges);
  }

  /**
   * Shapes a canonical run envelope into the legacy mapper's event shape so
   * the canvas keeps one fold path.
   * @param envelope A canonical run envelope replayed or streamed over SSE.
   */
  private toLegacyEvent(envelope: GraphRunEventEnvelope): GraphExecutionEvent {
    return {
      id: `${envelope.runId}#${envelope.sequence}`,
      sequence: envelope.sequence,
      runId: envelope.runId,
      parentRunId: envelope.parentRunId,
      workflowId: envelope.workflowId,
      type: envelope.type,
      timestamp: new Date(envelope.timestamp),
      nodeId: envelope.nodeId,
      edgeId: envelope.edgeId,
      payload: envelope.payload,
      error: envelope.error,
      path: envelope.path ?? [],
    } as GraphExecutionEvent;
  }

  /**
   * Clears the run's lifecycle state and the legacy execution state's canvas
   * projection, leaving the pinned nodes as-is (they are the user's own).
   */
  reset(): void {
    this.runId.set(null);
    this.workflowId.set(null);
    this.status.set(null);
    this.lastRunId.set(null);
    this.lastSequence.set(null);
    this.lastError.set(null);
    graphExecutionState.reset();
  }
}

/** Singleton run lifecycle state store. */
export const graphRunState = new GraphRunStateStore();

/**
 * Shapes the run lifecycle's own state into a single snapshot for the run
 * inspector.
 * @returns The run lifecycle's own state snapshot, or `null` when no run has
 *          been observed yet.
 */
export function graphRunStateSnapshot(): {
  runId: string | null;
  workflowId: string | null;
  status: GraphRunStatus | null;
  lastRunId: string | null;
  lastSequence: number | null;
  lastError: GraphExecutionErrorPayload | null;
} | null {
  if (graphRunState.runId() === null) return null;
  return {
    runId: graphRunState.runId() as string,
    workflowId: graphRunState.workflowId() as string,
    status: graphRunState.status(),
    lastRunId: graphRunState.lastRunId(),
    lastSequence: graphRunState.lastSequence(),
    lastError: graphRunState.lastError(),
  };
}

/**
 * Maps a canonical run envelope's event type to the run lifecycle status it
 * carries (DECAF-50 §4.14/§4.15). `workflow.started` folds to `running`; the
 * three terminal event types fold to their run statuses; every other event
 * type (node/edge/log/loop) reports no run lifecycle transition.
 * @param type A canonical run envelope's event type.
 * @returns The run lifecycle status the event type folds, or `null` when the
 *          type carries no lifecycle transition.
 */
export function graphRunStatusOfEventType(type: string): GraphRunStatus | null {
  switch (type) {
    case GraphExecutionEventType.WORKFLOW_STARTED:
      return 'running';
    case GraphExecutionEventType.WORKFLOW_COMPLETED:
      return 'succeeded';
    case GraphExecutionEventType.WORKFLOW_FAILED:
      return 'failed';
    case GraphExecutionEventType.WORKFLOW_CANCELLED:
      return 'cancelled';
    default:
      return null;
  }
}

/**
 * Derives the DECAF-48 §4.6 inspection `state` value from an engine node
 * result's status (`GraphExecutionStatus` semantics normalized per §4.6).
 * @param status An engine node execution status from the run's stored result.
 * @returns The visual state to seed the inspection payload with.
 */
function graphRunNodeVisualStateOf(status: string): GraphVisualState {
  switch (status) {
    case 'running':
      return GraphVisualState.RUNNING;
    case 'cached':
    case 'succeeded':
      return GraphVisualState.SUCCEEDED;
    case 'failed':
      return GraphVisualState.FAILED;
    case 'cancelled':
    case 'skipped':
      return GraphVisualState.SKIPPED;
    default:
      return GraphVisualState.IDLE;
  }
}

/**
 * Resolves a run's own status's visual state from its terminal status (§4.14).
 * @param status A run lifecycle status (or an unknown field).
 * @returns The visual state for the run's terminal status; `undefined` for
 *          `null`/unknown statuses.
 */
export function graphRunStatusVisualStateOf(status: GraphRunStatus | null): GraphVisualState | undefined {
  if (!status) return undefined;
  switch (status) {
    case 'succeeded':
      return GraphVisualState.SUCCEEDED;
    case 'failed':
      return GraphVisualState.FAILED;
    case 'cancelled':
      return GraphVisualState.SKIPPED;
    default:
      return GraphVisualState.RUNNING;
  }
}
