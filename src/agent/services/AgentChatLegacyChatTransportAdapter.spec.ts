/**
 * @module for-angular/agent/services/AgentChatLegacyChatTransportAdapter.spec
 * @summary Contract tests for the legacy envelope-callback transport bridge on
 * the @ai-sdk `ChatTransport` seam.
 * @description Drives a scripted legacy transport stub through
 * {@link AgentChatLegacyChatTransportAdapter} and reads the produced
 * `ReadableStream<UIMessageChunk>`: replay/resume with a descriptor
 * (`resumeStreamIsReplay` + replayed telemetry), aborting a live run (`legacy.cancel`
 * + `finish("other")`), a rejected legacy `send` (synthetic `workflow.failed`
 * fallback → `data-error` + `finish("error")` + side-channel `onError`), and the
 * install-once side-channel fallback when the per-request metadata is absent.
 */
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type { UIMessageChunk } from "ai";

import type {
  AgentChatRunDescriptor,
  AgentChatSendRequest,
  AgentChatSideChannelHandlers,
  AgentChatTransport,
  AgentChatTransportHandlers,
  AgentChatUIMessage,
} from "../types";
import { AgentChatLegacyChatTransportAdapter } from "./AgentChatLegacyChatTransportAdapter";

const RUN_ID = "run-1";
const WORKFLOW_ID = "wf-1";
const EVENTS_URL = `/graph/runs/${RUN_ID}/events`;
const TS = "2026-01-01T00:00:00.000Z";

interface LegacyStub {
  transport: AgentChatTransport;
  handlers?: AgentChatTransportHandlers;
  send: jest.Mock;
  replay: jest.Mock;
  cancel: jest.Mock;
  close: jest.Mock;
}

/**
 * Legacy transport stub: `send`/`replay` capture the handlers so the test can
 * emit envelopes exactly when the adapter has created its chunk producer.
 */
function legacyStub(
  descriptor: AgentChatRunDescriptor = { runId: RUN_ID, eventsUrl: EVENTS_URL },
): LegacyStub {
  const stub: LegacyStub = {
    handlers: undefined,
    send: jest.fn(),
    replay: jest.fn(),
    cancel: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
    transport: undefined as never,
  };
  stub.send.mockImplementation(
    async (_request: AgentChatSendRequest, handlers: AgentChatTransportHandlers) => {
      stub.handlers = handlers;
      return descriptor;
    },
  );
  stub.replay.mockImplementation(
    async (_descriptor: AgentChatRunDescriptor, handlers: AgentChatTransportHandlers) => {
      stub.handlers = handlers;
    },
  );
  stub.transport = {
    send: stub.send,
    replay: stub.replay,
    cancel: stub.cancel,
    close: stub.close,
  } as unknown as AgentChatTransport;
  return stub;
}

function userMessage(text = "hello"): AgentChatUIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
  } as AgentChatUIMessage;
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
    timestamp: TS,
    ...extra,
  } as GraphRunEventEnvelope;
}

function chunkTypes(chunks: UIMessageChunk[]): string[] {
  return chunks.map((chunk) => chunk.type);
}

async function flushMicrotasks(ticks = 40): Promise<void> {
  for (let index = 0; index < ticks; index += 1) {
    await Promise.resolve();
  }
}

async function readAll(
  stream: ReadableStream<UIMessageChunk>,
): Promise<UIMessageChunk[]> {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return chunks;
    chunks.push(value);
  }
}

