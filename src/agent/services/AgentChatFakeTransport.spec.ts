/**
 * @module for-angular/agent/services/AgentChatFakeTransport.spec
 * @summary Contract tests for the deterministic scripted agent-chat transport
 * used by the demo page and the fake-transport Storybook stories.
 * @description Proves the transport is a real {@link AgentChatTransport}: no
 * network, deterministic run ids, the full conversation envelope timeline
 * (streamed text, reasoning, code, tool parts, node counters, terminal
 * delivery through both callbacks), the structured-object partials, cancel
 * teardown, replay under the recorded run id, speed configuration, and the
 * demo-side-channel reset event.
 */
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";

import {
  agentChatFoldEnvelope,
  emptyAgentChatFoldState,
} from "./agentEnvelopeFold";
import {
  AGENT_CHAT_DEMO_WORKFLOW_ID,
  AgentChatFakeTransport,
} from "./AgentChatFakeTransport";
import type {
  AgentChatDemoEvent,
  AgentChatMessagePart,
  AgentChatRunDescriptor,
  AgentChatSendRequest,
  AgentChatTransportHandlers,
} from "../types";

const REQUEST: AgentChatSendRequest = {
  message: "show me the full roundtrip",
  attachments: [],
  knowledgeSourceIds: [],
  sessionId: "demo-session",
  userId: null,
};

type RecordingHandlers = AgentChatTransportHandlers & {
  events: GraphRunEventEnvelope[];
  terminals: GraphRunEventEnvelope[];
  errors: unknown[];
};

function recordingHandlers(): RecordingHandlers {
  const events: GraphRunEventEnvelope[] = [];
  const terminals: GraphRunEventEnvelope[] = [];
  const errors: unknown[] = [];
  return {
    events,
    terminals,
    errors,
    onEvent: (envelope) => events.push(envelope),
    onTerminal: (envelope) => terminals.push(envelope),
    onError: (error) => errors.push(error),
  };
}

function expectSubset(actual: unknown, expected: unknown): void {
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    const actualItems = actual as unknown[];
    expect(actualItems.length).toBeGreaterThanOrEqual(expected.length);
    expected.forEach((entry, index) => expectSubset(actualItems[index], entry));
    return;
  }
  if (expected !== null && typeof expected === "object") {
    expect(actual).not.toBeNull();
    for (const [key, value] of Object.entries(
      expected as Record<string, unknown>,
    )) {
      expectSubset((actual as Record<string, unknown>)[key], value);
    }
    return;
  }
  expect(actual).toEqual(expected);
}

function keysOf(envelope: GraphRunEventEnvelope): Set<string> {
  return new Set(Object.keys(envelope));
}

function typesOf(events: GraphRunEventEnvelope[]): GraphExecutionEventType[] {
  return events.map((event) => event.type);
}

function nodeOutputs(events: GraphRunEventEnvelope[]): GraphRunEventEnvelope[] {
  return events.filter(
    (event) => event.type === GraphExecutionEventType.NODE_OUTPUT,
  );
}

function payloadOf(envelope: GraphRunEventEnvelope): Record<string, unknown> {
  return (envelope.payload ?? {}) as Record<string, unknown>;
}

function partsOf(envelope: GraphRunEventEnvelope): AgentChatMessagePart[] {
  const parts = payloadOf(envelope)["parts"];
  return Array.isArray(parts) ? (parts as AgentChatMessagePart[]) : [];
}

function hasPartKind(
  envelope: GraphRunEventEnvelope,
  kind: AgentChatMessagePart["kind"],
): boolean {
  return partsOf(envelope).some((part) => part.kind === kind);
}

function hasTool(
  envelope: GraphRunEventEnvelope,
  name: string,
): boolean {
  return partsOf(envelope).some(
    (part) => part.kind === "tool" && part.name === name,
  );
}

async function play(
  transport: AgentChatFakeTransport,
  message = REQUEST.message,
): Promise<{ descriptor: AgentChatRunDescriptor; handlers: RecordingHandlers }> {
  const handlers = recordingHandlers();
  const descriptor = await transport.send({ ...REQUEST, message }, handlers);
  await jest.advanceTimersByTimeAsync(60_000);
  return { descriptor, handlers };
}

