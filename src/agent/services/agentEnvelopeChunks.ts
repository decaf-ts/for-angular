/**
 * @module for-angular/agent/services/agentEnvelopeChunks
 * @summary Producer that folds decaf graph run envelopes into @ai-sdk
 * `UIMessageChunk`s (the transport seam's chunk producer).
 * @description The decaf envelope fold ({@link agentChatFoldEnvelope}) no longer
 * owns transcript state. Instead this producer translates each
 * {@link GraphRunEventEnvelope} into the protocol-native chunks the @ai-sdk
 * `Chat` state machine consumes:
 *
 * - `NODE_OUTPUT` response text → `text-start` / `text-delta` / `text-end`
 *   (cumulative payloads are diffed into deltas);
 * - `NODE_OUTPUT` reasoning / tool / code / attachment parts → `reasoning-*`,
 *   `tool-input-*` + `tool-output-*`, `custom` (`decaf.code`) and `file` chunks;
 * - `NODE_OUTPUT` structured output → a `data-structured-object` data part;
 * - terminal failures / cancellations → a `data-error` data part plus `finish`
 *   (the protocol has no error role);
 * - `workflow.suspended` / `workflow.resumed` → decaf side-channel only (see
 *   the approval-bridge spike on SAA-1844: run-level approvals are not
 *   tool-call-scoped and have no client-callable resume endpoint).
 *
 * Decaf telemetry and the structured-object history stay decaf-owned and are
 * pushed through {@link AgentChatSideChannelHandlers} while chunks stream.
 */
import {
  GraphExecutionEventType,
  isGraphRunTerminalEventType,
} from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type { UIMessageChunk } from "ai";
import {
  agentChatFoldEnvelope,
  emptyAgentChatFoldState,
  type AgentChatFoldState,
} from "./agentEnvelopeFold";
import type {
  AgentChatApprovalStatus,
  AgentChatMessagePart,
  AgentChatSideChannelHandlers,
} from "../types";

/** Options accepted by {@link AgentChatEnvelopeChunkProducer}. */
export interface AgentChatChunkProducerOptions {
  /** Backend run id the envelopes belong to. */
  runId: string;
  /** Conversation session id stamped on the message metadata. */
  sessionId?: string;
  /** Assistant message id; defaults to `<runId>:assistant`. */
  messageId?: string;
  /** `true` when the producer replays a recorded run (flags telemetry). */
  replay?: boolean;
  /** Decaf side-channel handlers fed alongside the chunk stream. */
  handlers?: AgentChatSideChannelHandlers;
  /** Clock override (tests); defaults to `() => new Date().toISOString()`. */
  now?: () => string;
}

interface ReasoningState {
  started: boolean;
  emitted: string;
  ended: boolean;
}

interface ToolState {
  inputStarted: boolean;
  inputAvailable: boolean;
  outputEmitted: boolean;
}

/**
 * Stateful envelope → `UIMessageChunk` producer. One instance per streamed run
 * (live send or replay). `start()` must be enqueued before any `push()` chunks,
 * and `finish()` closes the message with a `finish` chunk.
 */
export class AgentChatEnvelopeChunkProducer {
  /** Backend run id. */
  readonly runId: string;
  /** Assistant message id used by the `start` chunk. */
  readonly messageId: string;

  private readonly sessionId?: string;
  private readonly replay: boolean;
  private readonly handlers?: AgentChatSideChannelHandlers;
  private readonly now: () => string;

  private foldState: AgentChatFoldState = emptyAgentChatFoldState();
  private started = false;
  private finished = false;

  private textId: string;
  private textSequence = 0;
  private emittedText = "";
  private textStarted = false;
  private textEnded = false;

  private readonly reasoning = new Map<string, ReasoningState>();
  private readonly tools = new Map<string, ToolState>();
  private readonly codeEmitted = new Map<string, string>();

  /**
   * @param options - Run identity, replay flag, side-channel handlers, and clock.
   */
  constructor(options: AgentChatChunkProducerOptions) {
    this.runId = options.runId;
    this.messageId = options.messageId ?? `${options.runId}:assistant`;
    this.sessionId = options.sessionId;
    this.replay = options.replay === true;
    this.handlers = options.handlers;
    this.now = options.now ?? (() => new Date().toISOString());
    this.textId = `${this.messageId}:text`;
  }

