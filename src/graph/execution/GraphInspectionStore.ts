/**
 * @module for-angular/graph/execution/GraphInspectionStore
 * @summary Singleton signal store for node I/O inspection (DECAF-48 §4.6).
 * @description Holds the per-run node inspection payloads surfaced by
 * `GET /graph/results/:runId` and the currently-opened inspection node id.
 * The node template disambiguates double-clicks with `has(nodeId)`, and the
 * inspection panel renders the split view (right = inputs, left = outputs or
 * error) from the payload.
 */
import { computed, signal } from '@angular/core';

import type { GraphExecutionErrorPayload, GraphNodeInspectionPayload } from '@decaf-ts/as-graph/shared';
import { GraphExecutionEventType, GraphVisualState } from '@decaf-ts/as-graph/shared';

/**
 * @description Minimal shape of a run event the event-derived inspection fold
 * ({@link graphInspectionPayloadsFromRunEvents}) reads, accepting both the
 * serialized events of a stored run result and the envelopes delivered over
 * SSE.
 * @summary Structural subset of the shared node event envelope: the fold only
 * depends on `type`/`nodeId`/`payload`/`error`, so timestamps and other
 * envelope fields may be dropped or stringified by the transport without
 * affecting the fold.
 * @interface
 * @property {string} [type] The node event's canonical type (a
 *                           `GraphExecutionEventType` value). Types the fold
 *                           does not recognize are ignored.
 * @property {string} [nodeId] Id of the node the event belongs to. Events
 *                             without a `nodeId` are skipped by the fold.
 * @property {unknown} [payload] The event's engine payload. The fold reads the
 *                               `state` field of `node.state_changed` events
 *                               and the `outputs` field of
 *                               `node.output`/`node.completed` events from it.
 * @property {unknown} [error] Structured failure payload carried by
 *                             `node.failed` events, folded into the payload's
 *                             `error` field as-is.
 */
export interface GraphInspectionRunEvent {
  type?: string;
  nodeId?: string;
  payload?: unknown;
  error?: unknown;
}

/**
 * @description Folds a run's observed event log into per-node
 * {@link GraphNodeInspectionPayload}s so the inspection split view renders for
 * every engine driver. The split view is designed around the per-node results
 * a backend persists on a terminal run (`GET /graph/runs/:runId` ->
 * `result.nodeResults`), but some engine drivers (the as-graph mastra driver,
 * SAA-829) stream every node lifecycle event yet persist an empty
 * `nodeResults`, leaving the panel nothing to render even for a completed run;
 * the observed event stream still carries each node's terminal state and
 * outputs, so this fold reconstructs the payload the split view needs.
 * @summary Best-effort by construction: a node's routed inputs are
 * engine-internal and are not carried by the shared node events, so `inputs`
 * is the empty record unless an event explicitly provides it. Callers must
 * merge these payloads *under* the persisted `nodeResults` (which do carry
 * inputs), never replace them.
 * @param runId The observed run's id, stamped on every returned payload.
 * @param workflowId The run's workflow reference, stamped on every returned
 *                   payload.
 * @param events The run's observed event log, as serialized by the stored run
 *               result (or any shape matching
 *               {@link GraphInspectionRunEvent}). Events without a `nodeId`
 *               are skipped; an absent log folds to no payloads.
 * @returns One {@link GraphNodeInspectionPayload} per node observed in the
 *          event log, in first-seen node order. Each node's last lifecycle
 *          event wins for `state`, and `outputs`/`error` are present only when
 *          an event provided them. An empty array when the log is empty or
 *          absent.
 * @example
 * ```ts
 * const payloads = graphInspectionPayloadsFromRunEvents(
 *   result.runId,
 *   result.workflowId,
 *   result.events,
 * );
 * graphInspection.setMany(payloads);
 * ```
 * @mermaid
 * sequenceDiagram
 *   autonumber
 *   participant C as Caller (GraphRunStateStore)
 *   participant F as graphInspectionPayloadsFromRunEvents
 *
 *   activate C
 *   C->>F: fold(runId, workflowId, events)
 *   deactivate C
 *   activate F
 *   loop Each event carrying a nodeId
 *     F->>F: Fold the event type into the node's fold (state, outputs, error)
 *   end
 *   F-->>C: Per-node GraphNodeInspectionPayload[]
 *   deactivate F
 *   activate C
 */
