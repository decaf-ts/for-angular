import { TestBed } from "@angular/core/testing";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";

import {
  AGENT_CHAT_SESSION_PREFIX,
  AGENT_CHAT_TRANSPORT,
} from "../tokens/agent-chat.tokens";
import { GraphBackendUnavailableError } from "@decaf-ts/for-angular/diagrams";
import { AgentChatService } from "./AgentChatService";
import type { AgentChatTransport, AgentChatTransportHandlers } from "../types";

const RUN_ID = "run-1";
const OTHER_RUN_ID = "run-2";
const WORKFLOW_ID = "wf-1";
const EVENTS_URL = `/graph/runs/${RUN_ID}/events`;
const TS = "2026-01-01T00:00:00.000Z";

type TransportStub = AgentChatTransport & {
  send: jest.Mock;
  replay: jest.Mock;
  cancel: jest.Mock;
};

function envelope(
  sequence: number,
  type: GraphExecutionEventType,
  extra: Record<string, unknown> = {},
  runId: string = RUN_ID,
): GraphRunEventEnvelope {
  return {
    runId,
    workflowId: WORKFLOW_ID,
    sequence,
    type,
    timestamp: TS,
    ...extra,
  } as GraphRunEventEnvelope;
}

function transportStub(): TransportStub {
  return {
    send: jest.fn().mockResolvedValue({ runId: RUN_ID, eventsUrl: EVENTS_URL }),
    replay: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  } as never as TransportStub;
}

function handlersOf(stub: TransportStub, call = 0): AgentChatTransportHandlers {
  return stub.send.mock.calls[call][1] as AgentChatTransportHandlers;
}

function mount(transport: TransportStub = transportStub()): AgentChatService {
  TestBed.configureTestingModule({
    providers: [AgentChatService, { provide: AGENT_CHAT_TRANSPORT, useValue: transport }],
  });
  return TestBed.inject(AgentChatService);
}

const win = globalThis as unknown as { window?: Record<string, unknown> };