  /** Chunks opening the assistant message: `start`, `start-step`, metadata.
   *
   * @returns The opening chunks, or an empty array on a repeated call.
   */
  start(): UIMessageChunk[] {
    if (this.started) return [];
    this.started = true;
    return [
      {
        type: "start",
        messageId: this.messageId,
        messageMetadata: {
          runId: this.runId,
          ...(this.sessionId ? { sessionId: this.sessionId } : {}),
          createdAt: this.now(),
        },
      },
      { type: "start-step" },
    ];
  }

  /**
   * Folds one envelope into chunks (and decaf side-channel state).
   *
   * @param envelope - Run envelope, live or replayed.
   * @returns The protocol chunks to enqueue, in order.
   */
  push(envelope: GraphRunEventEnvelope): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    const previous = this.foldState;
    this.foldState = agentChatFoldEnvelope(previous, envelope, {
      replay: this.replay,
    });
    this.emitSideChannel(previous, envelope);

    switch (envelope.type) {
      case GraphExecutionEventType.NODE_OUTPUT:
        chunks.push(...this.nodeOutputChunks(envelope));
        break;
      case GraphExecutionEventType.WORKFLOW_COMPLETED:
        chunks.push(...this.completedChunks(envelope));
        break;
      case GraphExecutionEventType.WORKFLOW_FAILED:
        chunks.push(...this.failureChunks(envelope, "error"));
        break;
      case GraphExecutionEventType.WORKFLOW_CANCELLED:
        chunks.push(...this.failureChunks(envelope, "other"));
        break;
      case GraphExecutionEventType.WORKFLOW_SUSPENDED:
        this.surfaceApproval(envelope, "pending");
        break;
      case GraphExecutionEventType.WORKFLOW_RESUMED:
        this.surfaceApproval(envelope, "approved");
        break;
      default:
        break;
    }

