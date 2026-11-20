/**
 * @module for-angular/agent/services/agentEnvelopeChunks.spec
 * @summary Protocol tests for the `GraphRunEventEnvelope` →
 * `UIMessageChunk` producer that feeds the @ai-sdk `Chat` state machine.
 * @description Exercises the producer in isolation (no transport, no Angular):
 * cumulative text diffing, reasoning/tool/code lifecycles, structured data
 * parts, terminal error conversion, approval side-channel events, and the
 * decaf telemetry/structured callbacks pushed alongside the chunk stream.
 */
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { UIMessageChunk } from "ai";

import type {
  AgentChatMessagePart,
  AgentChatSideChannelHandlers,
} from "../types";
import {
  AgentChatEnvelopeChunkProducer,
  type AgentChatChunkProducerOptions,
} from "./agentEnvelopeChunks";

const RUN_ID = "run-1";
const WORKFLOW_ID = "wf-1";
const TS = "2026-01-01T00:00:00.000Z";
const MESSAGE_ID = `${RUN_ID}:assistant`;

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

function output(
  sequence: number,
  payload: Record<string, unknown>,
): GraphRunEventEnvelope {
  return envelope(sequence, GraphExecutionEventType.NODE_OUTPUT, { payload });
}

function partOutput(
  sequence: number,
  parts: AgentChatMessagePart[],
): GraphRunEventEnvelope {
  return output(sequence, { parts });
}

function producer(
  options: Partial<AgentChatChunkProducerOptions> = {},
): AgentChatEnvelopeChunkProducer {
  return new AgentChatEnvelopeChunkProducer({
    runId: RUN_ID,
    now: () => TS,
    ...options,
  });
}

function types(chunks: UIMessageChunk[]): string[] {
  return chunks.map((chunk) => chunk.type);
}

