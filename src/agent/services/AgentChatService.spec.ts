/**
 * @module for-angular/agent/services/AgentChatService.spec
 * @summary Contract tests for the @ai-sdk `Chat`-owned `AgentChatService`.
 * @description Drives the service through a controllable SDK transport stub
 * (`ChatTransport.sendMessages` returning a `ReadableStream<UIMessageChunk>`)
 * so the tests exercise the protocol seam directly: the user message is pushed
 * by the SDK, streaming text is projected from `text-*` chunks, running status
 * follows `Chat.status`, and the decaf side channel feeds telemetry,
 * structured objects, errors and backend availability.
 */
import { TestBed } from "@angular/core/testing";
import type { UIMessageChunk } from "ai";

import {
  AGENT_CHAT_SESSION_PREFIX,
  AGENT_CHAT_TRANSPORT,
} from "../tokens/agent-chat.tokens";
import { GraphBackendUnavailableError } from "@decaf-ts/for-angular/diagrams";
import type {
  AgentChatRunDescriptor,
  AgentChatSdkTransport,
  AgentChatSideChannelHandlers,
  AgentChatUIMessage,
} from "../types";
import { AgentChatService } from "./AgentChatService";

const RUN_ID = "run-1";
const OTHER_RUN_ID = "run-2";
const WORKFLOW_ID = "wf-1";
const EVENTS_URL = `/graph/runs/${RUN_ID}/events`;
const TS = "2026-01-01T00:00:00.000Z";

interface SendOptions {
  messages: AgentChatUIMessage[];
  body?: Record<string, unknown>;
  metadata?: { sideChannel?: AgentChatSideChannelHandlers };
  abortSignal?: AbortSignal;
}

/** One controlled response stream handed back by the stub transport. */
interface ControlledRun {
  stream: ReadableStream<UIMessageChunk>;
  options: SendOptions;
  push: (...chunks: UIMessageChunk[]) => void;
  close: () => void;
  abort: jest.Mock;
  cancel: jest.Mock;
}

/**
 * `ReadableStream` whose chunks are enqueued by the test. The stream mirrors
 * the real transport's abort wiring: aborting the request cancels the backend
 * run and closes the stream.
 */
function controlledRun(
  options: SendOptions,
  onAbort: () => void,
): ControlledRun {
  let controller!: ReadableStreamDefaultController<UIMessageChunk>;
  let closed = false;
  const abort = jest.fn(onAbort);
  const cancel = jest.fn();
  const stream = new ReadableStream<UIMessageChunk>({
    start(streamController) {
      controller = streamController;
      options.abortSignal?.addEventListener(
        "abort",
        () => {
          abort();
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        },
        { once: true },
      );
    },
    cancel(reason) {
      cancel(reason);
    },
  });
  return {
    stream,
    options,
    abort,
    cancel,
    push: (...chunks) => {
      if (closed) return;
      for (const chunk of chunks) controller.enqueue(chunk);
    },
    close: () => {
      if (closed) return;
      closed = true;
      try {
        controller.close();
      } catch {
        /* already closed */
      }
    },
  };
}

interface TransportStub {
  transport: AgentChatSdkTransport;
  runs: ControlledRun[];
  sendMessages: jest.Mock;
  reconnectToStream: jest.Mock;
  cancel: jest.Mock;
  close: jest.Mock;
}

function sdkTransportStub(): TransportStub {
  const runs: ControlledRun[] = [];
  const cancel = jest.fn().mockResolvedValue(undefined);
  const stub: TransportStub = {
    runs,
    cancel,
    close: jest.fn(),
    sendMessages: jest.fn(),
    reconnectToStream: jest.fn(),
    transport: undefined as never,
  };
  stub.sendMessages.mockImplementation((options: SendOptions) => {
    const run = controlledRun(options, () => void cancel(RUN_ID));
    runs.push(run);
    return Promise.resolve(run.stream);
  });
  stub.reconnectToStream.mockImplementation((options: SendOptions) => {
    if (!options.body?.["descriptor"]) return Promise.resolve(null);
    const run = controlledRun(options, () => void cancel(RUN_ID));
    runs.push(run);
    return Promise.resolve(run.stream);
  });
  stub.transport = {
    resumeStreamIsReplay: true,
    sendMessages: stub.sendMessages,
    reconnectToStream: stub.reconnectToStream,
    close: stub.close,
  } as unknown as AgentChatSdkTransport;
  return stub;
}