    return chunks;
  }

  /** Chunks closing the message: pending text end plus `finish`.
   *
   * @param {"stop" | "error" | "other"} [finishReason] - Protocol finish reason; defaults to `stop`.
   * @returns The closing chunks, or an empty array on a repeated call.
   */
  finish(finishReason: "stop" | "error" | "other" = "stop"): UIMessageChunk[] {
    if (this.finished) return [];
    this.finished = true;
    const chunks: UIMessageChunk[] = [];
    if (this.textStarted && !this.textEnded) {
      chunks.push({ type: "text-end", id: this.textId });
      this.textEnded = true;
    }
    chunks.push({ type: "finish", finishReason });
    return chunks;
  }

  private nodeOutputChunks(envelope: GraphRunEventEnvelope): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    const payload = recordOf(envelope.payload);
    const response =
      stringMemberOf(envelope.payload, "response") ??
      stringMemberOf(envelope.payload, "text");
    const streaming = payload?.["streaming"] === true;
    if (response !== undefined) {
      chunks.push(...this.textChunks(response, streaming));
    }
    const parts = messagePartsOf(payload);
    for (const part of parts) {
      if (part.kind === "text") continue;
      chunks.push(...this.partChunks(part));
    }
    const actions = actionNamesOf(envelope.payload);
    if (actions.length > 0) {
      chunks.push({ type: "message-metadata", messageMetadata: { actions } });
    }
    chunks.push(...this.structuredObjectChunks(envelope));
    return chunks;
  }

  private textChunks(text: string, streaming: boolean): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    if (this.textEnded) {
      this.beginNewTextPart();
    }
    let delta = text;
    if (this.emittedText.length > 0) {
      if (text === this.emittedText) {
        delta = "";
      } else if (text.startsWith(this.emittedText)) {
        delta = text.slice(this.emittedText.length);
      } else {
        if (this.textStarted) chunks.push({ type: "text-end", id: this.textId });
        this.beginNewTextPart();
      }
    }
    if (delta.length > 0) {
      if (!this.textStarted) {
        chunks.push({ type: "text-start", id: this.textId });
        this.textStarted = true;
      }
      chunks.push({ type: "text-delta", id: this.textId, delta });
    }
    this.emittedText = text;
    if (!streaming && this.textStarted && !this.textEnded) {
      chunks.push({ type: "text-end", id: this.textId });
      this.textEnded = true;
    }
    return chunks;
  }

  private beginNewTextPart(): void {
    this.textSequence += 1;
    this.textId = `${this.messageId}:text:${this.textSequence}`;
    this.emittedText = "";
    this.textStarted = false;
    this.textEnded = false;
  }

  private partChunks(part: AgentChatMessagePart): UIMessageChunk[] {
    switch (part.kind) {
      case "reasoning":
        return this.reasoningChunks(part);
      case "tool":
        return this.toolChunks(part);
      case "code":
        return this.codeChunks(part);
      case "attachment":
        return this.attachmentChunks(part);
      default:
        return [];
    }
  }

  private reasoningChunks(part: Extract<AgentChatMessagePart, { kind: "reasoning" }>): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    const id = part.id || `${this.messageId}:reasoning`;
    const state = this.reasoning.get(id) ?? {
      started: false,
      emitted: "",
      ended: false,
    };
    if (!state.started && part.content.length > 0) {
      chunks.push({ type: "reasoning-start", id });
      state.started = true;
    }
    if (part.content.length > state.emitted.length) {
      const delta = part.content.slice(state.emitted.length);
      chunks.push({ type: "reasoning-delta", id, delta });
      state.emitted = part.content;
    }
    if (!part.streaming && state.started && !state.ended) {
      chunks.push({ type: "reasoning-end", id });
      state.ended = true;
    }
    this.reasoning.set(id, state);
    return chunks;
  }

  private toolChunks(part: Extract<AgentChatMessagePart, { kind: "tool" }>): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    const toolCallId = part.id;
    const state = this.tools.get(toolCallId) ?? {
      inputStarted: false,
      inputAvailable: false,
      outputEmitted: false,
    };
    if (!state.inputStarted) {
      chunks.push({ type: "tool-input-start", toolCallId, toolName: part.name });
      state.inputStarted = true;
    }
    if (!state.inputAvailable && part.status !== "queued") {
      chunks.push({
        type: "tool-input-available",
        toolCallId,
        toolName: part.name,
        input: part.input ?? null,
      });
      state.inputAvailable = true;
    }
    if (!state.outputEmitted) {
      if (part.status === "succeeded") {
        chunks.push({
          type: "tool-output-available",
          toolCallId,
          output: part.output ?? null,
        });
        state.outputEmitted = true;
      } else if (part.status === "failed") {
        chunks.push({
          type: "tool-output-error",
          toolCallId,
          errorText: part.error ?? "Tool failed",
        });
        state.outputEmitted = true;
      }
    }
    this.tools.set(toolCallId, state);
    return chunks;
  }

  private codeChunks(part: Extract<AgentChatMessagePart, { kind: "code" }>): UIMessageChunk[] {
    const id = part.id || `${this.messageId}:code`;
    const signature = `${part.language ?? ""}\u0000${part.filename ?? ""}\u0000${part.title ?? ""}\u0000${part.code}`;
    if (this.codeEmitted.get(id) === signature) return [];
    this.codeEmitted.set(id, signature);
    return [
      {
        type: "custom",
        kind: "decaf.code",
        providerMetadata: {
          decaf: {
            code: part.code,
            ...(part.language ? { language: part.language } : {}),
            ...(part.filename ? { filename: part.filename } : {}),
            ...(part.title ? { title: part.title } : {}),
          },
        },
      },
    ];
  }

  private attachmentChunks(part: Extract<AgentChatMessagePart, { kind: "attachment" }>): UIMessageChunk[] {
    const url = part.attachment.url;
    if (!url) return [];
    return [
      {
        type: "file",
        url,
        mediaType: part.attachment.mime || "application/octet-stream",
      },
    ];
  }

  private structuredObjectChunks(envelope: GraphRunEventEnvelope): UIMessageChunk[] {
    const payload = recordOf(envelope.payload);
    if (!payload) return [];
    const value =
      payload["structuredOutput"] !== undefined
        ? payload["structuredOutput"]
        : payload["object"] !== undefined
          ? payload["object"]
          : undefined;
    if (value === undefined || value === null) return [];
    return [
      {
        type: "data-structured-object",
        id: `${this.runId}:structured`,
        data: value,
      },
    ];
  }

  private completedChunks(envelope: GraphRunEventEnvelope): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    if (!this.textStarted && this.emittedText.length === 0) {
      const fallback =
        stringMemberOf(envelope.payload, "answer") ??
        stringMemberOf(envelope.payload, "response") ??
        stringMemberOf(envelope.payload, "result");
      if (fallback !== undefined) chunks.push(...this.textChunks(fallback, false));
    }
    chunks.push(...this.finish("stop"));
    return chunks;
  }

  private failureChunks(
    envelope: GraphRunEventEnvelope,
    finishReason: "error" | "other",
  ): UIMessageChunk[] {
    const chunks: UIMessageChunk[] = [];
    const message =
      (typeof envelope.error?.message === "string" && envelope.error.message) ||
      stringMemberOf(envelope.payload, "message") ||
      (envelope.type === GraphExecutionEventType.WORKFLOW_CANCELLED
        ? "agent.chat.status.cancelled"
        : "agent.chat.status.failed");
    chunks.push({
      type: "data-error",
      data: {
        message,
        ...(envelope.error?.name ? { name: envelope.error.name } : {}),
      },
    });
    chunks.push(...this.finish(finishReason));
    return chunks;
  }

  private surfaceApproval(
    envelope: GraphRunEventEnvelope,
    status: AgentChatApprovalStatus,
  ): void {
    const payload = recordOf(envelope.payload);
    this.handlers?.onDemoEvent?.({
      kind: "approval",
      status,
      runId: envelope.runId,
      ...(payload?.["suspend"] !== undefined ? { payload: payload["suspend"] } : {}),
    });
  }

  private emitSideChannel(
    previous: AgentChatFoldState,
    envelope: GraphRunEventEnvelope,
  ): void {
    const handlers = this.handlers;
    if (!handlers) return;
    const roundtrip = this.foldState.roundtrips.find(
      (entry) => entry.runId === envelope.runId,
    );
    if (roundtrip) handlers.onTelemetry?.(roundtrip);
    if (
      this.foldState.structuredObject &&
      this.foldState.structuredObject !== previous.structuredObject
    ) {
      handlers.onStructuredObject?.(this.foldState.structuredObject);
    }
    if (isGraphRunTerminalEventType(envelope.type)) {
      const error = roundtrip?.error?.message;
      if (error) handlers.onError?.(new Error(error));
    }
  }
}

