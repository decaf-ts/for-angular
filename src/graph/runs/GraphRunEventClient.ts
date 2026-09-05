/**
 * @module for-angular/graph/runs/GraphRunEventClient
 * @summary Angular client for the canonical run SSE stream (spec §4.15).
 * @description Connects to the backend run's SSE endpoint
 * (`GET /graph/runs/:runId/events`) once the `202` run-create response hands
 * back an `eventsUrl`, replays the run's recorded events from sequence zero,
 * and dispatches every replayed or live envelope to a per-run handler while
 * the run state store folds them into the canvas execution state.
 *
 * DECAF-50 §4.15 client requirements:
 *  1. Connects after the `202` response and requests from sequence zero.
 *  2. Reconnects from the last received sequence on a stream drop. A bounded
 *     retry budget followed by run-status polling via
 *     {@link GraphRunClient.getStatus} covers unreachable backends.
 *  3. Stops after a terminal event; the canonical result is re-kept via
 *     {@link GraphRunClient.getRunResult}.
 *
 * The SSE implementation is intentionally injectable so jsdom test
 * environments (which ship no `EventSource`) can substitute a stub and drive
 * the transparency verdicts: {@link GRAPH_RUN_EVENT_SOURCE} defaults to the
 * browser's `globalThis.EventSource`.
 */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { InternalError } from '@decaf-ts/db-decorators';

import type {
  GraphRunEventEnvelope,
  GraphRunStatus,
} from '@decaf-ts/ui-decorators/graph';
import {
  GraphExecutionEventType,
  isGraphRunTerminalEventType,
  isGraphRunTerminalStatus,
} from '@decaf-ts/ui-decorators/graph';

import {
  GRAPH_BACKEND_URL,
  GraphBackendUnavailableError,
} from '../execution/GraphExecutionService';
import {
  GraphRunClient,
  graphRunEventEnvelopeOf,
  GraphRunStatusResult,
} from './GraphRunClient';

/**
 * Injectable native `EventSource` constructor used to open run SSE streams.
 * Defaults to the browser's global `EventSource`; a jsdom test environment
 * substitutes a stub, since jsdom implements no SSE protocol.
 */
export const GRAPH_RUN_EVENT_SOURCE = new InjectionToken<typeof EventSource>(
  'GRAPH_RUN_EVENT_SOURCE',
  {
    providedIn: 'root',
    factory: () =>
      ((globalThis as { EventSource?: typeof EventSource }).EventSource ??
        undefined) as typeof EventSource,
  },
);

/** Run-side wire contract for opening a run's SSE stream. */
export interface GraphRunEventClientDescriptor {
  /** The run's unique id. */
  runId: string;
  /** The run's SSE endpoint path (e.g. `/graph/runs/<runId>/events`). */
  eventsUrl: string;
  /** Replay offset the backend streams after; defaults to 0. */
  afterSequence?: number;
}

/** Per-run handler receiving the run's replayed/live envelopes. */
export interface GraphRunEventClientSubscriber {
  /** Receives every envelope streamed by the backend, in sequence order. */
  onEvent(envelope: GraphRunEventEnvelope): void;
  /** Receives the terminal envelope once, before the stream is closed. */
  onTerminal(envelope: GraphRunEventEnvelope): void;
  /** Receives a stream failure once; the handler may switch to polling. */
  onError(error: unknown): void;
}

/** Reconnect attempts before falling back to run-status polling. */
const GRAPH_RUN_SSE_RECONNECT_LIMIT = 3;

/** Delay between reconnect attempts, in milliseconds. */
const GRAPH_RUN_SSE_RECONNECT_DELAY_MS = 1000;

/** Run-status polling fallback interval, in milliseconds. */
const GRAPH_RUN_POLL_INTERVAL_MS = 1000;

/**
 * Parses the run's SSE payload into a canonical envelope shape; returns `null`
 * when the payload is absent or carries an out-of-contract shape.
 */
function parseRunEventEnvelope(raw: unknown): GraphRunEventEnvelope | null {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return graphRunEventEnvelopeOf(parsed);
  } catch {
    return null;
  }
}

/**
 * Maps a polled run status to the run's own synthetic terminal event type
 * (the SSE's terminal event types' semantics, per §4.15). Non-terminal run
 * statuses fall back to `workflow.started` so the fold still carries a record
 * of the run's lifecycle.
 */
