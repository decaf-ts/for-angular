/**
 * @module for-angular/graph/runs/GraphRunLifecycle.spec
 * @summary DECAF-50 §4.19 Angular run-row tests: run lifecycle, replay/reconnect,
 * terminal stop, and polling fallback for the P6-F canonical run cutover.
 * @description Covers the canonical run trio against the DECAF-50 §4.14/§4.15
 * contract:
 *
 * - {@link GraphRunClient}: the exact `POST /graph/runs` fetch surface (the
 *   `202` created-run shape resolving before the engine finishes), the
 *   created-response contract (`SerializationError` on out-of-contract
 *   payloads), the Decaf-only HTTP error mapping (contract §1.1.3), the
 *   status/result reads, and the idempotent `DELETE /graph/runs/:runId`
 *   cancellation.
 * - {@link GraphRunEventClient}: replay from sequence zero, ordered
 *   `onEvent` delivery, reconnect from the last observed sequence, the
 *   bounded reconnect budget followed by the run-status polling fallback
 *   (polled statuses mapped onto the matching synthetic terminal event
 *   types), terminal stop, and `disconnect` bookkeeping teardown.
 * - {@link graphRunState}: the DECAF-48 parity fold — run envelopes land in
 *   the same `graphExecutionState`/`graphRunLog`/`graphInspection` stores
 *   through the same {@link GraphExecutionStateMapper}, the run-status fold,
 *   the stored-result inspection readout, and the cancelled-run skipped
 *   demotion.
 *
 * The SSE transport is the jsdom-injectable {@link GRAPH_RUN_EVENT_SOURCE}
 * stub (jsdom ships no `EventSource`); HTTP is a routed `fetch` mock.
 */
import { TestBed } from '@angular/core/testing';
import {
  AuthorizationError,
  ForbiddenError,
} from '@decaf-ts/core';
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  SerializationError,
} from '@decaf-ts/db-decorators';
import type { GraphRunEventEnvelope } from '@decaf-ts/integrations/graph/shared';
import { GraphExecutionEventType } from '@decaf-ts/integrations/graph/shared';

import {
  GRAPH_BACKEND_URL,
  GraphBackendUnavailableError,
} from '../execution/GraphExecutionService';
import { graphExecutionState } from '../execution/GraphExecutionStateService';
import { graphRunLog } from '../execution/GraphRunLogStore';
import { graphInspection } from '../execution/GraphInspectionStore';
import { GraphRunClient } from './GraphRunClient';
import {
  GraphRunEventClient,
  GRAPH_RUN_EVENT_SOURCE,
} from './GraphRunEventClient';
import {
  graphRunState,
  graphRunStateSnapshot,
  graphRunStatusOfEventType,
  graphRunStatusVisualStateOf,
} from './GraphRunStateStore';

const BACKEND_URL = 'http://backend.test';
const RUN_ID = 'run-1';
const WORKFLOW_ID = 'wf-1';
const EVENTS_URL = `/graph/runs/${RUN_ID}/events`;

/**
 * jsdom stand-in for the browser `EventSource`, substituted through the
 * {@link GRAPH_RUN_EVENT_SOURCE} token. Records every opened instance so the
 * suites can assert replay offsets, reconnect URLs, and close behavior.
 */
class StubEventSource {
  static instances: StubEventSource[] = [];

  readonly url: string;
  readonly options: unknown;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  closeSpy = jest.fn();

  constructor(url: string, options?: unknown) {
    this.url = url;
    this.options = options;
    StubEventSource.instances.push(this);
  }

  close(): void {
    this.closeSpy();
  }

  /** Delivers an SSE frame exactly like the browser transport would. */
  emit(data: unknown): void {
    this.onmessage?.({ data });
  }

  /** Signals a stream drop exactly like the browser transport would. */
  drop(): void {
    this.onerror?.();
  }

  static reset(): void {
    StubEventSource.instances = [];
  }
}