describe("AgentChatFakeTransport", () => {
  let fetchSpy: jest.Mock;
  let xhrOpenSpy: jest.SpyInstance;
  let xhrSendSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    xhrOpenSpy = jest.spyOn(XMLHttpRequest.prototype, "open");
    xhrSendSpy = jest.spyOn(XMLHttpRequest.prototype, "send");
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("resolves a deterministic run id without performing any network call", async () => {
    const transport = new AgentChatFakeTransport();
    const handlers = recordingHandlers();

    const descriptor = await transport.send(REQUEST, handlers);

    expect(descriptor).toEqual({
      runId: "demo-run-1",
      eventsUrl: "/demo/agent-chat/runs/demo-run-1/events",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(xhrSendSpy).not.toHaveBeenCalled();
    expect(handlers.errors).toEqual([]);

    const second = await transport.send(REQUEST, handlers);
    expect(second.runId).toBe("demo-run-2");
  });

  it("runs the conversation script as a full graph roundtrip", async () => {
    const transport = new AgentChatFakeTransport();
    const { descriptor, handlers } = await play(transport);

    const types = typesOf(handlers.events);
    expect(types[0]).toBe(GraphExecutionEventType.WORKFLOW_STARTED);
    expect(types).toContain(GraphExecutionEventType.NODE_QUEUED);
    expect(types).toContain(GraphExecutionEventType.NODE_STARTED);
    expect(types).toContain(GraphExecutionEventType.NODE_COMPLETED);
    expect(types).toContain(GraphExecutionEventType.NODE_OUTPUT);
    expect(types).toContain(GraphExecutionEventType.GRAPH_RUN_LOG);
    expect(types).toContain(GraphExecutionEventType.WORKFLOW_SUSPENDED);
    expect(types[types.length - 1]).toBe(
      GraphExecutionEventType.WORKFLOW_COMPLETED,
    );

    expect(handlers.terminals).toHaveLength(1);
    expect(handlers.terminals[0].type).toBe(
      GraphExecutionEventType.WORKFLOW_COMPLETED,
    );
    expect(
      handlers.events.filter(
        (event) => event.type === GraphExecutionEventType.WORKFLOW_COMPLETED,
      ),
    ).toHaveLength(1);
    expect(transport.isRunning(descriptor.runId)).toBe(false);
  });

  it("stamps every envelope with the demo run id and workflow id", async () => {
    const transport = new AgentChatFakeTransport();
    const { descriptor, handlers } = await play(transport);

    for (const event of [...handlers.events, ...handlers.terminals]) {
      expect(event.runId).toBe(descriptor.runId);
      expect(event.workflowId).toBe(AGENT_CHAT_DEMO_WORKFLOW_ID);
      expect(event.sequence).toBeGreaterThan(0);
      expect(typeof event.timestamp).toBe("string");
      expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
    }

    const sequences = handlers.events.map((event) => event.sequence);
    expect(sequences).toEqual(
      Array.from({ length: sequences.length }, (_, index) => index + 1),
    );
  });

  it("streams the assistant text through cumulative, in-place NODE_OUTPUT updates", async () => {
    const transport = new AgentChatFakeTransport();
    const { descriptor, handlers } = await play(transport);

    const outputs = nodeOutputs(handlers.events);
    const messageId = `${descriptor.runId}:assistant`;
    const assistantOutputs = outputs.filter(
      (event) => payloadOf(event)["messageId"] === messageId,
    );
    expect(assistantOutputs.length).toBeGreaterThan(5);

    const streamingOutputs = assistantOutputs.filter(
      (event) => payloadOf(event)["streaming"] === true,
    );
    expect(streamingOutputs.length).toBeGreaterThan(3);

    const streamedTexts = streamingOutputs
      .map((event) =>
        partsOf(event).find((part) => part.kind === "text"),
      )
      .filter((part): part is AgentChatMessagePart & { kind: "text" } => !!part)
      .map((part) => part.text);
    expect(streamedTexts.length).toBeGreaterThan(3);
    for (let index = 1; index < streamedTexts.length; index += 1) {
      expect(streamedTexts[index].startsWith(streamedTexts[index - 1])).toBe(
        true,
      );
    }

    const textOutputs = assistantOutputs.filter((event) =>
      partsOf(event).some((part) => part.kind === "text"),
    );
    const finalTextOutput = textOutputs[textOutputs.length - 1];
    expect(payloadOf(finalTextOutput)["streaming"]).toBeUndefined();
    const finalTextPart = partsOf(finalTextOutput).find(
      (part) => part.kind === "text",
    );
    expect(finalTextPart).toMatchObject({ streaming: false });
    expect((finalTextPart as { text: string }).text).toContain("Lisbon");
  });

  it("includes a reasoning part, a code part, and the three tool parts", async () => {
    const transport = new AgentChatFakeTransport();
    const { handlers } = await play(transport);
    const outputs = nodeOutputs(handlers.events);

    expect(outputs.some((event) => hasPartKind(event, "reasoning"))).toBe(true);
    expect(outputs.some((event) => hasPartKind(event, "code"))).toBe(true);

    const withAllTools = outputs.find(
      (event) =>
        hasTool(event, "orders") &&
        hasTool(event, "tracker") &&
        hasTool(event, "weather"),
    );
    expect(withAllTools).toBeDefined();

    const ordersPart = partsOf(withAllTools!).find(
      (part) => part.kind === "tool" && part.name === "orders",
    );
    expect(ordersPart).toMatchObject({ status: "succeeded" });
  });

  it("folds into a completed roundtrip with node counters and the final transcript", async () => {
    const transport = new AgentChatFakeTransport();
    const { descriptor, handlers } = await play(transport);

    let state = emptyAgentChatFoldState();
    for (const event of handlers.events) {
      state = agentChatFoldEnvelope(state, event);
    }

    expect(state.messages.filter((message) => message.role === "assistant")).toHaveLength(1);
    const assistant = state.messages.find(
      (message) => message.role === "assistant",
    );
    expect(assistant?.content).toBe(
      "Approve sending this summary to the customer?",
    );
    const finalText = assistant?.parts?.find((part) => part.kind === "text");
    expect(finalText).toMatchObject({ kind: "text" });
    expect((finalText as { text: string }).text).toContain("Lisbon");
    expect(assistant?.parts?.some((part) => part.kind === "tool")).toBe(true);

    const roundtrip = state.roundtrips.find(
      (entry) => entry.runId === descriptor.runId,
    );
    expect(roundtrip).toMatchObject({ status: "succeeded" });
    expect(roundtrip?.nodeCount).toBeGreaterThanOrEqual(4);
    expect(roundtrip?.completedNodeCount).toBeGreaterThanOrEqual(3);
    expect(roundtrip?.logLines).toBe(2);
    expect(roundtrip?.finishedAt).toBeDefined();
  });

  it("emits every demo-only component family through demoEvents$", async () => {
    const transport = new AgentChatFakeTransport();
    const seen: AgentChatDemoEvent[] = [];
    transport.demoEvents$.subscribe((event) => seen.push(event));

    await play(transport);

    expect(seen[0]).toEqual({ kind: "reset" });
    const kinds = new Set(seen.map((event) => event.kind));
    for (const kind of [
      "workflow-steps",
      "progress",
      "approval",
      "agent-step",
      "nested-agent",
      "orders",
      "tracker",
      "weather",
      "notification",
    ]) {
      expect(kinds.has(kind as AgentChatDemoEvent["kind"])).toBe(true);
    }

    const approval = seen.find((event) => event.kind === "approval");
    expect(approval).toMatchObject({
      kind: "approval",
      status: "pending",
      runId: "demo-run-approval",
      toolName: "sendSummary",
    });

    const progress = seen.filter((event) => event.kind === "progress");
    expect(
      progress.some(
        (event) =>
          event.kind === "progress" &&
          event.event.id === "done" &&
          event.event.done === true,
      ),
    ).toBe(true);

    const workflowSteps = seen.filter((event) => event.kind === "workflow-steps");
    expect(workflowSteps.length).toBeGreaterThan(2);
    expect(
      workflowSteps.some(
        (event) =>
          event.kind === "workflow-steps" &&
          event.steps.length === 3 &&
          event.steps.every((step) => step.status === "success"),
      ),
    ).toBe(true);
  });

  it("plays the structured-object scenario as cumulative DeepPartial payloads", async () => {
    const transport = new AgentChatFakeTransport();
    transport.configure({ scenario: "structured-object" });
    const seen: AgentChatDemoEvent[] = [];
    transport.demoEvents$.subscribe((event) => seen.push(event));

    const { handlers } = await play(transport);

    const partials = nodeOutputs(handlers.events)
      .map((event) => payloadOf(event)["structuredOutput"])
      .filter((value) => value !== undefined) as Record<string, unknown>[];

    expect(partials.length).toBeGreaterThanOrEqual(7);
    for (let index = 1; index < partials.length; index += 1) {
      expectSubset(partials[index], partials[index - 1]);
    }

    const full = partials[partials.length - 1];
    expect(full).toEqual({
      invoiceNumber: "INV-2026-0142",
      vendor: "Northwind Supply",
      total: 1480,
      currency: "EUR",
      dueDate: "2026-11-30",
      lines: [
        { item: "Console seat", quantity: 2, unitPrice: 640 },
        { item: "Support plan", quantity: 1, unitPrice: 200 },
      ],
    });

    let state = emptyAgentChatFoldState();
    for (const event of handlers.events) {
      state = agentChatFoldEnvelope(state, event);
    }
    expect(state.structuredObject?.value).toEqual(full);
    expect(handlers.terminals[0].type).toBe(
      GraphExecutionEventType.WORKFLOW_COMPLETED,
    );
    expect(seen[0]).toEqual({ kind: "reset" });
  });

  it("cancels a live run with exactly one terminal cancellation and no later envelopes", async () => {
    const transport = new AgentChatFakeTransport();
    const handlers = recordingHandlers();
    const descriptor = await transport.send(REQUEST, handlers);

    await jest.advanceTimersByTimeAsync(100);
    expect(handlers.events.length).toBeGreaterThan(0);
    expect(transport.isRunning(descriptor.runId)).toBe(true);

    await transport.cancel(descriptor.runId);

    expect(transport.isRunning(descriptor.runId)).toBe(false);
    expect(handlers.terminals).toHaveLength(1);
    expect(handlers.terminals[0].type).toBe(
      GraphExecutionEventType.WORKFLOW_CANCELLED,
    );
    expect(
      handlers.events.filter(
        (event) => event.type === GraphExecutionEventType.WORKFLOW_CANCELLED,
      ),
    ).toHaveLength(1);
    expect(handlers.events[handlers.events.length - 1].type).toBe(
      GraphExecutionEventType.WORKFLOW_CANCELLED,
    );

    const afterCancel = handlers.events.length;
    await jest.advanceTimersByTimeAsync(60_000);

    expect(handlers.events).toHaveLength(afterCancel);
    expect(handlers.terminals).toHaveLength(1);
    expect(handlers.errors).toEqual([]);
  });

  it("replays the current scenario under the recorded run id", async () => {
    const transport = new AgentChatFakeTransport();
    const first = await play(transport);

    const descriptor: AgentChatRunDescriptor = {
      runId: "recorded-demo-run",
      eventsUrl: "/demo/agent-chat/runs/recorded-demo-run/events",
    };
    const replayHandlers = recordingHandlers();
    await transport.replay(descriptor, replayHandlers);
    await jest.advanceTimersByTimeAsync(60_000);

    expect(replayHandlers.events.length).toBeGreaterThan(0);
    expect(
      replayHandlers.events.every(
        (event) => event.runId === descriptor.runId,
      ),
    ).toBe(true);
    const distinctTypes = (events: GraphRunEventEnvelope[]): GraphExecutionEventType[] =>
      typesOf(events).filter((type, index, all) => type !== all[index - 1]);
    expect(distinctTypes(replayHandlers.events)).toEqual(
      distinctTypes(first.handlers.events),
    );
    expect(replayHandlers.terminals[0].type).toBe(
      GraphExecutionEventType.WORKFLOW_COMPLETED,
    );
  });

  it("changes playback timing with configure({ speed }) without changing fixture order", async () => {
    const slow = new AgentChatFakeTransport();
    const fast = new AgentChatFakeTransport();
    fast.configure({ speed: 20 });

    const slowHandlers = recordingHandlers();
    const fastHandlers = recordingHandlers();
    await slow.send(REQUEST, slowHandlers);
    await fast.send(REQUEST, fastHandlers);

    await jest.advanceTimersByTimeAsync(400);

    expect(slowHandlers.terminals).toHaveLength(0);
    expect(fastHandlers.terminals).toHaveLength(1);
    expect(fastHandlers.events.length).toBeGreaterThan(
      slowHandlers.events.length,
    );

    await jest.advanceTimersByTimeAsync(60_000);

    expect(typesOf(fastHandlers.events)).toEqual(typesOf(slowHandlers.events));
    expect(fastHandlers.terminals[0].type).toBe(
      slowHandlers.terminals[0].type,
    );
  });

  it("spot-checks envelope shape for the scripted node outputs", async () => {
    const transport = new AgentChatFakeTransport();
    const { handlers } = await play(transport);

    const outputs = nodeOutputs(handlers.events);
    expect(outputs.some((event) => event.nodeId === "chat-agent")).toBe(true);
    expect(outputs.some((event) => event.nodeId === "chat-tools")).toBe(true);

    const logEvents = handlers.events.filter(
      (event) => event.type === GraphExecutionEventType.GRAPH_RUN_LOG,
    );
    expect(logEvents).toHaveLength(2);
    for (const event of logEvents) {
      expect(keysOf(event)).toContain("payload");
      expect(payloadOf(event)["message"]).toEqual(expect.any(String));
    }
  });
});