describe("AgentChatLegacyChatTransportAdapter", () => {
  it("replays a descriptor through the legacy replay and flags it as a replay", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);
    const sideChannel: AgentChatSideChannelHandlers = {
      onTelemetry: jest.fn(),
      onBackendAvailable: jest.fn(),
    };
    const descriptor: AgentChatRunDescriptor = {
      runId: RUN_ID,
      eventsUrl: EVENTS_URL,
    };

    expect(adapter.resumeStreamIsReplay).toBe(true);

    const stream = await adapter.reconnectToStream({
      chatId: "chat-1",
      body: { descriptor, sessionId: "session-1" },
      metadata: { sideChannel },
    } as never);
    expect(stream).not.toBeNull();

    const reading = readAll(stream!);
    await flushMicrotasks();

    expect(legacy.replay).toHaveBeenCalledTimes(1);
    expect(legacy.replay.mock.calls[0][0]).toEqual(descriptor);
    expect(legacy.send).not.toHaveBeenCalled();
    expect(legacy.handlers).toBeDefined();

    legacy.handlers!.onEvent(
      envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
    );
    legacy.handlers!.onEvent(
      envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
        payload: { response: "replayed" },
      }),
    );
    legacy.handlers!.onTerminal(
      envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED),
    );

    const chunks = await reading;
    expect(chunkTypes(chunks)).toEqual([
      "start",
      "start-step",
      "text-start",
      "text-delta",
      "text-end",
      "finish",
    ]);
    expect(chunks[0]).toMatchObject({
      type: "start",
      messageId: `${RUN_ID}:assistant`,
      messageMetadata: { runId: RUN_ID, sessionId: "session-1" },
    });
    expect(chunks.at(-1)).toMatchObject({
      type: "finish",
      finishReason: "stop",
    });
    expect(sideChannel.onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID, replayed: true }),
    );
  });

  it("returns null from reconnectToStream without a descriptor", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);

    expect(
      await adapter.reconnectToStream({ chatId: "chat-1", body: {} } as never),
    ).toBeNull();
    expect(legacy.replay).not.toHaveBeenCalled();
  });

  it("aborts a live legacy run by cancelling it and closing with finish(\"other\")", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);
    const controller = new AbortController();

    const stream = await adapter.sendMessages({
      chatId: "chat-1",
      messages: [userMessage()],
      body: { sessionId: "session-1" },
      abortSignal: controller.signal,
    } as never);
    const reading = readAll(stream);
    await flushMicrotasks();

    expect(legacy.send).toHaveBeenCalledTimes(1);
    expect(legacy.handlers).toBeDefined();
    legacy.handlers!.onEvent(
      envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
    );
    await flushMicrotasks();

    controller.abort();
    const chunks = await reading;

    expect(legacy.cancel).toHaveBeenCalledWith(RUN_ID);
    expect(chunkTypes(chunks)).toEqual(["start", "start-step", "finish"]);
    expect(chunks.at(-1)).toMatchObject({
      type: "finish",
      finishReason: "other",
    });
  });

  it("turns a rejected legacy send into data-error + finish(\"error\") and side-channel onError", async () => {
    const failure = new Error("legacy exploded");
    const legacy = legacyStub();
    legacy.send.mockRejectedValueOnce(failure);
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);
    const sideChannel: AgentChatSideChannelHandlers = {
      onError: jest.fn(),
      onBackendAvailable: jest.fn(),
    };

    const stream = await adapter.sendMessages({
      chatId: "chat-1",
      messages: [userMessage()],
      body: { sessionId: "session-1" },
      metadata: { sideChannel },
    } as never);

    const chunks = await readAll(stream);

    expect(chunkTypes(chunks)).toEqual([
      "start",
      "start-step",
      "data-error",
      "finish",
    ]);
    expect(chunks[2]).toMatchObject({
      type: "data-error",
      data: { message: "legacy exploded", name: "Error" },
    });
    expect(chunks.at(-1)).toMatchObject({
      type: "finish",
      finishReason: "error",
    });
    expect(sideChannel.onError).toHaveBeenCalledWith(failure);
  });

  it("uses the installed side-channel handlers when the request provides none", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);
    const fallback: AgentChatSideChannelHandlers = {
      onTelemetry: jest.fn(),
      onBackendAvailable: jest.fn(),
    };
    adapter.setSideChannelHandlers(fallback);

    const stream = await adapter.sendMessages({
      chatId: "chat-1",
      messages: [userMessage()],
      body: { sessionId: "session-1" },
    } as never);
    const reading = readAll(stream);
    await flushMicrotasks();

    expect(fallback.onBackendAvailable).toHaveBeenCalledWith(true);

    legacy.handlers!.onEvent(
      envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
    );
    legacy.handlers!.onTerminal(
      envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED),
    );
    await reading;

    expect(fallback.onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID }),
    );
  });

  it("prefers the per-request side channel over the installed fallback", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);
    const fallback: AgentChatSideChannelHandlers = {
      onTelemetry: jest.fn(),
      onBackendAvailable: jest.fn(),
    };
    const requestSideChannel: AgentChatSideChannelHandlers = {
      onTelemetry: jest.fn(),
      onBackendAvailable: jest.fn(),
    };
    adapter.setSideChannelHandlers(fallback);

    const stream = await adapter.sendMessages({
      chatId: "chat-1",
      messages: [userMessage()],
      body: { sessionId: "session-1" },
      metadata: { sideChannel: requestSideChannel },
    } as never);
    const reading = readAll(stream);
    await flushMicrotasks();

    legacy.handlers!.onEvent(
      envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
    );
    legacy.handlers!.onTerminal(
      envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED),
    );
    await reading;

    expect(requestSideChannel.onBackendAvailable).toHaveBeenCalledWith(true);
    expect(requestSideChannel.onTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ runId: RUN_ID }),
    );
    expect(fallback.onBackendAvailable).not.toHaveBeenCalled();
    expect(fallback.onTelemetry).not.toHaveBeenCalled();
  });

  it("forwards cancel to the legacy transport and releases it on close", async () => {
    const legacy = legacyStub();
    const adapter = new AgentChatLegacyChatTransportAdapter(legacy.transport);

    await adapter.cancel(RUN_ID);
    adapter.close();

    expect(legacy.cancel).toHaveBeenCalledWith(RUN_ID);
    expect(legacy.close).toHaveBeenCalledTimes(1);
  });
});