/** Normalizes a `parts` payload member into known nested message parts. */
function messagePartsOf(payload: Record<string, unknown> | null): AgentChatMessagePart[] {
  const raw = payload?.["parts"];
  if (!Array.isArray(raw)) return [];
  const kinds = new Set(["text", "attachment", "tool", "reasoning", "code"]);
  const parts: AgentChatMessagePart[] = [];
  raw.forEach((entry, index) => {
    const record = recordOf(entry);
    const kind = record?.["kind"];
    if (!record || typeof kind !== "string" || !kinds.has(kind)) return;
    const id =
      typeof record["id"] === "string" && record["id"].length > 0
        ? record["id"]
        : `${kind}-${index}`;
    parts.push({ ...(record as unknown as AgentChatMessagePart), id });
  });
  return parts;
}

/** Returns `value` as a plain record, or `null` for non-object/array values. */
function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Normalizes an `actions` payload (string or `{ name }` entries) to names. */
function actionNamesOf(value: unknown): string[] {
  const actions = recordOf(value)?.["actions"];
  if (!Array.isArray(actions)) return [];
  return actions.flatMap((entry) => {
    if (typeof entry === "string" && entry.length > 0) return [entry];
    const name = recordOf(entry)?.["name"];
    return typeof name === "string" && name.length > 0 ? [name] : [];
  });
}

/** Reads a non-empty string member from a record, otherwise `undefined`. */
function stringMemberOf(value: unknown, member: string): string | undefined {
  const record = recordOf(value);
  if (!record) return undefined;
  const memberValue = record[member];
  return typeof memberValue === "string" && memberValue.length > 0 ? memberValue : undefined;
}