/** Builds a canonical run envelope with sensible defaults. */
function envelope(
  sequence: number,
  type: GraphExecutionEventType,
  extra: Record<string, unknown> = {},
): GraphRunEventEnvelope {
  return {
    runId: RUN_ID,
    workflowId: WORKFLOW_ID,
    sequence,
    type,
    timestamp: '2026-01-01T00:00:00.000Z',
    ...extra,
  } as GraphRunEventEnvelope;
}

/** Minimal fetch `Response` stand-in routed by URL/method. */
function httpResponse(body: unknown, status = 200): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  } as never as Response;
}

/** Creates the routed fetch mock shared by the client suites. */
function routedFetch(routes: Array<(url: string, init?: RequestInit) => Response | null>): jest.Mock {
  return jest.fn((url: string, init?: RequestInit) => {
    for (const route of routes) {
      const response = route(url, init);
      if (response) return Promise.resolve(response);
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  }) as never as jest.Mock;
}

describe('GraphRunLifecycle (DECAF-50 §4.19 Angular run row)', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    StubEventSource.reset();
    graphExecutionState.reset();
    graphRunLog.reset();
    graphInspection.reset();
    graphRunState.reset();
    TestBed.configureTestingModule({
      providers: [
        { provide: GRAPH_BACKEND_URL, useValue: BACKEND_URL },
        { provide: GRAPH_RUN_EVENT_SOURCE, useValue: StubEventSource },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('GraphRunClient — POST /graph/runs contract (§4.14)', () => {
    const created = {
      runId: RUN_ID,
      workflowId: WORKFLOW_ID,
      status: 'queued',
      eventsUrl: EVENTS_URL,
      resultUrl: `/graph/runs/${RUN_ID}/result`,
    };

    it('posts the canonical document and resolves the 202 created-run shape', async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === 'POST'
            ? httpResponse(created, 202)
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      const workflow = { id: WORKFLOW_ID, name: 'wf', inputs: [], outputs: [], nodes: [], edges: [] };
      const result = await client.createRun({ workflow, inputs: { count: 1 } });

      expect(result).toEqual(created);
      expect(fetchMock).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/runs`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }),
      );
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({
        workflow,
        inputs: { count: 1 },
      });
    });

    it('posts workflowId-only create requests without a workflow leg', async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === 'POST'
            ? httpResponse(created, 202)
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      await client.createRun({ workflowId: WORKFLOW_ID, inputs: { count: 2 } });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body['workflowId']).toBe(WORKFLOW_ID);
      expect(body['workflow']).toBeUndefined();
      expect(body['inputs']).toEqual({ count: 2 });
    });

    it('rejects out-of-contract created responses with SerializationError', async () => {
      const cases: unknown[] = [
        { workflowId: WORKFLOW_ID, status: 'queued', eventsUrl: EVENTS_URL, resultUrl: '/r' },
        { runId: '', workflowId: WORKFLOW_ID, status: 'queued', eventsUrl: EVENTS_URL, resultUrl: '/r' },
        { runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'queued', eventsUrl: '', resultUrl: '/r' },
        { runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'queued', eventsUrl: EVENTS_URL, resultUrl: 42 },
      ];
      for (const payload of cases) {
        globalThis.fetch = routedFetch([
          (url, init) =>
            url === `${BACKEND_URL}/graph/runs` && init?.method === 'POST'
              ? httpResponse(payload, 202)
              : null,
        ]) as never as typeof globalThis.fetch;
        const client = TestBed.inject(GraphRunClient);
        await expect(client.createRun({ workflowId: WORKFLOW_ID })).rejects.toThrow(
          SerializationError,
        );
      }
    });

    it.each([
      [400, BadRequestError],
      [401, AuthorizationError],
      [403, ForbiddenError],
      [404, NotFoundError],
      [500, InternalError],
      [503, InternalError],
    ] as const)(
      'maps run create HTTP %s onto the Decaf error hierarchy',
      async (status, errorType) => {
        globalThis.fetch = routedFetch([
          (url, init) =>
            url === `${BACKEND_URL}/graph/runs` && init?.method === 'POST'
              ? httpResponse('backend said no', status)
              : null,
        ]) as never as typeof globalThis.fetch;

        const client = TestBed.inject(GraphRunClient);
        const rejection = client.createRun({ workflowId: WORKFLOW_ID });
        await expect(rejection).rejects.toThrow(errorType);
      },
    );

    it('surfaces an unreachable backend as GraphBackendUnavailableError', async () => {
      globalThis.fetch = jest.fn(() =>
        Promise.reject(new TypeError('fetch failed')),
      ) as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      await expect(client.createRun({ workflowId: WORKFLOW_ID })).rejects.toThrow(
        GraphBackendUnavailableError,
      );
    });

    it('reads run status from GET /graph/runs/:runId', async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs/${RUN_ID}` && init?.method === 'GET'
            ? httpResponse({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' })
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      const status = await client.getStatus(RUN_ID);

      expect(status).toEqual({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' });
      expect(fetchMock).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/runs/${RUN_ID}`,
        expect.objectContaining({ method: 'GET', credentials: 'include' }),
      );
    });

    it('resolves null run status for absent, failing, and unreachable runs', async () => {
      const variants: Array<jest.Mock> = [
        routedFetch([
          (url) => (url === `${BACKEND_URL}/graph/runs/${RUN_ID}` ? httpResponse('gone', 404) : null),
        ]),
        routedFetch([
          (url) => (url === `${BACKEND_URL}/graph/runs/${RUN_ID}` ? httpResponse('boom', 500) : null),
        ]),
        jest.fn(() => Promise.reject(new TypeError('fetch failed'))) as never as jest.Mock,
      ];
      for (const fetchMock of variants) {
        globalThis.fetch = fetchMock as never as typeof globalThis.fetch;
        const client = TestBed.inject(GraphRunClient);
        expect(await client.getStatus(RUN_ID)).toBeNull();
      }
    });

    it('reads the stored run result and resolves null when absent', async () => {
      const result = {
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        document: { id: WORKFLOW_ID, name: 'wf', inputs: [], outputs: [], nodes: [], edges: [] },
        inputs: {},
        outputs: { ok: true },
        nodeResults: {},
        events: [],
      };
      const fetchMock = routedFetch([
        (url) =>
          url === `${BACKEND_URL}/graph/runs/${RUN_ID}`
            ? httpResponse({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'succeeded', result })
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      await expect(client.getRunResult(RUN_ID)).resolves.toEqual(result);
      await expect(client.fetchRunResult(RUN_ID)).resolves.toEqual(result);

      globalThis.fetch = routedFetch([
        (url) =>
          url === `${BACKEND_URL}/graph/runs/${RUN_ID}`
            ? httpResponse({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' })
            : null,
      ]) as never as typeof globalThis.fetch;
      await expect(client.getRunResult(RUN_ID)).resolves.toBeNull();
    });

    it('cancels a live run through DELETE /graph/runs/:runId and stays idempotent for terminal runs', async () => {
      const terminalRun = {
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'cancelled',
      };
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs/${RUN_ID}` && init?.method === 'DELETE'
            ? httpResponse(terminalRun, 200)
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      const cancelled = await client.cancelRun(RUN_ID);

      expect(cancelled).toEqual(terminalRun);
      expect(fetchMock).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/runs/${RUN_ID}`,
        expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
      );
      // Idempotent for terminal runs: the backend still returns the run.
      await expect(client.cancelRun(RUN_ID)).resolves.toEqual(terminalRun);
    });

    it('maps cancellation HTTP failures onto the Decaf error hierarchy', async () => {
      globalThis.fetch = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs/${RUN_ID}` && init?.method === 'DELETE'
            ? httpResponse('not found', 404)
            : null,
      ]) as never as typeof globalThis.fetch;

      const client = TestBed.inject(GraphRunClient);
      await expect(client.cancelRun(RUN_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe('GraphRunEventClient — replay, reconnect, terminal stop, polling fallback (§4.15)', () => {
    function connect(handler: {
      onEvent: (envelope: GraphRunEventEnvelope) => void;
      onTerminal: (envelope: GraphRunEventEnvelope) => void;
      onError: (error: unknown) => void;
    }): void {
      TestBed.inject(GraphRunEventClient).connect(
        { runId: RUN_ID, eventsUrl: EVENTS_URL },
        handler,
      );
    }

    it('replays from sequence zero on first open and delivers envelopes in sequence order', () => {
      const seen: number[] = [];
      connect({
        onEvent: (e) => seen.push(e.sequence),
        onTerminal: () => undefined,
        onError: () => undefined,
      });

      const source = StubEventSource.instances[0];
      expect(source.url).toBe(`${BACKEND_URL}${EVENTS_URL}?afterSequence=0`);
      expect(source.options).toEqual({ withCredentials: true });

      source.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));
      source.emit(JSON.stringify(envelope(2, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' })));
      source.emit(JSON.stringify(envelope(3, GraphExecutionEventType.NODE_COMPLETED, { nodeId: 'n1' })));

      expect(seen).toEqual([1, 2, 3]);
    });

    it('honours an explicit replay offset on the first open', () => {
      connect({
        onEvent: () => undefined,
        onTerminal: () => undefined,
        onError: () => undefined,
      });
      TestBed.inject(GraphRunEventClient).disconnect(RUN_ID);

      TestBed.inject(GraphRunEventClient).connect(
        { runId: RUN_ID, eventsUrl: EVENTS_URL, afterSequence: 5 },
        { onEvent: () => undefined, onTerminal: () => undefined, onError: () => undefined },
      );
      expect(StubEventSource.instances[1].url).toBe(
        `${BACKEND_URL}${EVENTS_URL}?afterSequence=5`,
      );
    });

    it('ignores out-of-contract frames without dispatching them', () => {
      const seen: number[] = [];
      connect({
        onEvent: (e) => seen.push(e.sequence),
        onTerminal: () => undefined,
        onError: () => undefined,
      });

      const source = StubEventSource.instances[0];
      source.emit('not json at all');
      source.emit(JSON.stringify({ irrelevant: true }));
      source.emit(JSON.stringify([1, 2, 3]));
      source.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));

      expect(seen).toEqual([1]);
    });

    it('closes the transport on a terminal event, reports onTerminal once, and does not reconnect afterwards', () => {
      const terminal = envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED);
      const terminals: GraphRunEventEnvelope[] = [];
      const seen: number[] = [];
      connect({
        onEvent: (e) => seen.push(e.sequence),
        onTerminal: (e) => terminals.push(e),
        onError: () => undefined,
      });

      const source = StubEventSource.instances[0];
      source.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));
      source.emit(JSON.stringify(terminal));

      expect(source.closeSpy).toHaveBeenCalledTimes(1);
      expect(terminals).toEqual([terminal]);
      // The terminal envelope itself is delivered through onEvent first, then
      // the stream stops.
      expect(seen).toEqual([1, 4]);

      // A post-terminal transport drop must not schedule a reconnect: the
      // connection bookkeeping already moved on.
      source.drop();
      expect(StubEventSource.instances.length).toBe(1);
    });

    it('reconnects from the last observed sequence after a mid-run drop', async () => {
      jest.useFakeTimers();
      const seen: number[] = [];
      connect({
        onEvent: (e) => seen.push(e.sequence),
        onTerminal: () => undefined,
        onError: () => undefined,
      });

      const first = StubEventSource.instances[0];
      first.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));
      first.emit(JSON.stringify(envelope(2, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' })));
      first.drop();
      expect(first.closeSpy).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);
      expect(StubEventSource.instances.length).toBe(2);
      const second = StubEventSource.instances[1];
      // Replay resumes after the last acknowledged sequence, so the backend
      // cannot re-send sequences 1..2 (no duplicates).
      expect(second.url).toBe(`${BACKEND_URL}${EVENTS_URL}?afterSequence=2`);

      second.emit(JSON.stringify(envelope(3, GraphExecutionEventType.NODE_COMPLETED, { nodeId: 'n1' })));
      second.drop();
      await jest.advanceTimersByTimeAsync(1000);
      expect(StubEventSource.instances[2].url).toBe(`${BACKEND_URL}${EVENTS_URL}?afterSequence=3`);
      expect(seen).toEqual([1, 2, 3]);
    });

    it('exhausts the reconnect budget (3 retries), reports onError, then polls run status', async () => {
      jest.useFakeTimers();
      const errors: unknown[] = [];
      const events: GraphRunEventEnvelope[] = [];
      const terminals: GraphRunEventEnvelope[] = [];
      connect({
        onEvent: (e) => events.push(e),
        onTerminal: (e) => terminals.push(e),
        onError: (err) => errors.push(err),
      });

      const statusFetch = jest.fn((url: string) =>
        url === `${BACKEND_URL}/graph/runs/${RUN_ID}`
          ? Promise.resolve(
              httpResponse({
                runId: RUN_ID,
                workflowId: WORKFLOW_ID,
                status: 'succeeded',
                result: { runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'succeeded' },
              }),
            )
          : Promise.reject(new Error(`unexpected fetch: ${url}`)),
      ) as never as jest.Mock;
      globalThis.fetch = statusFetch as never as typeof globalThis.fetch;

      // Initial open + three reconnect attempts, each dropping immediately.
      StubEventSource.instances[0].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[1].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[2].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[3].drop();

      // Budget exhausted: no fifth source, one onError, polling takes over.
      expect(StubEventSource.instances.length).toBe(4);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(GraphBackendUnavailableError);
      expect((errors[0] as Error).message).toContain('after 3 retries');

      await jest.advanceTimersByTimeAsync(1000);
      expect(statusFetch).toHaveBeenCalledTimes(1);
      expect(statusFetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/runs/${RUN_ID}`,
        expect.objectContaining({ method: 'GET' }),
      );

      // The polled terminal status is mapped onto the matching synthetic
      // terminal event type and stops the poller.
      expect(terminals).toHaveLength(1);
      expect(terminals[0].type).toBe(GraphExecutionEventType.WORKFLOW_COMPLETED);
      expect(terminals[0].payload).toEqual({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
      });

      await jest.advanceTimersByTimeAsync(3000);
      expect(statusFetch).toHaveBeenCalledTimes(1);
    });

    it('maps non-terminal polled statuses onto synthetic live events', async () => {
      jest.useFakeTimers();
      const events: GraphRunEventEnvelope[] = [];
      connect({
        onEvent: (e) => events.push(e),
        onTerminal: () => undefined,
        onError: () => undefined,
      });

      globalThis.fetch = jest.fn(() =>
        Promise.resolve(
          httpResponse({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' }),
        ),
      ) as never as typeof globalThis.fetch;

      StubEventSource.instances[0].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[1].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[2].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[3].drop();

      await jest.advanceTimersByTimeAsync(1000);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(GraphExecutionEventType.WORKFLOW_STARTED);
      expect(events[0].runId).toBe(RUN_ID);

      // The poller keeps walking while the run is not terminal.
      await jest.advanceTimersByTimeAsync(1000);
      expect(events).toHaveLength(2);
    });

    it.each([
      ['failed', GraphExecutionEventType.WORKFLOW_FAILED],
      ['cancelled', GraphExecutionEventType.WORKFLOW_CANCELLED],
    ] as const)(
      'maps the polled %s status onto the %s synthetic terminal event',
      async (status, expectedType) => {
        jest.useFakeTimers();
        const terminals: GraphRunEventEnvelope[] = [];
        connect({
          onEvent: () => undefined,
          onTerminal: (e) => terminals.push(e),
          onError: () => undefined,
        });

        globalThis.fetch = jest.fn(() =>
          Promise.resolve(
            httpResponse({
              runId: RUN_ID,
              workflowId: WORKFLOW_ID,
              status,
              error: { name: 'Error', message: 'boom' },
            }),
          ),
        ) as never as typeof globalThis.fetch;

        StubEventSource.instances[0].drop();
        await jest.advanceTimersByTimeAsync(1000);
        StubEventSource.instances[1].drop();
        await jest.advanceTimersByTimeAsync(1000);
        StubEventSource.instances[2].drop();
        await jest.advanceTimersByTimeAsync(1000);
        StubEventSource.instances[3].drop();
        await jest.advanceTimersByTimeAsync(1000);

        expect(terminals).toHaveLength(1);
        expect(terminals[0].type).toBe(expectedType);
        expect(terminals[0].error).toEqual({ name: 'Error', message: 'boom' });
      },
    );

    it('clears all bookkeeping on disconnect: no delivery, no reconnect, no further polls', async () => {
      jest.useFakeTimers();
      const seen: number[] = [];
      connect({
        onEvent: (e) => seen.push(e.sequence),
        onTerminal: () => undefined,
        onError: () => undefined,
      });

      globalThis.fetch = jest.fn(() =>
        Promise.resolve(
          httpResponse({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' }),
        ),
      ) as never as typeof globalThis.fetch;

      // Exhaust the budget so both a reconnect timer and the poller exist.
      StubEventSource.instances[0].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[1].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[2].drop();
      await jest.advanceTimersByTimeAsync(1000);
      StubEventSource.instances[3].drop();

      TestBed.inject(GraphRunEventClient).disconnect(RUN_ID);
      expect(StubEventSource.instances[3].closeSpy).toHaveBeenCalled();

      const fetchCalls = (globalThis.fetch as never as jest.Mock).mock.calls.length;
      StubEventSource.instances[1].emit(
        JSON.stringify(envelope(9, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' })),
      );
      await jest.advanceTimersByTimeAsync(5000);

      expect(seen).toEqual([]);
      expect(StubEventSource.instances.length).toBe(4);
      expect((globalThis.fetch as never as jest.Mock).mock.calls.length).toBe(fetchCalls);
    });

    it('rejects a second live connection for the same run with a Decaf InternalError', () => {
      const handler = { onEvent: () => undefined, onTerminal: () => undefined, onError: () => undefined };
      connect(handler);
      expect(() => connect(handler)).toThrow(InternalError);
    });
  });

  describe('graphRunState — DECAF-48 parity fold, result readout, cancellation (§4.14/§4.15)', () => {
    it('seeds the run lifecycle signals on beginObservation', () => {
      graphRunState.beginObservation({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'queued' });

      expect(graphRunState.runId()).toBe(RUN_ID);
      expect(graphRunState.workflowId()).toBe(WORKFLOW_ID);
      expect(graphRunState.status()).toBe('queued');
      expect(graphRunState.lastSequence()).toBeNull();
      expect(graphRunState.lastError()).toBeNull();
      expect(graphRunStateSnapshot()).toEqual({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'queued',
        lastRunId: null,
        lastSequence: null,
        lastError: null,
      });
    });

    it('returns a null snapshot before any run is observed', () => {
      expect(graphRunStateSnapshot()).toBeNull();
    });

    it('folds run envelopes into the legacy canvas stores through the shared mapper', () => {
      graphRunState.beginObservation({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'queued' });

      graphRunState.applyEvent(
        envelope(1, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' }),
      );
      graphRunState.applyEvent(
        envelope(2, GraphExecutionEventType.EDGE_VALUE_ROUTED, {
          edgeId: 'e1',
          payload: { value: 'hello' },
        }),
      );
      graphRunState.applyEvent(
        envelope(3, GraphExecutionEventType.NODE_COMPLETED, {
          nodeId: 'n1',
          payload: { outputs: { upper: 'HELLO' } },
        }),
      );
      graphRunState.applyEvent(
        envelope(4, GraphExecutionEventType.NODE_FAILED, {
          nodeId: 'n2',
          error: { name: 'Error', message: 'boom' },
        }),
      );
      graphRunState.applyEvent(
        envelope(5, GraphExecutionEventType.NODE_STATE_CHANGED, {
          nodeId: 'n3',
          payload: { state: 'running' },
        }),
      );

      const nodes = graphExecutionState.nodeStates();
      expect(nodes['n1'].status).toBe('succeeded');
      expect(nodes['n1'].visualState).toBe('succeeded');
      expect(nodes['n1'].outputs).toEqual({ upper: 'HELLO' });
      expect(nodes['n2'].status).toBe('failed');
      expect(nodes['n2'].error).toEqual({ name: 'Error', message: 'boom' });
      expect(nodes['n3'].status).toBe('running');

      const edges = graphExecutionState.edgeStates();
      expect(edges['e1'].status).toBe('succeeded');
      expect(edges['e1'].lastValue).toBe('hello');
    });

    it('appends graph.run.log envelopes to the shared run log console', () => {
      const entry = {
        level: 'info',
        message: 'split text',
        timestamp: '2026-01-01T00:00:00.000Z',
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
      };
      graphRunState.applyEvent(
        envelope(1, GraphExecutionEventType.GRAPH_RUN_LOG, { payload: entry }),
      );
      graphRunState.applyEvent(
        envelope(2, GraphExecutionEventType.GRAPH_RUN_LOG, {
          payload: { ...entry, level: 'warn', message: 'second' },
        }),
      );

      const entries = graphRunLog.entries();
      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('split text');
      expect(entries[1].message).toBe('second');
    });

    it('folds run lifecycle statuses from workflow events and keeps ownership keys', () => {
      graphRunState.beginObservation({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'queued' });

      graphRunState.applyEvent(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED));
      expect(graphRunState.status()).toBe('running');

      graphRunState.applyEvent(
        envelope(2, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' }),
      );
      expect(graphRunState.status()).toBe('running');

      graphRunState.applyEvent(
        envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );
      expect(graphRunState.status()).toBe('succeeded');

      // The envelope's own ownership keys stay authoritative through the fold.
      expect(graphRunState.runId()).toBe(RUN_ID);
      expect(graphRunState.workflowId()).toBe(WORKFLOW_ID);
      expect(graphRunState.lastRunId()).toBe(RUN_ID);
      expect(graphRunState.lastSequence()).toBe(3);
    });

    it('records the structured error payload of failure envelopes', () => {
      graphRunState.beginObservation({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' });
      graphRunState.applyEvent(
        envelope(1, GraphExecutionEventType.WORKFLOW_FAILED, {
          error: { name: 'Error', message: 'engine blew up' },
        }),
      );
      expect(graphRunState.lastError()).toEqual({ name: 'Error', message: 'engine blew up' });
      expect(graphRunState.status()).toBe('failed');
    });

    it('folds the stored run result into lifecycle status and node I/O inspection payloads', () => {
      graphInspection.reset();
      graphRunState.applyRunResult({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        document: { id: WORKFLOW_ID, name: 'wf', inputs: [], outputs: [], nodes: [], edges: [] },
        inputs: {},
        outputs: { result: 'HELLO' },
        nodeResults: {
          n1: { nodeId: 'n1', status: 'succeeded', inputs: { text: 'hello' }, outputs: { upper: 'HELLO' } },
          n2: { nodeId: 'n2', status: 'failed', inputs: {}, error: { name: 'Error', message: 'boom' } },
          n3: { nodeId: 'n3', status: 'cached', inputs: {} },
          n4: { nodeId: 'n4', status: 'cancelled', inputs: {} },
        },
        events: [],
      });

      expect(graphRunState.lastRunId()).toBe(RUN_ID);
      expect(graphRunState.status()).toBe('succeeded');

      const inspections = graphInspection.inspections();
      expect(Object.keys(inspections).sort()).toEqual(['n1', 'n2', 'n3', 'n4']);
      expect(inspections['n1']).toEqual({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        nodeId: 'n1',
        state: 'succeeded',
        inputs: { text: 'hello' },
        outputs: { upper: 'HELLO' },
      });
      expect(inspections['n2'].state).toBe('failed');
      expect(inspections['n2'].error).toEqual({ name: 'Error', message: 'boom' });
      expect(inspections['n3'].state).toBe('succeeded');
      expect(inspections['n4'].state).toBe('skipped');
    });

    it('ignores null and empty stored results', () => {
      graphInspection.reset();
      graphRunState.applyRunResult(null);
      graphRunState.applyRunResult({
        runId: RUN_ID,
        workflowId: WORKFLOW_ID,
        status: 'succeeded',
        document: { id: WORKFLOW_ID, name: 'wf', inputs: [], outputs: [], nodes: [], edges: [] },
        inputs: {},
        outputs: {},
        nodeResults: {},
        events: [],
      });
      expect(graphInspection.inspections()).toEqual({});
    });

    it('demotes unexecuted canvas nodes and edges to skipped for a cancelled run', () => {
      graphExecutionState.setNodeState('n1', { status: 'succeeded', visualState: 'succeeded' });
      graphExecutionState.setNodeState('n2', { status: 'blocked', visualState: 'blocked' });
      graphExecutionState.setEdgeState('e1', { status: 'blocked', visualState: 'blocked' });
      graphRunState.beginObservation({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'running' });

      graphRunState.markRunCancelled();

      const nodes = graphExecutionState.nodeStates();
      expect(nodes['n1'].status).toBe('succeeded');
      expect(nodes['n2'].status).toBe('skipped');
      expect(graphExecutionState.edgeStates()['e1'].status).toBe('skipped');
    });

    it('maps run event types onto run lifecycle statuses', () => {
      expect(graphRunStatusOfEventType('workflow.started')).toBe('running');
      expect(graphRunStatusOfEventType('workflow.completed')).toBe('succeeded');
      expect(graphRunStatusOfEventType('workflow.failed')).toBe('failed');
      expect(graphRunStatusOfEventType('workflow.cancelled')).toBe('cancelled');
      expect(graphRunStatusOfEventType('node.started')).toBeNull();
      expect(graphRunStatusOfEventType('graph.run.log')).toBeNull();
    });

    it('derives visual states from run lifecycle statuses', () => {
      expect(graphRunStatusVisualStateOf('succeeded')).toBe('succeeded');
      expect(graphRunStatusVisualStateOf('failed')).toBe('failed');
      expect(graphRunStatusVisualStateOf('cancelled')).toBe('skipped');
      expect(graphRunStatusVisualStateOf('running')).toBe('running');
      expect(graphRunStatusVisualStateOf('queued')).toBe('running');
      expect(graphRunStatusVisualStateOf(null)).toBeUndefined();
    });

    it('replays a full run through the SSE client into the run state store (replay fold)', () => {
      const seen: GraphRunEventEnvelope[] = [];
      TestBed.inject(GraphRunEventClient).connect(
        { runId: RUN_ID, eventsUrl: EVENTS_URL },
        {
          onEvent: (e) => {
            seen.push(e);
            graphRunState.applyEvent(e);
          },
          onTerminal: (e) => graphRunState.applyEvent(e),
          onError: () => undefined,
        },
      );
      graphRunState.beginObservation({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: 'queued' });

      const source = StubEventSource.instances[0];
      source.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));
      source.emit(
        JSON.stringify(
          envelope(2, GraphExecutionEventType.GRAPH_RUN_LOG, {
            payload: {
              level: 'info',
              message: 'replayed log line',
              timestamp: '2026-01-01T00:00:00.000Z',
              runId: RUN_ID,
              workflowId: WORKFLOW_ID,
            },
          }),
        ),
      );
      source.emit(
        JSON.stringify(envelope(3, GraphExecutionEventType.NODE_STARTED, { nodeId: 'n1' })),
      );
      source.emit(
        JSON.stringify(envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED)),
      );

      expect(seen.map((e) => e.sequence)).toEqual([1, 2, 3, 4]);
      expect(source.closeSpy).toHaveBeenCalledTimes(1);
      expect(graphRunState.status()).toBe('succeeded');
      expect(graphRunState.lastSequence()).toBe(4);
      expect(graphRunLog.entries()).toHaveLength(1);
      expect(graphExecutionState.nodeStates()['n1'].status).toBe('running');
    });
  });
});
