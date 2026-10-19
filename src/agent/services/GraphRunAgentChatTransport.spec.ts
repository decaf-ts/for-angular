import { TestBed } from "@angular/core/testing";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";

import {
  GRAPH_BACKEND_URL,
  GraphBackendUnavailableError,
} from "diagrams/src/lib/graph/execution/GraphExecutionService";
import { GRAPH_RUN_EVENT_SOURCE } from "diagrams/src/lib/graph/runs/GraphRunEventClient";
import { GraphRunAgentChatTransport } from "./GraphRunAgentChatTransport";
import type {
  AgentChatRunDescriptor,
  AgentChatSendRequest,
  AgentChatTransportHandlers,
} from "../types";

const BACKEND_URL = "http://backend.test";
const RUN_ID = "run-1";
const WORKFLOW_ID = "wf-1";
const EVENTS_URL = `/graph/runs/${RUN_ID}/events`;

const CREATED = {
  runId: RUN_ID,
  workflowId: WORKFLOW_ID,
  status: "queued",
  eventsUrl: EVENTS_URL,
  resultUrl: `/graph/runs/${RUN_ID}/result`,
};

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

  emit(data: unknown): void {
    this.onmessage?.({ data });
  }

  drop(): void {
    this.onerror?.();
  }

  static reset(): void {
    StubEventSource.instances = [];
  }
}

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
    timestamp: "2026-01-01T00:00:00.000Z",
    ...extra,
  } as GraphRunEventEnvelope;
}

function httpResponse(body: unknown, status = 200): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
  } as never as Response;
}