describe("AgentChatService", () => {
  beforeEach(() => {
    delete win.window?.["loggedUser"];
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe("send", () => {
    it("pushes the user message and calls the transport with the chat request", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.send("  hello  ", [
        { id: "a1", name: "notes.txt", mime: "text/plain", size: 4 },
      ], ["kb-1"]);

      expect(transport.send).toHaveBeenCalledTimes(1);
      const [request] = transport.send.mock.calls[0] as unknown[];
      expect(request).toMatchObject({
        message: "hello",
        sessionId: expect.stringMatching(new RegExp(`^${AGENT_CHAT_SESSION_PREFIX}-`)),
        userId: null,
        attachments: [{ id: "a1", name: "notes.txt", mime: "text/plain", size: 4 }],
        knowledgeSourceIds: ["kb-1"],
        workflowId: undefined,
      });

      const messages = service.messages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: "user",
        content: "hello",
        attachments: [{ id: "a1", name: "notes.txt", mime: "text/plain", size: 4 }],
        knowledgeSourceIds: ["kb-1"],
      });
      expect(messages[0].id).toMatch(/^user:/);
    });

    it("ignores an empty or whitespace-only message", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.send("   ");

      expect(transport.send).not.toHaveBeenCalled();
      expect(service.messages()).toEqual([]);
      expect(service.running()).toBe(false);
    });

    it("ignores a duplicate send while a roundtrip is running", async () => {
      const transport = transportStub();
      transport.send.mockImplementation(() => new Promise(() => undefined));
      const service = mount(transport);

      void service.send("first");
      void service.send("second");

      expect(transport.send).toHaveBeenCalledTimes(1);
      expect(service.running()).toBe(true);
      expect(service.messages().map((m) => m.content)).toEqual(["first"]);
    });

    it("accepts a new send after the previous roundtrip reached a terminal envelope", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.send("first");
      handlersOf(transport).onTerminal(
        envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );
      await service.send("second");
      handlersOf(transport, 1).onTerminal(
        envelope(5, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );

      expect(transport.send).toHaveBeenCalledTimes(2);
      expect(service.messages().map((m) => m.content)).toEqual(["first", "second"]);
      expect(service.running()).toBe(false);
    });

    it("keeps the configured workflow, workflowId, sessionId and userId in the request", async () => {
      const transport = transportStub();
      const service = mount(transport);
      service.configure({
        workflow: { id: WORKFLOW_ID },
        workflowId: WORKFLOW_ID,
        sessionId: "fixed-session",
        userId: "user-9",
      });

      await service.send("hello");

      const [request] = transport.send.mock.calls[0] as unknown[];
      expect(request).toMatchObject({
        workflow: { id: WORKFLOW_ID },
        workflowId: WORKFLOW_ID,
        sessionId: "fixed-session",
        userId: "user-9",
      });
    });

    it("generates and reuses a session id when none is configured", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.send("first");
      handlersOf(transport).onTerminal(
        envelope(1, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );
      await service.send("second");

      const [firstRequest] = transport.send.mock.calls[0] as unknown[];
      const [secondRequest] = transport.send.mock.calls[1] as unknown[];
      const sessionId = (firstRequest as { sessionId: string }).sessionId;
      expect(sessionId).toMatch(new RegExp(`^${AGENT_CHAT_SESSION_PREFIX}-`));
      expect((secondRequest as { sessionId: string }).sessionId).toBe(sessionId);
      expect(service.sessionId).toBe(sessionId);
    });

    it("resolves the userId from the logged user on window when unconfigured", async () => {
      win.window!["loggedUser"] = "user-9";
      const transport = transportStub();
      const service = mount(transport);

      await service.send("hello");

      const [request] = transport.send.mock.calls[0] as unknown[];
      expect((request as { userId: unknown }).userId).toBe("user-9");
    });

    it("pushes an error message and marks the backend unavailable when the transport rejects with GraphBackendUnavailableError", async () => {
      const transport = transportStub();
      transport.send.mockRejectedValue(new GraphBackendUnavailableError());
      const service = mount(transport);

      await service.send("hello");

      expect(service.backendAvailable()).toBe(false);
      expect(service.running()).toBe(false);
      expect(service.activeRunId()).toBeNull();
      const messages = service.messages();
      expect(messages).toHaveLength(2);
      expect(messages[1]).toMatchObject({ role: "error", content: expect.any(String) });
    });

    it("surfaces stream errors without marking the backend unavailable for non-backend errors", () => {
      const transport = transportStub();
      const service = mount(transport);

      void service.send("hello");
      handlersOf(transport).onError(new Error("stream blew up"));

      expect(service.error()).toBe("stream blew up");
      expect(service.backendAvailable()).toBeNull();
      expect(service.running()).toBe(true);
    });

    it("sets the active run id and backend availability once the send resolves", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.send("hello");

      expect(service.activeRunId()).toBe(RUN_ID);
      expect(service.backendAvailable()).toBe(true);
      expect(service.running()).toBe(true);
    });
  });

  describe("event folding", () => {
    it("folds streamed envelopes into messages and telemetry", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");

      const handlers = handlersOf(transport);
      handlers.onEvent(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED));
      handlers.onEvent(
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "the answer" },
        }),
      );

      expect(service.messages().map((m) => [m.role, m.content])).toEqual([
        ["user", "hello"],
        ["assistant", "the answer"],
      ]);
      expect(service.roundtrips()).toHaveLength(1);
      expect(service.running()).toBe(true);
      expect(service.activeRunId()).toBe(RUN_ID);
    });

    it("stops the roundtrip on a terminal envelope", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");

      handlersOf(transport).onEvent(
        envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );

      expect(service.running()).toBe(false);
      expect(service.activeRunId()).toBeNull();
    });

    it("folds a terminal envelope delivered through both onEvent and onTerminal exactly once", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");

      const handlers = handlersOf(transport);
      const terminal = envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { answer: "fallback answer" },
      });
      handlers.onEvent(terminal);
      handlers.onTerminal(terminal);

      expect(service.messages().map((m) => [m.role, m.content])).toEqual([
        ["user", "hello"],
        ["assistant", "fallback answer"],
      ]);
      expect(service.roundtrips()).toHaveLength(1);
      expect(service.running()).toBe(false);
    });

    it("ignores envelopes at or below the highest folded sequence for the run", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");

      const handlers = handlersOf(transport);
      handlers.onEvent(
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "second" },
        }),
      );
      handlers.onEvent(
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "first" },
        }),
      );

      expect(
        service.messages().filter((m) => m.role === "assistant").map((m) => m.content),
      ).toEqual(["second"]);
    });

    it("tracks separate runs independently", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");

      const handlers = handlersOf(transport);
      handlers.onEvent(
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "run one answer" },
        }, OTHER_RUN_ID),
      );
      handlers.onEvent(
        envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { answer: "run one fallback" },
        }, OTHER_RUN_ID),
      );

      expect(service.roundtrips().map((r) => r.runId)).toEqual([OTHER_RUN_ID]);
      expect(
        service.messages().filter((m) => m.role === "assistant").map((m) => m.content),
      ).toEqual(["run one answer"]);
    });
  });

  describe("replay", () => {
    it("replays a descriptor with replay-tagged folding and clears the running state afterwards", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.replay({ runId: RUN_ID, eventsUrl: EVENTS_URL });

      expect(transport.replay).toHaveBeenCalledWith(
        { runId: RUN_ID, eventsUrl: EVENTS_URL },
        expect.objectContaining({
          onEvent: expect.any(Function),
          onTerminal: expect.any(Function),
          onError: expect.any(Function),
        }),
      );

      const replayHandlers = transport.replay.mock.calls[0][1] as AgentChatTransportHandlers;
      replayHandlers.onEvent(envelope(1, GraphExecutionEventType.WORKFLOW_STARTED));

      expect(service.roundtrips()[0]).toMatchObject({
        runId: RUN_ID,
        replayed: true,
        status: "running",
      });
      expect(service.running()).toBe(false);
      expect(service.activeRunId()).toBeNull();
    });

    it("ignores a replay while another roundtrip is running", async () => {
      const transport = transportStub();
      transport.send.mockImplementation(() => new Promise(() => undefined));
      const service = mount(transport);

      void service.send("first");
      await service.replay({ runId: RUN_ID, eventsUrl: EVENTS_URL });

      expect(transport.replay).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("does nothing without an active run", async () => {
      const transport = transportStub();
      const service = mount(transport);

      await service.cancel();

      expect(transport.cancel).not.toHaveBeenCalled();
    });

    it("cancels the active run id", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");

      await service.cancel();

      expect(transport.cancel).toHaveBeenCalledWith(RUN_ID);
    });

    it("surfaces cancellation failures without clearing the active run", async () => {
      const transport = transportStub();
      transport.cancel.mockRejectedValue(new Error("cancel failed"));
      const service = mount(transport);
      await service.send("hello");

      await service.cancel();

      expect(service.error()).toBe("cancel failed");
      expect(service.activeRunId()).toBe(RUN_ID);
    });
  });

  describe("reset", () => {
    it("clears messages, telemetry, structured object, running state, and errors", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");
      handlersOf(transport).onEvent(
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "answer", structuredOutput: { ok: true } },
        }),
      );
      handlersOf(transport).onError(new Error("stream blew up"));

      service.reset();

      expect(service.messages()).toEqual([]);
      expect(service.roundtrips()).toEqual([]);
      expect(service.structuredObject()).toBeNull();
      expect(service.running()).toBe(false);
      expect(service.activeRunId()).toBeNull();
      expect(service.error()).toBeNull();
    });

    it("clears the sequence-dedupe state so refolded envelopes fold again", async () => {
      const transport = transportStub();
      const service = mount(transport);
      await service.send("hello");
      const output = envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "answer" },
      });
      handlersOf(transport).onEvent(output);

      service.reset();
      expect(service.messages()).toEqual([]);

      const second = transportStub();
      TestBed.resetTestingModule();
      const otherService = mount(second);
      await otherService.send("hello");
      handlersOf(second).onEvent(output);

      expect(otherService.messages().map((m) => m.content)).toEqual(["hello", "answer"]);
    });
  });

  describe("error clearing", () => {
    it("clears the previous error when a new send starts", async () => {
      const transport = transportStub();
      transport.cancel.mockRejectedValue(new Error("cancel failed"));
      const service = mount(transport);
      await service.send("hello");
      await service.cancel();
      expect(service.error()).toBe("cancel failed");

      handlersOf(transport).onTerminal(
        envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );
      await service.send("again");

      expect(service.error()).toBeNull();
    });
  });
});