function graphRunStatusEventTypeOf(status: string): GraphExecutionEventType {
  switch (status) {
    case 'succeeded':
      return GraphExecutionEventType.WORKFLOW_COMPLETED;
    case 'failed':
      return GraphExecutionEventType.WORKFLOW_FAILED;
    case 'cancelled':
      return GraphExecutionEventType.WORKFLOW_CANCELLED;
    default:
      return GraphExecutionEventType.WORKFLOW_STARTED;
  }
}

/**
 * Shapes a polled run status into the run's SSE's own envelope's semantics.
 */
function graphRunStatusEventOf(
  runId: string,
  status: GraphRunStatusResult,
): GraphRunEventEnvelope {
  return {
    runId,
    workflowId: status.workflowId,
    sequence: 0,
    type: graphRunStatusEventTypeOf(status.status),
    timestamp: new Date().toISOString(),
    ...(status.result !== undefined ? { payload: status.result } : {}),
    ...(status.error !== undefined ? { error: status.error } : {}),
  } as GraphRunEventEnvelope;
}

/**
 * Angular client for the run's canonical SSE stream. Owns the EventSource
 * wiring, reconnection bookkeeping, and the run-status polling fallback; the
 * run state store owns the fold into canvas execution state.
 */
@Injectable({ providedIn: 'root' })
export class GraphRunEventClient {
  /**
   * Injected `EventSource` constructor (the real class in browsers, a stub in
   * jsdom).
   */
  private readonly sourceCtor = inject(GRAPH_RUN_EVENT_SOURCE, { optional: false });
  /** Injected backend base URL, mirroring {@link GRAPH_BACKEND_URL}. */
  private readonly backendUrl = inject(GRAPH_BACKEND_URL);
  /** Canonical status/result HTTP client used by the polling fallback. */
  private readonly runClient = inject(GraphRunClient);

  /** Live SSE connections keyed by the run's id. */
  private readonly connections = new Map<string, EventSource>();
  /** Active handlers keyed by the run's id. */
  private readonly subscribers = new Map<string, GraphRunEventClientSubscriber>();
  /** Per-run replay offsets (the highest sequence observed on the stream). */
  private readonly lastSequences = new Map<string, number>();
  /** Per-run reconnect attempt counters, reset on every successful open. */
  private readonly attempts = new Map<string, number>();
  /** Per-run reconnect timers from the stream-drop path. */
  private readonly reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Per-run fallback poll timers started once the retry budget is exhausted. */
  private readonly pollTimers = new Map<string, ReturnType<typeof setInterval>>();

  /**
   * Opens the run's SSE stream and dispatches inbound envelopes to `handler`.
   * Replays from `afterSequence` (defaulting to 0, the spec's replay-from-
   * sequence-zero semantics); on a stream drop it reconnects from the last
   * observed sequence until the retry budget is exhausted, then hands the
   * failure to the handler so it can fall back to run-status polling.
   * @param descriptor The run's SSE wire contract.
   * @param handler Subscriber receiving the run's replayed/live envelopes.
   * @throws {@link GraphBackendUnavailableError} when the environment provides
   *         no `EventSource` constructor (e.g. a plain jsdom test sandbox).
   * @throws {Error} when a connection for this run is already live.
   */
  connect(
    descriptor: GraphRunEventClientDescriptor,
    handler: GraphRunEventClientSubscriber,
  ): void {
    if (this.connections.has(descriptor.runId)) {
      throw new InternalError(
        `Graph run event stream already connected for run '${descriptor.runId}'`,
      );
    }
    if (typeof this.sourceCtor !== 'function') {
      throw new GraphBackendUnavailableError(
        'Graph run event source is unavailable in this environment.',
      );
    }

    this.subscribers.set(descriptor.runId, handler);
    this.lastSequences.set(
      descriptor.runId,
      Math.max(descriptor.afterSequence ?? 0, 0),
    );
    this.attempts.set(descriptor.runId, 0);
    this.open(descriptor);
  }