function routedFetch(
  routes: Array<(url: string, init?: RequestInit) => Response | null>,
): jest.Mock {
  return jest.fn((url: string, init?: RequestInit) => {
    for (const route of routes) {
      const response = route(url, init);
      if (response) return Promise.resolve(response);
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  }) as never as jest.Mock;
}

function sendRequest(
  extra: Partial<AgentChatSendRequest> = {},
): AgentChatSendRequest {
  return {
    message: "hello",
    attachments: [],
    knowledgeSourceIds: [],
    sessionId: "session-1",
    userId: "user-1",
    ...extra,
  };
}

function recordingHandlers(): AgentChatTransportHandlers & {
  events: GraphRunEventEnvelope[];
  terminals: GraphRunEventEnvelope[];
  errors: unknown[];
} {
  const events: GraphRunEventEnvelope[] = [];
  const terminals: GraphRunEventEnvelope[] = [];
  const errors: unknown[] = [];
  return {
    events,
    terminals,
    errors,
    onEvent: (e) => events.push(e),
    onTerminal: (e) => terminals.push(e),
    onError: (e) => errors.push(e),
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("GraphRunAgentChatTransport", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    StubEventSource.reset();
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

  function mount(): GraphRunAgentChatTransport {
    return TestBed.inject(GraphRunAgentChatTransport);
  }

  describe("send — POST /graph/runs contract", () => {
    it("posts the chat inputs and resolves the created run descriptor", async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse(CREATED, 202)
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const transport = mount();
      const handlers = recordingHandlers();
      const workflow = {
        id: WORKFLOW_ID,
        name: "wf",
        inputs: [],
        outputs: [],
        nodes: [],
        edges: [],
      };
      const descriptor = await transport.send(
        sendRequest({
          workflow: workflow as never,
          attachments: [
            { id: "a1", name: "notes.txt", mime: "text/plain", size: 4 },
          ],
          knowledgeSourceIds: ["kb-1"],
        }),
        handlers,
      );

      expect(descriptor).toEqual({ runId: RUN_ID, eventsUrl: EVENTS_URL });
      expect(fetchMock).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/runs`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      );
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({
        workflow,
        inputs: {
          message: "hello",
          sessionId: "session-1",
          userId: "user-1",
          attachments: [
            { id: "a1", name: "notes.txt", mime: "text/plain", size: 4 },
          ],
          knowledgeBaseIds: ["kb-1"],
        },
      });
    });

    it("omits attachments and knowledgeBaseIds when empty", async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse(CREATED, 202)
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const transport = mount();
      await transport.send(sendRequest(), recordingHandlers());

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body)) as {
        inputs: Record<string, unknown>;
      };
      expect(body.inputs).toEqual({
        message: "hello",
        sessionId: "session-1",
        userId: "user-1",
      });
      expect("attachments" in body.inputs).toBe(false);
      expect("knowledgeBaseIds" in body.inputs).toBe(false);
    });

    it("passes a workflowId through instead of a workflow leg when only the id is set", async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse(CREATED, 202)
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const transport = mount();
      await transport.send(
        sendRequest({ workflowId: WORKFLOW_ID, workflow: undefined as never }),
        recordingHandlers(),
      );

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body["workflowId"]).toBe(WORKFLOW_ID);
      expect(body["workflow"]).toBeUndefined();
    });

    it("rejects when the run create fails and opens no event stream", async () => {
      globalThis.fetch = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse("backend said no", 500)
            : null,
      ]) as never as typeof globalThis.fetch;

      const transport = mount();
      const handlers = recordingHandlers();
      await expect(transport.send(sendRequest(), handlers)).rejects.toThrow();

      expect(StubEventSource.instances).toHaveLength(0);
      expect(handlers.errors).toHaveLength(0);
    });
  });

  describe("streaming", () => {
    it("streams envelopes to the handlers and settles on the terminal envelope", async () => {
      globalThis.fetch = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse(CREATED, 202)
            : null,
      ]) as never as typeof globalThis.fetch;

      const transport = mount();
      const handlers = recordingHandlers();
      const descriptor = await transport.send(sendRequest(), handlers);
      await flushMicrotasks();

      const source = StubEventSource.instances[0];
      expect(source.url).toBe(`${BACKEND_URL}${EVENTS_URL}?afterSequence=0`);
      expect(descriptor.runId).toBe(RUN_ID);

      source.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));
      source.emit(
        JSON.stringify(
          envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
            payload: { response: "answer" },
          }),
        ),
      );
      const terminal = envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED);
      source.emit(JSON.stringify(terminal));
      await flushMicrotasks();

      expect(handlers.events.map((e) => e.sequence)).toEqual([1, 2, 3]);
      expect(handlers.terminals).toEqual([terminal]);
      expect(handlers.errors).toHaveLength(0);
      expect(source.closeSpy).toHaveBeenCalledTimes(1);

      source.emit(JSON.stringify(envelope(9, GraphExecutionEventType.GRAPH_RUN_LOG)));
      expect(handlers.events.map((e) => e.sequence)).toEqual([1, 2, 3]);
    });

    it("replays from afterSequence 0 for an existing run descriptor", async () => {
      const transport = mount();
      const handlers = recordingHandlers();
      const descriptor: AgentChatRunDescriptor = {
        runId: RUN_ID,
        eventsUrl: EVENTS_URL,
      };
      await transport.replay(descriptor, handlers);
      await flushMicrotasks();

      const source = StubEventSource.instances[0];
      expect(source.url).toBe(`${BACKEND_URL}${EVENTS_URL}?afterSequence=0`);

      source.emit(JSON.stringify(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED)));
      expect(handlers.events.map((e) => e.sequence)).toEqual([1]);
    });

    it("hands a connect failure to onError as GraphBackendUnavailableError and does not open a stream", async () => {
      globalThis.fetch = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse(CREATED, 202)
            : null,
      ]) as never as typeof globalThis.fetch;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: GRAPH_BACKEND_URL, useValue: BACKEND_URL },
          { provide: GRAPH_RUN_EVENT_SOURCE, useValue: null },
        ],
      });
      const transport = mount();
      const handlers = recordingHandlers();
      await transport.send(sendRequest(), handlers);
      await flushMicrotasks();

      expect(handlers.errors).toHaveLength(1);
      expect(handlers.errors[0]).toBeInstanceOf(GraphBackendUnavailableError);
      expect(StubEventSource.instances).toHaveLength(0);
    });

    it("does not disconnect on a stream error: the polling fallback keeps the connection alive", async () => {
      jest.useFakeTimers();
      globalThis.fetch = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs` && init?.method === "POST"
            ? httpResponse(CREATED, 202)
            : null,
      ]) as never as typeof globalThis.fetch;

      const transport = mount();
      const handlers = recordingHandlers();
      await transport.send(sendRequest(), handlers);
      await flushMicrotasks();

      StubEventSource.instances[0].drop();
      await jest.advanceTimersByTimeAsync(1000);

      expect(StubEventSource.instances.length).toBe(2);
      expect(handlers.errors).toHaveLength(0);
      expect(handlers.terminals).toHaveLength(0);
    });

    it("cancels a live run through the run client DELETE", async () => {
      const fetchMock = routedFetch([
        (url, init) =>
          url === `${BACKEND_URL}/graph/runs/${RUN_ID}` && init?.method === "DELETE"
            ? httpResponse({ runId: RUN_ID, workflowId: WORKFLOW_ID, status: "cancelled" })
            : null,
      ]);
      globalThis.fetch = fetchMock as never as typeof globalThis.fetch;

      const transport = mount();
      await transport.cancel(RUN_ID);

      expect(fetchMock).toHaveBeenCalledWith(
        `${BACKEND_URL}/graph/runs/${RUN_ID}`,
        expect.objectContaining({ method: "DELETE", credentials: "include" }),
      );
    });
  });
});
