import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";

import {
  agentChatFoldEnvelope,
  emptyAgentChatFoldState,
  type AgentChatFoldState,
} from "./agentEnvelopeFold";
import type { AgentChatMessageView } from "../types";

const RUN_ID = "run-1";
const OTHER_RUN_ID = "run-2";
const WORKFLOW_ID = "wf-1";
const TS = "2026-01-01T00:00:00.000Z";

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

function stateWithMessages(
  messages: Partial<AgentChatMessageView>[],
): AgentChatFoldState {
  return {
    ...emptyAgentChatFoldState(),
    messages: messages.map((message) => ({
      id: "seed",
      role: "user",
      content: "",
      attachments: [],
      knowledgeSourceIds: [],
      createdAt: TS,
      ...message,
    })) as AgentChatMessageView[],
  };
}

function pendingUserMessage(runId: string = RUN_ID): Partial<AgentChatMessageView> {
  return {
    id: "user:1",
    role: "user",
    content: "hello",
    runId,
    pending: true,
  };
}

describe("agentChatFoldEnvelope", () => {
  it("starts from an empty state with no messages, roundtrips, or structured object", () => {
    expect(emptyAgentChatFoldState()).toEqual({
      messages: [],
      roundtrips: [],
      structuredObject: null,
    });
  });

  describe("workflow.started", () => {
    it("marks the roundtrip running with a startedAt timestamp", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
      );

      expect(state.roundtrips).toEqual([
        { runId: RUN_ID, status: "running", startedAt: TS },
      ]);
      expect(state.messages).toEqual([]);
    });
  });

  describe("node counters", () => {
    it("counts queued and completed nodes", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_QUEUED, { nodeId: "n1" }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_QUEUED, { nodeId: "n2" }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(3, GraphExecutionEventType.NODE_COMPLETED, { nodeId: "n1" }),
      );

      expect(state.roundtrips[0]).toMatchObject({
        runId: RUN_ID,
        status: "queued",
        nodeCount: 2,
        completedNodeCount: 1,
      });
    });
  });

  describe("node.output", () => {
    it("appends an assistant message from the response payload", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(3, GraphExecutionEventType.NODE_OUTPUT, {
          nodeId: "agent",
          payload: { response: "the answer" },
        }),
      );

      expect(state.messages).toEqual([
        {
          id: `${RUN_ID}:3`,
          role: "assistant",
          content: "the answer",
          attachments: [],
          knowledgeSourceIds: [],
          createdAt: TS,
          runId: RUN_ID,
          actions: undefined,
        },
      ]);
    });

    it("falls back to the text member when response is absent", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(3, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { text: "text answer" },
        }),
      );

      expect(state.messages[0].content).toBe("text answer");
    });

    it("replaces a pending placeholder carrying the same runId instead of appending", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(3, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "the answer" },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        id: `${RUN_ID}:3`,
        role: "assistant",
        content: "the answer",
        runId: RUN_ID,
      });
    });

    it("keeps a pending placeholder of another run untouched", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage(OTHER_RUN_ID)]),
        envelope(3, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "the answer" },
        }),
      );

      expect(state.messages).toHaveLength(2);
      expect(state.messages[0]).toMatchObject({ role: "user", pending: true });
      expect(state.messages[1].role).toBe("assistant");
    });

    it("promotes a queued roundtrip to running when a message is appended", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "early" },
        }),
      );

      expect(state.roundtrips[0].status).toBe("running");
    });

    it("ignores node.output payloads without a string response or text", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { outputs: { count: 2 } },
        }),
      );

      expect(state.messages).toEqual([]);
    });

    it("ignores empty-string and non-string response members", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "" },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: 42 },
        }),
      );

      expect(state.messages).toEqual([]);
    });
  });

  describe("parts and streaming", () => {
    it("folds a parts array alongside the response text", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(3, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            response: "the answer",
            parts: [
              { id: "reasoning", kind: "reasoning", content: "thinking", open: true },
              { id: "answer", kind: "text", text: "the answer", streaming: false },
              { id: "code", kind: "code", code: "const x = 1;", language: "typescript" },
              { id: "tool-orders", kind: "tool", name: "orders", status: "succeeded" },
            ],
          },
        }),
      );

      expect(state.messages[0].content).toBe("the answer");
      expect(state.messages[0].parts).toEqual([
        { id: "reasoning", kind: "reasoning", content: "thinking", open: true },
        { id: "answer", kind: "text", text: "the answer", streaming: false },
        { id: "code", kind: "code", code: "const x = 1;", language: "typescript" },
        { id: "tool-orders", kind: "tool", name: "orders", status: "succeeded" },
      ]);
    });

    it("derives fallback ids and drops unknown part kinds", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            response: "ok",
            parts: [
              { kind: "text", text: "hello" },
              { kind: "attachment" },
              { kind: "mystery" },
              "not-a-record",
              { kind: "code", id: "", code: "x" },
            ],
          },
        }),
      );

      expect(state.messages[0].parts).toEqual([
        { kind: "text", text: "hello", id: "text-0" },
        { kind: "attachment", id: "attachment-1" },
        { kind: "code", id: "code-4", code: "x" },
      ]);
    });

    it("accepts a parts-only payload without a response or text member", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            streaming: true,
            parts: [{ id: "answer", kind: "text", text: "hello", streaming: true }],
          },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        role: "assistant",
        content: "",
        streaming: true,
      });
      expect(state.messages[0].parts).toEqual([
        { id: "answer", kind: "text", text: "hello", streaming: true },
      ]);
    });

    it("updates a streamed message in place through the explicit messageId", () => {
      const runId = RUN_ID;
      const messageId = `${runId}:assistant`;
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            messageId,
            response: "Hel",
            streaming: true,
            parts: [{ id: "answer", kind: "text", text: "Hel", streaming: true }],
          },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            messageId,
            response: "Hello",
            streaming: true,
            parts: [{ id: "answer", kind: "text", text: "Hello", streaming: true }],
          },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        id: messageId,
        content: "Hello",
        streaming: true,
      });
      expect(state.messages[0].parts).toEqual([
        { id: "answer", kind: "text", text: "Hello", streaming: true },
      ]);
    });

    it("replaces the streamed message with the final non-streaming update", () => {
      const messageId = `${RUN_ID}:assistant`;
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            messageId,
            response: "Hello",
            streaming: true,
            parts: [{ id: "answer", kind: "text", text: "Hello", streaming: true }],
          },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            messageId,
            response: "Hello world",
            parts: [
              { id: "answer", kind: "text", text: "Hello world", streaming: false },
              { id: "code", kind: "code", code: "x = 1" },
            ],
          },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        id: messageId,
        content: "Hello world",
      });
      expect(state.messages[0].streaming).toBeUndefined();
      expect(state.messages[0].parts).toEqual([
        { id: "answer", kind: "text", text: "Hello world", streaming: false },
        { id: "code", kind: "code", code: "x = 1" },
      ]);
    });

    it("updates the newest streaming assistant message when no messageId is present", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "one", streaming: true },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "one two", streaming: true },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(3, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "one two three" },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        content: "one two three",
        id: `${RUN_ID}:3`,
      });
      expect(state.messages[0].streaming).toBeUndefined();
    });

    it("keeps legacy response/text payloads free of parts and streaming flags", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "legacy answer" },
        }),
      );

      expect(state.messages[0]).toMatchObject({
        content: "legacy answer",
        role: "assistant",
      });
      expect(state.messages[0].parts).toBeUndefined();
      expect(state.messages[0].streaming).toBeUndefined();
    });
  });

  describe("actions extraction", () => {
    it("extracts plain string action entries", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "ok", actions: ["queryRevenue", "sendMail"] },
        }),
      );

      expect(state.messages[0].actions).toEqual(["queryRevenue", "sendMail"]);
    });

    it("extracts action names from {name} object entries", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            response: "ok",
            actions: [{ name: "queryRevenue" }, { name: "sendMail" }],
          },
        }),
      );

      expect(state.messages[0].actions).toEqual(["queryRevenue", "sendMail"]);
    });

    it("mixes string and object entries and drops empty ones", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: {
            response: "ok",
            actions: ["queryRevenue", {}, { name: "" }, { name: "sendMail" }, 7],
          },
        }),
      );

      expect(state.messages[0].actions).toEqual(["queryRevenue", "sendMail"]);
    });

    it("leaves actions undefined when the payload carries no usable actions", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "ok", actions: [] },
        }),
      );

      expect(state.messages[0].actions).toBeUndefined();
    });
  });

  describe("structured object", () => {
    it("records the structuredOutput member as the structured object view", () => {
      const value = { invoiceNumber: "INV-1", total: 2 };
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "ok", structuredOutput: value },
        }),
      );

      expect(state.structuredObject).toEqual({ runId: RUN_ID, value });
    });

    it("falls back to the object member when structuredOutput is absent", () => {
      const value = { ok: true };
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { object: value },
        }),
      );

      expect(state.structuredObject).toEqual({ runId: RUN_ID, value });
    });

    it("replaces a previously recorded structured object", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { structuredOutput: { first: true } },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { structuredOutput: { second: true } },
        }),
      );

      expect(state.structuredObject).toEqual({
        runId: RUN_ID,
        value: { second: true },
      });
    });

    it("ignores null and missing structured members", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { structuredOutput: null },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "ok" },
        }),
      );

      expect(state.structuredObject).toBeNull();
    });
  });

  describe("node.failed", () => {
    it("replaces a pending placeholder with an error message and records the roundtrip error", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(3, GraphExecutionEventType.NODE_FAILED, {
          nodeId: "agent",
          error: { name: "MastraAgentError", message: "boom" },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        id: `${RUN_ID}:3`,
        role: "error",
        content: "boom",
        runId: RUN_ID,
      });
      expect(state.roundtrips[0].error).toEqual({
        name: "MastraAgentError",
        message: "boom",
      });
    });

    it("records the roundtrip error even without a pending placeholder", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_FAILED, {
          error: { name: "MastraAgentError", message: "boom" },
        }),
      );

      expect(state.messages).toEqual([]);
      expect(state.roundtrips[0].error).toEqual({ name: "MastraAgentError", message: "boom" });
    });

    it("keeps the first recorded roundtrip error", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_FAILED, {
          error: { name: "First", message: "first" },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_FAILED, {
          error: { name: "Second", message: "second" },
        }),
      );

      expect(state.roundtrips[0].error).toEqual({ name: "First", message: "first" });
    });

    it("ignores a node failure without an error payload", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(1, GraphExecutionEventType.NODE_FAILED, { nodeId: "agent" }),
      );

      expect(state.messages[0]).toMatchObject({ role: "user", pending: true });
      expect(state.roundtrips[0].error).toBeUndefined();
    });
  });

  describe("workflow.completed", () => {
    it("marks the roundtrip succeeded with a finishedAt timestamp", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );

      expect(state.roundtrips[0]).toMatchObject({
        status: "succeeded",
        finishedAt: TS,
      });
    });

    it("appends an assistant message from the answer fallback when no assistant message exists for the run", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { answer: "fallback answer" },
        }),
      );

      expect(state.messages).toEqual([
        {
          id: `${RUN_ID}:4`,
          role: "assistant",
          content: "fallback answer",
          attachments: [],
          knowledgeSourceIds: [],
          createdAt: TS,
          runId: RUN_ID,
        },
      ]);
    });

    it("falls back to response and then result members in order", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { response: "via response" },
        }),
      );
      expect(state.messages[0].content).toBe("via response");

      state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { result: "via result" },
        }),
      );
      expect(state.messages[0].content).toBe("via result");
    });

    it("does not append a fallback when an assistant message for the run already exists", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "streamed answer" },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { answer: "fallback answer" },
        }),
      );

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe("streamed answer");
    });

    it("appends nothing when there is no fallback payload", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );

      expect(state.messages).toEqual([]);
    });

    it("does not leak another run's assistant message into the fallback check", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "other run answer" },
        }, OTHER_RUN_ID),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { answer: "fallback answer" },
        }),
      );

      expect(state.messages).toHaveLength(2);
      expect(state.messages[1].content).toBe("fallback answer");
    });
  });

  describe("workflow.failed", () => {
    it("marks the roundtrip failed, records the error, and replaces the pending placeholder", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(3, GraphExecutionEventType.WORKFLOW_FAILED, {
          error: { name: "MastraAgentError", message: "engine blew up" },
        }),
      );

      expect(state.roundtrips[0]).toMatchObject({
        status: "failed",
        finishedAt: TS,
        error: { name: "MastraAgentError", message: "engine blew up" },
      });
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toMatchObject({
        role: "error",
        content: "engine blew up",
      });
    });

    it("falls back to the generic failure label when the pending placeholder has no error payload", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(1, GraphExecutionEventType.WORKFLOW_FAILED),
      );

      expect(state.messages[0]).toMatchObject({
        role: "error",
        content: "agent.chat.status.failed",
      });
      expect(state.roundtrips[0].error).toBeUndefined();
    });
  });

  describe("workflow.cancelled", () => {
    it("marks the roundtrip cancelled and replaces the pending placeholder", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(3, GraphExecutionEventType.WORKFLOW_CANCELLED),
      );

      expect(state.roundtrips[0]).toMatchObject({
        status: "cancelled",
        finishedAt: TS,
      });
      expect(state.messages[0]).toMatchObject({
        role: "error",
        content: "agent.chat.status.cancelled",
      });
    });

    it("uses the cancellation error message when the payload carries one", () => {
      const state = agentChatFoldEnvelope(
        stateWithMessages([pendingUserMessage()]),
        envelope(3, GraphExecutionEventType.WORKFLOW_CANCELLED, {
          error: { name: "Error", message: "cancelled by user" },
        }),
      );

      expect(state.messages[0]).toMatchObject({ content: "cancelled by user" });
    });
  });

  describe("graph.run.log", () => {
    it("counts log lines", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.GRAPH_RUN_LOG, {
          payload: { level: "info", message: "one" },
        }),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.GRAPH_RUN_LOG, {
          payload: { level: "warn", message: "two" },
        }),
      );

      expect(state.roundtrips[0].logLines).toBe(2);
    });
  });

  describe("non-contract and lifecycle safety", () => {
    it("ignores event types that are not part of the chat fold", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.NODE_STARTED, { nodeId: "n1" }),
      );

      expect(state.messages).toEqual([]);
      expect(state.roundtrips[0]).toMatchObject({ runId: RUN_ID, status: "queued" });
    });

    it("does not mutate the input state", () => {
      const initial = stateWithMessages([pendingUserMessage()]);
      const frozenMessages = initial.messages.slice();

      agentChatFoldEnvelope(
        initial,
        envelope(1, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "answer" },
        }),
      );

      expect(initial.messages).toEqual(frozenMessages);
      expect(initial.messages).not.toBe(frozenMessages);
    });

    it("creates a separate roundtrip per runId", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED, {}, OTHER_RUN_ID),
      );

      expect(state.roundtrips.map((r) => r.runId)).toEqual([RUN_ID, OTHER_RUN_ID]);
    });

    it("is idempotent on re-folding a terminal envelope: no duplicate fallback message", () => {
      const terminal = envelope(4, GraphExecutionEventType.WORKFLOW_COMPLETED, {
        payload: { answer: "fallback answer" },
      });

      const once = agentChatFoldEnvelope(emptyAgentChatFoldState(), terminal);
      const twice = agentChatFoldEnvelope(once, terminal);

      expect(twice.messages).toHaveLength(1);
      expect(twice.messages[0].content).toBe("fallback answer");
      expect(twice.roundtrips).toHaveLength(1);
      expect(twice.roundtrips[0]).toMatchObject({ status: "succeeded", finishedAt: TS });
    });

    it("is idempotent on re-folding a failed terminal envelope: the pending replacement happens once", () => {
      const failure = envelope(3, GraphExecutionEventType.WORKFLOW_FAILED, {
        error: { name: "MastraAgentError", message: "boom" },
      });
      const seeded = stateWithMessages([pendingUserMessage()]);

      const once = agentChatFoldEnvelope(seeded, failure);
      const twice = agentChatFoldEnvelope(once, failure);

      expect(twice.messages).toHaveLength(1);
      expect(twice.messages[0]).toMatchObject({ role: "error", content: "boom" });
      expect(twice.roundtrips).toHaveLength(1);
      expect(twice.roundtrips[0]).toMatchObject({ status: "failed", finishedAt: TS });
    });

    it("does not overwrite an already finished roundtrip timestamp on re-fold", () => {
      const started = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
      );
      const completed = agentChatFoldEnvelope(
        started,
        envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED, { timestamp: TS }),
      );

      expect(completed.roundtrips[0].finishedAt).toBe(TS);
    });
  });

  describe("replay flag", () => {
    it("tags roundtrips created during a replay fold as replayed", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
        { replay: true },
      );

      expect(state.roundtrips[0]).toMatchObject({ runId: RUN_ID, replayed: true });
    });

    it("does not tag an existing roundtrip again when re-folded during replay", () => {
      let state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
        { replay: true },
      );
      state = agentChatFoldEnvelope(
        state,
        envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
          payload: { response: "replayed answer" },
        }),
        { replay: true },
      );

      expect(state.roundtrips).toHaveLength(1);
      expect(state.roundtrips[0].replayed).toBe(true);
      expect(state.messages[0].content).toBe("replayed answer");
    });

    it("does not tag live folds as replayed", () => {
      const state = agentChatFoldEnvelope(
        emptyAgentChatFoldState(),
        envelope(1, GraphExecutionEventType.WORKFLOW_STARTED),
      );

      expect(state.roundtrips[0].replayed).toBeUndefined();
    });
  });
});