  /**
   * Closes the run's SSE stream and clears its surrounding bookkeeping.
   * @param runId The run's unique id.
   */
  disconnect(runId: string): void {
    this.close(runId);
    const reconnectTimer = this.reconnectTimers.get(runId);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    this.reconnectTimers.delete(runId);
    const pollTimer = this.pollTimers.get(runId);
    if (pollTimer) clearInterval(pollTimer);
    this.pollTimers.delete(runId);
    this.subscribers.delete(runId);
    this.attempts.delete(runId);
    this.lastSequences.delete(runId);
  }

  private open(descriptor: GraphRunEventClientDescriptor): void {
    const offset = Math.max(this.lastSequences.get(descriptor.runId) ?? 0, 0);
    const url = `${this.backendUrl}${descriptor.eventsUrl}?afterSequence=${offset}`;
    const source = new this.sourceCtor(url, { withCredentials: true });

    source.onmessage = (ev: MessageEvent) => {
      const envelope = parseRunEventEnvelope(ev.data);
      if (!envelope) return;
      this.lastSequences.set(descriptor.runId, envelope.sequence);
      this.subscribers.get(descriptor.runId)?.onEvent(envelope);
      if (!isGraphRunTerminalEventType(envelope.type)) return;
      this.close(descriptor.runId);
      this.subscribers.get(descriptor.runId)?.onTerminal(envelope);
    };

    source.onerror = () => {
      if (!this.connections.has(descriptor.runId)) return;
      this.close(descriptor.runId);
      this.scheduleReconnect(descriptor);
    };

    this.connections.set(descriptor.runId, source);
  }

  /**
   * Closes an SSE connection without touching the surrounding bookkeeping
   * (the reconnect path still relies on the last observed sequence).
   */
  private close(runId: string): void {
    const source = this.connections.get(runId);
    if (!source) return;
    try {
      source.close();
    } finally {
      this.connections.delete(runId);
    }
  }

  /**
   * Accepts a single navigator redirect against the run's SSE stream:
   * reconnects from the last observed sequence and increments the attempt
   * counter. When the counter exceeds {@link GRAPH_RUN_SSE_RECONNECT_LIMIT}
   * the client hands a {@link GraphBackendUnavailableError} to the handler so
   * it can fall back to run-status polling.
   */
  private scheduleReconnect(descriptor: GraphRunEventClientDescriptor): void {
    const handler = this.subscribers.get(descriptor.runId);
    const nextAttempt = (this.attempts.get(descriptor.runId) ?? 0) + 1;

    if (nextAttempt > GRAPH_RUN_SSE_RECONNECT_LIMIT) {
      this.attempts.delete(descriptor.runId);
      handler?.onError(
        new GraphBackendUnavailableError(
          `Graph run event stream dropped for run '${descriptor.runId}' after ${GRAPH_RUN_SSE_RECONNECT_LIMIT} retries.`,
        ),
      );
      this.startStatusPolling(descriptor.runId);
      return;
    }

    this.attempts.set(descriptor.runId, nextAttempt);
    this.reconnectTimers.set(
      descriptor.runId,
      setTimeout(() => {
        this.reconnectTimers.delete(descriptor.runId);
        this.open(descriptor);
      }, GRAPH_RUN_SSE_RECONNECT_DELAY_MS),
    );
  }

  /**
   * Starts the run-status polling fallback once the SSE retry budget is
   * exhausted (§4.15: "falls back to run-status polling when SSE is
   * unavailable"). Each poll re-dispatches the run's own status shape as a
   * canonical envelope through `handler.onEvent`; when the run reaches a
   * terminal status the run's own terminal envelope is handed to
   * `handler.onTerminal` and the timer clears itself.
   * @param runId The run's unique id.
   */
  private startStatusPolling(runId: string): void {
    if (this.pollTimers.has(runId)) return;
    const handler = this.subscribers.get(runId);
    if (!handler) return;

    const timer = setInterval(() => {
      void (async () => {
        const status = await this.runClient.getStatus(runId);
        if (!status) return;
        if (!isGraphRunTerminalStatus(status.status as GraphRunStatus)) {
          handler.onEvent(graphRunStatusEventOf(runId, status));
          return;
        }
        handler.onTerminal(graphRunStatusEventOf(runId, status));
        clearInterval(this.pollTimers.get(runId));
        this.pollTimers.delete(runId);
      })();
    }, GRAPH_RUN_POLL_INTERVAL_MS);
    this.pollTimers.set(runId, timer);
  }
}