export function graphInspectionPayloadsFromRunEvents(
  runId: string,
  workflowId: string,
  events: readonly GraphInspectionRunEvent[] | undefined,
): GraphNodeInspectionPayload[] {
  interface NodeFold {
    state: GraphVisualState;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    error?: GraphExecutionErrorPayload;
  }

  const folds = new Map<string, NodeFold>();
  for (const event of events ?? []) {
    const nodeId = event?.nodeId;
    if (!nodeId) continue;
    const fold = folds.get(nodeId) ?? { state: GraphVisualState.IDLE };
    const payload = (event.payload ?? {}) as Record<string, unknown>;

    switch (event.type) {
      case GraphExecutionEventType.NODE_STARTED:
      case GraphExecutionEventType.NODE_QUEUED:
        fold.state = GraphVisualState.RUNNING;
        break;
      case GraphExecutionEventType.NODE_STATE_CHANGED: {
        const state = payload['state'];
        if (typeof state === 'string') fold.state = state as GraphVisualState;
        break;
      }
      case GraphExecutionEventType.NODE_OUTPUT:
        if (payload['outputs'] !== undefined) {
          fold.outputs = payload['outputs'] as Record<string, unknown>;
        }
        break;
      case GraphExecutionEventType.NODE_COMPLETED:
        fold.state = GraphVisualState.SUCCEEDED;
        if (payload['outputs'] !== undefined) {
          fold.outputs = payload['outputs'] as Record<string, unknown>;
        }
        break;
      case GraphExecutionEventType.NODE_CACHE_HIT:
        fold.state = GraphVisualState.SUCCEEDED;
        break;
      case GraphExecutionEventType.NODE_FAILED:
        fold.state = GraphVisualState.FAILED;
        if (event.error !== undefined) {
          fold.error = event.error as GraphExecutionErrorPayload;
        }
        break;
      case GraphExecutionEventType.NODE_SKIPPED:
        fold.state = GraphVisualState.SKIPPED;
        break;
      default:
        break;
    }
    folds.set(nodeId, fold);
  }

  return [...folds.entries()].map(([nodeId, fold]) => ({
    runId,
    workflowId,
    nodeId,
    state: fold.state,
    inputs: fold.inputs ?? {},
    ...(fold.outputs !== undefined ? { outputs: fold.outputs } : {}),
    ...(fold.error !== undefined ? { error: fold.error } : {}),
  }));
}

/**
 * Angular-signal store for node I/O inspection. Holds the per-node inspection
 * payloads for the current run (keyed by node id) plus the currently-opened
 * node, exposing derived `openPayload`/`isOpen` signals. The node template
 * disambiguates double-clicks with {@link has}, and the inspection panel
 * renders the split view (right = inputs, left = outputs or error) from the
 * open payload.
 */
class GraphInspectionStore {
  /** Per-node inspection payloads keyed by node id for the current run. */
  readonly inspections = signal<Record<string, GraphNodeInspectionPayload>>({});
  /** Id of the node currently shown in the inspection panel, or `null`. */
  readonly openNodeId = signal<string | null>(null);

  /**
   * Inspection payload of the currently-open node, or `null` when nothing is
   * open or the node has no payload yet.
   */
  readonly openPayload = computed<GraphNodeInspectionPayload | null>(() => {
    const nodeId = this.openNodeId();
    if (!nodeId) return null;
    return this.inspections()[nodeId] ?? null;
  });

  /** Whether the inspection panel is currently shown. */
  readonly isOpen = computed(() => this.openNodeId() !== null);

  /**
   * Records (or replaces) the inspection payload for a single node.
   * @param payload The engine's per-node result payload (DECAF-48 §4.6).
   */
  set(payload: GraphNodeInspectionPayload): void {
    this.inspections.update((current) => ({ ...current, [payload.nodeId]: payload }));
  }

  /**
   * Records multiple node payloads (e.g. the whole `GET /graph/results/:runId`
   * fold). No-op for an empty array.
   * @param payloads Inspection payloads to merge into the store.
   */
  setMany(payloads: GraphNodeInspectionPayload[]): void {
    if (!payloads.length) return;
    this.inspections.update((current) => {
      const next = { ...current };
      for (const payload of payloads) {
        next[payload.nodeId] = payload;
      }
      return next;
    });
  }

  /**
   * Whether a node has already executed (and therefore has a payload to show
   * on double-click). Nodes without payloads fall back to the edit modal.
   */
  has(nodeId: string): boolean {
    return this.inspections()[nodeId] != null;
  }

  /** Opens the inspection panel for the given node. */
  open(nodeId: string): void {
    this.openNodeId.set(nodeId);
  }

  /** Closes the inspection panel. */
  close(): void {
    this.openNodeId.set(null);
  }

  /**
   * Toggles the panel for a node: opens it when closed or showing another
   * node, closes it when already showing this node.
   * @param nodeId Node whose panel should be flipped.
   */
  toggle(nodeId: string): void {
    this.openNodeId.update((current) => (current === nodeId ? null : nodeId));
  }

  /** Clears all payloads and closes the panel for the next run. */
  reset(): void {
    this.inspections.set({});
    this.openNodeId.set(null);
  }
}

/** Singleton shared by the page wiring, node template, and inspection panel. */
export const graphInspection = new GraphInspectionStore();