const START: UIMessageChunk = { type: "start", messageId: `${RUN_ID}:assistant` };

function textChunks(text: string, id = "text-1"): UIMessageChunk[] {
  return [
    { type: "text-start", id },
    { type: "text-delta", id, delta: text },
    { type: "text-end", id },
  ];
}

async function flush(ticks = 60): Promise<void> {
  for (let index = 0; index < ticks; index += 1) {
    await Promise.resolve();
  }
}

function mount(transport: TransportStub = sdkTransportStub()): AgentChatService {
  TestBed.configureTestingModule({
    providers: [
      AgentChatService,
      { provide: AGENT_CHAT_TRANSPORT, useValue: transport.transport },
    ],
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
    it("pushes the user message and forwards the request body through the SDK transport", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      const attachments = [
        { id: "a1", name: "notes.txt", mime: "text/plain", size: 4 },
      ];

      await service.send("  hello  ", attachments, ["kb-1"]);
      await flush();

      expect(stub.sendMessages).toHaveBeenCalledTimes(1);
      const options = stub.runs[0].options;
      const lastUser = options.messages[options.messages.length - 1];
      expect(lastUser).toMatchObject({
        role: "user",
        parts: [{ type: "text", text: "hello" }],
      });
      expect(options.body).toMatchObject({
        sessionId: expect.stringMatching(
          new RegExp(`^${AGENT_CHAT_SESSION_PREFIX}-`),
        ),
        userId: null,
        attachments,
        knowledgeSourceIds: ["kb-1"],
      });
      expect(options.metadata?.sideChannel).toEqual(
        expect.objectContaining({
          onTelemetry: expect.any(Function),
          onStructuredObject: expect.any(Function),
          onError: expect.any(Function),
          onBackendAvailable: expect.any(Function),
        }),
      );

      const messages = service.messages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        role: "user",
        content: "hello",
        attachments,
        knowledgeSourceIds: ["kb-1"],
      });
    });

    it("ignores an empty or whitespace-only message", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);

      await service.send("   ");
      await flush();

      expect(stub.sendMessages).not.toHaveBeenCalled();
      expect(service.messages()).toEqual([]);
      expect(service.running()).toBe(false);
    });

    it("ignores a duplicate send while a roundtrip is running", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);

      await service.send("first");
      await flush();
      expect(service.running()).toBe(true);

      await service.send("second");
      await flush();

      expect(stub.sendMessages).toHaveBeenCalledTimes(1);
      expect(service.messages().map((m) => m.content)).toEqual(["first"]);
    });

    it("keeps the configured workflow, workflowId, sessionId and userId in the request", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      service.configure({
        workflow: { id: WORKFLOW_ID },
        workflowId: WORKFLOW_ID,
        sessionId: "fixed-session",
        userId: "user-9",
      });

      await service.send("hello");
      await flush();

      expect(stub.runs[0].options.body).toMatchObject({
        workflow: { id: WORKFLOW_ID },
        workflowId: WORKFLOW_ID,
        sessionId: "fixed-session",
        userId: "user-9",
      });
    });

    it("generates and reuses a session id when none is configured", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);

      await service.send("first");
      await flush();
      stub.runs[0].push(START, ...textChunks("one"), {
        type: "finish",
        finishReason: "stop",
      });
      stub.runs[0].close();
      await flush();

      await service.send("second");
      await flush();

      const firstSession = stub.runs[0].options.body?.["sessionId"];
      const secondSession = stub.runs[1].options.body?.["sessionId"];
      expect(firstSession).toMatch(
        new RegExp(`^${AGENT_CHAT_SESSION_PREFIX}-`),
      );
      expect(secondSession).toBe(firstSession);
      expect(service.sessionId).toBe(firstSession);
    });

    it("resolves the userId from the logged user on window when unconfigured", async () => {
      win.window!["loggedUser"] = "user-9";
      const stub = sdkTransportStub();
      const service = mount(stub);

      await service.send("hello");
      await flush();

      expect(stub.runs[0].options.body?.["userId"]).toBe("user-9");
    });
  });

  describe("streaming", () => {
    it("projects streamed text chunks into the transcript and follows the SDK running status", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      expect(service.running()).toBe(true);

      const run = stub.runs[0];
      run.push(START, { type: "text-start", id: "text-1" }, {
        type: "text-delta",
        id: "text-1",
        delta: "Hel",
      });
      await flush();

      expect(
        service.messages().map((message) => [message.role, message.content]),
      ).toEqual([
        ["user", "hello"],
        ["assistant", "Hel"],
      ]);
      expect(service.messages()[1].streaming).toBe(true);
      expect(service.running()).toBe(true);

      run.push(
        { type: "text-delta", id: "text-1", delta: "lo" },
        { type: "text-end", id: "text-1" },
        { type: "finish", finishReason: "stop" },
      );
      run.close();
      await flush();

      expect(service.messages()[1]).toMatchObject({
        role: "assistant",
        content: "Hello",
      });
      expect(service.messages()[1].streaming).toBeFalsy();
      expect(service.running()).toBe(false);
    });

    it("projects reasoning, tool and code chunks into nested message parts", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const run = stub.runs[0];
      run.push(
        START,
        { type: "reasoning-start", id: "r1" },
        { type: "reasoning-delta", id: "r1", delta: "thinking" },
        { type: "reasoning-end", id: "r1" },
        { type: "tool-input-start", toolCallId: "t1", toolName: "search" },
        {
          type: "tool-input-available",
          toolCallId: "t1",
          toolName: "search",
          input: { q: "revenue" },
        },
        {
          type: "tool-output-available",
          toolCallId: "t1",
          output: { rows: 3 },
        },
        {
          type: "custom",
          kind: "decaf.code",
          providerMetadata: {
            decaf: { code: "SELECT 1", language: "sql", title: "Query" },
          },
        },
      );
      await flush();

      const parts = service.messages()[1].parts ?? [];
      expect(parts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "reasoning",
            content: "thinking",
          }),
          expect.objectContaining({
            kind: "tool",
            name: "search",
            status: "succeeded",
            input: { q: "revenue" },
            output: { rows: 3 },
          }),
          expect.objectContaining({
            kind: "code",
            code: "SELECT 1",
            language: "sql",
          }),
        ]),
      );

      run.push({ type: "finish", finishReason: "stop" });
      run.close();
      await flush();
    });

    it("merges side-channel telemetry rows and tracks the active run", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const sideChannel = stub.runs[0].options.metadata!.sideChannel!;
      sideChannel.onTelemetry!({
        runId: RUN_ID,
        status: "running",
        startedAt: TS,
      });
      await flush();

      expect(service.roundtrips()).toEqual([
        { runId: RUN_ID, status: "running", startedAt: TS },
      ]);
      expect(service.activeRunId()).toBe(RUN_ID);

      sideChannel.onTelemetry!({
        runId: RUN_ID,
        status: "succeeded",
        startedAt: TS,
        finishedAt: TS,
      });
      sideChannel.onTelemetry!({
        runId: OTHER_RUN_ID,
        status: "running",
      });
      await flush();

      expect(service.roundtrips()).toHaveLength(2);
      expect(service.roundtrips()[0]).toMatchObject({
        runId: RUN_ID,
        status: "succeeded",
        finishedAt: TS,
      });
      expect(service.activeRunId()).toBe(OTHER_RUN_ID);

      stub.runs[0].close();
      await flush();
    });

    it("stores the structured object pushed by the side channel", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      stub.runs[0].options.metadata!.sideChannel!.onStructuredObject!({
        runId: RUN_ID,
        value: { invoiceNumber: "INV-1" },
      });
      await flush();

      expect(service.structuredObject()).toEqual({
        runId: RUN_ID,
        value: { invoiceNumber: "INV-1" },
      });

      stub.runs[0].close();
      await flush();
    });

    it("surfaces a side-channel stream error without marking the backend unavailable", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      stub.runs[0].options.metadata!.sideChannel!.onError!(
        new Error("stream blew up"),
      );
      await flush();

      expect(service.error()).toBe("stream blew up");
      expect(service.backendAvailable()).toBeNull();
      expect(service.running()).toBe(true);

      stub.runs[0].close();
      await flush();
    });

    it("marks the backend unavailable through the side channel", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const sideChannel = stub.runs[0].options.metadata!.sideChannel!;
      sideChannel.onBackendAvailable!(true);
      expect(service.backendAvailable()).toBe(true);

      sideChannel.onBackendAvailable!(false);
      expect(service.backendAvailable()).toBe(false);

      stub.runs[0].close();
      await flush();
    });

    it("surfaces a GraphBackendUnavailableError from the SDK transport on error", async () => {
      const stub = sdkTransportStub();
      let captured: SendOptions | undefined;
      const failure = new GraphBackendUnavailableError();
      stub.sendMessages.mockImplementationOnce((options: SendOptions) => {
        captured = options;
        return Promise.reject(failure);
      });
      const service = mount(stub);

      await service.send("hello");
      await flush();

      expect(service.error()).toBe(failure.message);
      expect(service.running()).toBe(false);
      captured!.metadata!.sideChannel!.onBackendAvailable!(false);
      expect(service.backendAvailable()).toBe(false);
    });
  });

  describe("error-role projection", () => {
    it("projects a data-error chunk into an error-role message carrying the error text", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const run = stub.runs[0];
      run.push(
        START,
        ...textChunks("partial answer"),
        {
          type: "data-error",
          data: { message: "boom", name: "WorkflowError" },
        },
        { type: "finish", finishReason: "error" },
      );
      run.close();
      await flush();

      const messages = service.messages();
      expect(messages.map((message) => [message.role, message.content])).toEqual([
        ["user", "hello"],
        ["error", "boom"],
      ]);
      expect(messages[1]).toMatchObject({ role: "error", content: "boom" });
      expect(messages.some((message) => message.role === "assistant")).toBe(false);
    });

    it("projects the cancellation status text as an error-role message", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const run = stub.runs[0];
      run.push(
        START,
        {
          type: "data-error",
          data: { message: "agent.chat.status.cancelled" },
        },
        { type: "finish", finishReason: "other" },
      );
      run.close();
      await flush();

      expect(
        service.messages().map((message) => [message.role, message.content]),
      ).toEqual([
        ["user", "hello"],
        ["error", "agent.chat.status.cancelled"],
      ]);
    });

    it("keeps the assistant role for a normal run without a data-error part", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const run = stub.runs[0];
      run.push(START, ...textChunks("Hello"), {
        type: "finish",
        finishReason: "stop",
      });
      run.close();
      await flush();

      const messages = service.messages();
      expect(messages.map((message) => [message.role, message.content])).toEqual([
        ["user", "hello"],
        ["assistant", "Hello"],
      ]);
      expect(messages.some((message) => message.role === "error")).toBe(false);
    });
  });

  describe("replay", () => {
    it("replays a descriptor through Chat.resumeStream and the reconnect transport path", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      const descriptor: AgentChatRunDescriptor = {
        runId: RUN_ID,
        eventsUrl: EVENTS_URL,
      };

      await service.replay(descriptor);
      await flush();

      expect(stub.reconnectToStream).toHaveBeenCalledTimes(1);
      expect(stub.reconnectToStream.mock.calls[0][0].body).toMatchObject({
        descriptor,
        sessionId: service.sessionId,
      });
      expect(service.running()).toBe(true);

      const run = stub.runs[0];
      run.options.metadata!.sideChannel!.onTelemetry!({
        runId: RUN_ID,
        status: "running",
        replayed: true,
      });
      run.push(START, ...textChunks("replayed answer"), {
        type: "finish",
        finishReason: "stop",
      });
      run.close();
      await flush();

      expect(service.roundtrips()[0]).toMatchObject({
        runId: RUN_ID,
        replayed: true,
      });
      expect(service.messages().map((m) => m.content)).toEqual([
        "replayed answer",
      ]);
      expect(service.running()).toBe(false);
    });

    it("ignores a replay while another roundtrip is running", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);

      await service.send("first");
      await flush();
      await service.replay({ runId: RUN_ID, eventsUrl: EVENTS_URL });
      await flush();

      expect(stub.reconnectToStream).not.toHaveBeenCalled();

      stub.runs[0].close();
      await flush();
    });
  });

  describe("cancel", () => {
    it("stops the SDK chat and aborts the active stream", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      await service.cancel();
      await flush();

      expect(stub.runs[0].abort).toHaveBeenCalledTimes(1);
      expect(stub.cancel).toHaveBeenCalledWith(RUN_ID);
      expect(service.running()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it("does not schedule a cancel without an active stream", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);

      await service.cancel();
      await flush();

      expect(stub.cancel).not.toHaveBeenCalled();
    });
  });

  describe("message mutations", () => {
    async function completedConversation(
      stub: TransportStub,
    ): Promise<AgentChatService> {
      const service = mount(stub);
      await service.send("hello", [
        { id: "a1", name: "notes.txt", mime: "text/plain", size: 3 },
      ], ["kb-1"]);
      await flush();
      stub.runs[0].push(START, ...textChunks("answer"), {
        type: "finish",
        finishReason: "stop",
      });
      stub.runs[0].close();
      await flush();
      return service;
    }

    it("edits an already-sent user message and re-sends it with the original metadata", async () => {
      const stub = sdkTransportStub();
      const service = await completedConversation(stub);
      const user = service.messages().find((message) => message.role === "user")!;

      await service.editMessage(user.id, "edited hello");
      await flush();

      expect(stub.sendMessages).toHaveBeenCalledTimes(2);
      const edited = stub.runs[1].options.messages.at(-1)!;
      expect(edited.parts).toEqual([
        { type: "text", text: "edited hello" },
      ]);
      expect(edited.metadata).toMatchObject({
        attachments: [
          { id: "a1", name: "notes.txt", mime: "text/plain", size: 3 },
        ],
        knowledgeSourceIds: ["kb-1"],
      });
      expect(service.messages().map((m) => m.content)).toEqual([
        "edited hello",
      ]);

      stub.runs[1].close();
      await flush();
    });

    it("ignores edit requests for unknown, non-user, or blank messages", async () => {
      const stub = sdkTransportStub();
      const service = await completedConversation(stub);
      const assistant = service
        .messages()
        .find((message) => message.role === "assistant")!;

      await service.editMessage("missing", "nope");
      await service.editMessage(assistant.id, "nope");
      const user = service.messages().find((message) => message.role === "user")!;
      await service.editMessage(user.id, "   ");
      await flush();

      expect(stub.sendMessages).toHaveBeenCalledTimes(1);
      expect(service.messages()).toHaveLength(2);
    });

    it("removes one message from the local transcript", async () => {
      const stub = sdkTransportStub();
      const service = await completedConversation(stub);
      const assistant = service
        .messages()
        .find((message) => message.role === "assistant")!;

      service.removeMessage(assistant.id);
      expect(service.messages().map((m) => m.role)).toEqual(["user"]);

      service.removeMessage("missing");
      expect(service.messages().map((m) => m.role)).toEqual(["user"]);
    });

    it("records and clears a vote on a message", async () => {
      const stub = sdkTransportStub();
      const service = await completedConversation(stub);
      const assistant = service
        .messages()
        .find((message) => message.role === "assistant")!;

      service.setVote(assistant.id, "up");
      const voted = service
        .messages()
        .find((message) => message.id === assistant.id)!;
      expect(voted.vote).toBe("up");
      expect(voted.editedAt).toEqual(expect.any(String));

      service.setVote(assistant.id, null);
      expect(
        service.messages().find((message) => message.id === assistant.id)!.vote,
      ).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears messages, telemetry, structured object, running state, and errors", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();

      const sideChannel = stub.runs[0].options.metadata!.sideChannel!;
      sideChannel.onTelemetry!({ runId: RUN_ID, status: "running" });
      sideChannel.onStructuredObject!({
        runId: RUN_ID,
        value: { ok: true },
      });
      sideChannel.onError!(new Error("stream blew up"));
      stub.runs[0].close();
      await flush();

      service.reset();

      expect(service.messages()).toEqual([]);
      expect(service.roundtrips()).toEqual([]);
      expect(service.structuredObject()).toBeNull();
      expect(service.running()).toBe(false);
      expect(service.activeRunId()).toBeNull();
      expect(service.error()).toBeNull();
    });
  });

  describe("error clearing", () => {
    it("clears the previous error when a new send starts", async () => {
      const stub = sdkTransportStub();
      const service = mount(stub);
      await service.send("hello");
      await flush();
      stub.runs[0].options.metadata!.sideChannel!.onError!(
        new Error("stream blew up"),
      );
      await flush();
      expect(service.error()).toBe("stream blew up");

      stub.runs[0].push({ type: "finish", finishReason: "stop" });
      stub.runs[0].close();
      await flush();

      await service.send("again");
      await flush();

      expect(service.error()).toBeNull();

      stub.runs[1].close();
      await flush();
    });
  });
});