describe("AgentChatEnvelopeChunkProducer", () => {
  describe("message lifecycle", () => {
    it("opens the assistant message once and closes it with a finish chunk", () => {
      const subject = producer();

      const start = subject.start();
      expect(start).toEqual([
        {
          type: "start",
          messageId: MESSAGE_ID,
          messageMetadata: {
            runId: RUN_ID,
            createdAt: TS,
          },
        },
        { type: "start-step" },
      ]);
      expect(subject.start()).toEqual([]);

      const finish = subject.finish("stop");
      expect(types(finish)).toEqual(["finish"]);
      expect(finish[0]).toMatchObject({ type: "finish", finishReason: "stop" });
      expect(subject.finish("stop")).toEqual([]);
    });

    it("stamps the session id on the start metadata when configured", () => {
      const start = producer({ sessionId: "session-1" }).start();
      expect(start[0]).toMatchObject({
        type: "start",
        messageMetadata: {
          runId: RUN_ID,
          sessionId: "session-1",
          createdAt: TS,
        },
      });
    });
  });

  describe("text diffing", () => {
    it("diffs cumulative responses into start/delta/end chunks", () => {
      const subject = producer();

      expect(
        subject.push(output(1, { response: "", streaming: true })),
      ).toEqual([]);

      const first = subject.push(
        output(2, { response: "Hel", streaming: true }),
      );
      expect(types(first)).toEqual(["text-start", "text-delta"]);
      expect(first[0]).toMatchObject({
        type: "text-start",
        id: `${MESSAGE_ID}:text`,
      });
      expect(first[1]).toMatchObject({
        type: "text-delta",
        id: `${MESSAGE_ID}:text`,
        delta: "Hel",
      });

      const second = subject.push(
        output(3, { response: "Hello", streaming: true }),
      );
      expect(types(second)).toEqual(["text-delta"]);
      expect(second[0]).toMatchObject({ type: "text-delta", delta: "lo" });

      expect(
        subject.push(output(4, { response: "Hello", streaming: true })),
      ).toEqual([]);

      expect(
        subject.push(output(5, { response: "Hello", streaming: false })),
      ).toEqual([{ type: "text-end", id: `${MESSAGE_ID}:text` }]);
    });

    it("opens a new text part when a non-cumulative replacement arrives mid-stream", () => {
      const subject = producer();

      subject.push(output(1, { response: "abc", streaming: true }));
      const replacement = subject.push(
        output(2, { response: "xyz", streaming: true }),
      );

      expect(types(replacement)).toEqual([
        "text-end",
        "text-start",
        "text-delta",
      ]);
      expect(replacement[0]).toMatchObject({
        type: "text-end",
        id: `${MESSAGE_ID}:text`,
      });
      expect(replacement[1]).toMatchObject({
        type: "text-start",
        id: `${MESSAGE_ID}:text:1`,
      });
      expect(replacement[2]).toMatchObject({
        type: "text-delta",
        id: `${MESSAGE_ID}:text:1`,
        delta: "xyz",
      });
    });

    it("starts a fresh text part for a replacement after the previous part ended", () => {
      const subject = producer();

      subject.push(output(1, { response: "first", streaming: false }));
      const replacement = subject.push(
        output(2, { response: "second", streaming: false }),
      );

      expect(types(replacement)).toEqual([
        "text-start",
        "text-delta",
        "text-end",
      ]);
      expect(replacement[0]).toMatchObject({
        type: "text-start",
        id: `${MESSAGE_ID}:text:1`,
      });
      expect(replacement[1]).toMatchObject({
        type: "text-delta",
        delta: "second",
      });
    });

    it("uses the workflow-completed answer as a fallback text when no node output streamed", () => {
      const subject = producer();

      const chunks = subject.push(
        envelope(1, GraphExecutionEventType.WORKFLOW_COMPLETED, {
          payload: { answer: "fallback answer" },
        }),
      );

      expect(types(chunks)).toEqual([
        "text-start",
        "text-delta",
        "text-end",
        "finish",
      ]);
      expect(chunks[1]).toMatchObject({ type: "text-delta", delta: "fallback answer" });
    });
  });

  describe("reasoning lifecycle", () => {
    it("streams reasoning deltas and closes the part when streaming ends", () => {
      const subject = producer();
      const reasoning = (
        content: string,
        streaming: boolean,
      ): GraphRunEventEnvelope =>
        partOutput(1, [
          { id: "r1", kind: "reasoning", content, streaming },
        ]);

      const start = subject.push(reasoning("think", true));
      expect(types(start)).toEqual(["reasoning-start", "reasoning-delta"]);
      expect(start[0]).toMatchObject({ type: "reasoning-start", id: "r1" });
      expect(start[1]).toMatchObject({
        type: "reasoning-delta",
        id: "r1",
        delta: "think",
      });

      const delta = subject.push(reasoning("thinking", true));
      expect(delta).toEqual([
        { type: "reasoning-delta", id: "r1", delta: "ing" },
      ]);

      expect(subject.push(reasoning("thinking", false))).toEqual([
        { type: "reasoning-end", id: "r1" },
      ]);
      expect(subject.push(reasoning("thinking", false))).toEqual([]);
    });
  });

  describe("tool lifecycle", () => {
    const tool = (
      status: "queued" | "running" | "succeeded" | "failed",
      extra: Record<string, unknown> = {},
    ): AgentChatMessagePart => ({
      id: "t1",
      kind: "tool",
      name: "search",
      status,
      ...extra,
    } as AgentChatMessagePart);

    it("emits input start/available and output available across the tool lifecycle", () => {
      const subject = producer();

      const queued = subject.push(partOutput(1, [tool("queued")]));
      expect(queued).toEqual([
        { type: "tool-input-start", toolCallId: "t1", toolName: "search" },
      ]);

      const running = subject.push(
        partOutput(2, [tool("running", { input: { q: "revenue" } })]),
      );
      expect(running).toEqual([
        {
          type: "tool-input-available",
          toolCallId: "t1",
          toolName: "search",
          input: { q: "revenue" },
        },
      ]);

      const succeeded = subject.push(
        partOutput(3, [
          tool("succeeded", { input: { q: "revenue" }, output: { rows: 3 } }),
        ]),
      );
      expect(succeeded).toEqual([
        {
          type: "tool-output-available",
          toolCallId: "t1",
          output: { rows: 3 },
        },
      ]);

      expect(
        subject.push(
          partOutput(4, [
            tool("succeeded", { input: { q: "revenue" }, output: { rows: 3 } }),
          ]),
        ),
      ).toEqual([]);
    });

    it("emits a tool output error for failed invocations", () => {
      const subject = producer();
      subject.push(partOutput(1, [tool("running", { input: {} })]));

      const failed = subject.push(
        partOutput(2, [tool("failed", { input: {}, error: "boom" })]),
      );
      expect(failed).toEqual([
        {
          type: "tool-output-error",
          toolCallId: "t1",
          errorText: "boom",
        },
      ]);
    });

    it("falls back to a generic error text when the failed tool carries none", () => {
      const subject = producer();
      subject.push(
        partOutput(1, [
          { id: "t2", kind: "tool", name: "lookup", status: "running" },
        ]),
      );

      const failed = subject.push(
        partOutput(2, [
          { id: "t2", kind: "tool", name: "lookup", status: "failed" },
        ]),
      );
      expect(failed).toEqual([
        {
          type: "tool-output-error",
          toolCallId: "t2",
          errorText: "Tool failed",
        },
      ]);
    });
  });

  describe("code parts", () => {
    it("emits a decaf.code custom chunk once per distinct payload", () => {
      const subject = producer();
      const code = (value: string): GraphRunEventEnvelope =>
        partOutput(1, [
          {
            id: "c1",
            kind: "code",
            code: value,
            language: "sql",
            filename: "query.sql",
            title: "Query",
          },
        ]);

      const chunks = subject.push(code("SELECT 1"));
      expect(chunks).toEqual([
        {
          type: "custom",
          kind: "decaf.code",
          providerMetadata: {
            decaf: {
              code: "SELECT 1",
              language: "sql",
              filename: "query.sql",
              title: "Query",
            },
          },
        },
      ]);

      expect(subject.push(code("SELECT 1"))).toEqual([]);
      expect(types(subject.push(code("SELECT 2")))).toEqual(["custom"]);
    });
  });

  describe("attachments", () => {
    it("forwards attachment parts as protocol file chunks", () => {
      const subject = producer();
      const chunks = subject.push(
        partOutput(1, [
          {
            id: "a1",
            kind: "attachment",
            attachment: {
              id: "a1",
              name: "notes.txt",
              mime: "text/plain",
              size: 3,
              url: "blob:notes",
            },
          },
        ]),
      );

      expect(chunks).toEqual([
        {
          type: "file",
          url: "blob:notes",
          mediaType: "text/plain",
        },
      ]);
    });

    it("skips attachments without a URL", () => {
      const subject = producer();
      expect(
        subject.push(
          partOutput(1, [
            {
              id: "a1",
              kind: "attachment",
              attachment: {
                id: "a1",
                name: "notes.txt",
                mime: "text/plain",
                size: 3,
              },
            },
          ]),
        ),
      ).toEqual([]);
    });
  });

  describe("structured output", () => {
    it("emits a stable data-structured-object part for structuredOutput", () => {
      const subject = producer();
      const chunks = subject.push(
        output(1, {
          response: "extracted",
          structuredOutput: { invoiceNumber: "INV-1" },
        }),
      );

      expect(chunks).toEqual(
        expect.arrayContaining([
          {
            type: "data-structured-object",
            id: `${RUN_ID}:structured`,
            data: { invoiceNumber: "INV-1" },
          },
        ]),
      );
    });

    it("falls back to the object member and ignores empty values", () => {
      const subject = producer();
      expect(
        subject.push(output(1, { object: { total: 2 } })),
      ).toEqual([
        {
          type: "data-structured-object",
          id: `${RUN_ID}:structured`,
          data: { total: 2 },
        },
      ]);
      expect(subject.push(output(2, { structuredOutput: null }))).toEqual([]);
    });
  });

  describe("terminal envelopes", () => {
    it("converts a workflow failure into a data-error part plus an error finish", () => {
      const subject = producer();

      const chunks = subject.push(
        envelope(1, GraphExecutionEventType.WORKFLOW_FAILED, {
          error: { name: "Boom", message: "kaboom" },
        }),
      );

      expect(chunks).toEqual([
        { type: "data-error", data: { message: "kaboom", name: "Boom" } },
        { type: "finish", finishReason: "error" },
      ]);
      expect(subject.finish("error")).toEqual([]);
    });

    it("converts a workflow cancellation into a data-error part plus an other finish", () => {
      const subject = producer();
      const chunks = subject.push(
        envelope(1, GraphExecutionEventType.WORKFLOW_CANCELLED),
      );

      expect(chunks).toEqual([
        {
          type: "data-error",
          data: { message: "agent.chat.status.cancelled" },
        },
        { type: "finish", finishReason: "other" },
      ]);
    });

    it("closes an open text part before finishing on a terminal envelope", () => {
      const subject = producer();
      subject.push(output(1, { response: "partial", streaming: true }));

      const chunks = subject.push(
        envelope(2, GraphExecutionEventType.WORKFLOW_COMPLETED),
      );
      expect(types(chunks)).toEqual(["text-end", "finish"]);
    });
  });

  describe("approval side channel", () => {
    it("surfaces workflow.suspended on the side channel without protocol chunks", () => {
      const onDemoEvent = jest.fn();
      const subject = producer({ handlers: { onDemoEvent } });

      const chunks = subject.push(
        envelope(1, GraphExecutionEventType.WORKFLOW_SUSPENDED, {
          payload: { suspend: { reason: "needs approval" } },
        }),
      );

      expect(chunks).toEqual([]);
      expect(onDemoEvent).toHaveBeenCalledWith({
        kind: "approval",
        status: "pending",
        runId: RUN_ID,
        payload: { reason: "needs approval" },
      });
    });

    it("surfaces workflow.resumed as an approved side-channel event without chunks", () => {
      const onDemoEvent = jest.fn();
      const subject = producer({ handlers: { onDemoEvent } });

      const chunks = subject.push(
        envelope(2, GraphExecutionEventType.WORKFLOW_RESUMED),
      );

      expect(chunks).toEqual([]);
      expect(onDemoEvent).toHaveBeenCalledWith({
        kind: "approval",
        status: "approved",
        runId: RUN_ID,
      });
    });
  });

  describe("decaf side-channel callbacks", () => {
    it("pushes telemetry and structured-object snapshots alongside the chunks", () => {
      const handlers: AgentChatSideChannelHandlers = {
        onTelemetry: jest.fn(),
        onStructuredObject: jest.fn(),
        onError: jest.fn(),
      };
      const subject = producer({ handlers });

      subject.push(
        output(1, {
          response: "answer",
          structuredOutput: { ok: true },
        }),
      );

      expect(handlers.onTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: RUN_ID,
          status: "running",
        }),
      );
      expect(handlers.onStructuredObject).toHaveBeenCalledWith({
        runId: RUN_ID,
        value: { ok: true },
      });

      subject.push(
        envelope(2, GraphExecutionEventType.WORKFLOW_FAILED, {
          error: { name: "Boom", message: "kaboom" },
        }),
      );
      expect(handlers.onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("marks replayed telemetry rows when the producer is a replay", () => {
      const onTelemetry = jest.fn();
      const subject = producer({ replay: true, handlers: { onTelemetry } });

      subject.push(
        output(1, { response: "answer" }),
      );

      expect(onTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({ runId: RUN_ID, replayed: true }),
      );
    });

    it("emits action names as message metadata", () => {
      const subject = producer();
      const chunks = subject.push(
        output(1, {
          response: "answer",
          actions: ["queryRevenue", { name: "sendMail" }],
        }),
      );

      expect(chunks).toEqual(
        expect.arrayContaining([
          {
            type: "message-metadata",
            messageMetadata: { actions: ["queryRevenue", "sendMail"] },
          },
        ]),
      );
    });
  });
});
