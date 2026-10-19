/**
 * @module for-angular/agent/services/agentEnvelopeFold
 * @summary Pure fold of graph run SSE envelopes into agent chat conversation
 * state (slice U3 of SAA-836).
 * @description Consumes the canonical {@link GraphRunEventEnvelope} stream the
 * run backend emits and produces the immutable conversation state the chat UI
 * renders ({@link AgentChatFoldState}): transcript
 * {@link AgentChatMessageView} entries, per-run
 * {@link AgentChatRoundtripTelemetry}, and the latest
 * {@link AgentChatStructuredObjectView}.
 *
 * The fold is a pure function: every call copies the incoming arrays and never
 * mutates the given state, so consumers (e.g. {@link AgentChatService}) can
 * re-run it idempotently and keep Angular signals pointing at fresh objects.
 *
 * Agent responses are detected on `NODE_OUTPUT` envelopes through the
 * `response` / `text` members of the `node.output` payload (the first
 * non-empty string wins); a `WORKFLOW_COMPLETED` envelope may still add a
 * fallback assistant message from `answer` / `response` / `result` members
 * when no agent node produced one. Pending placeholders are replaced in place
 * by the first matching response, failure, or terminal envelope, and terminal
 * timestamps are idempotent (the first terminal envelope wins).
 */
import {
  GraphExecutionEventType,
  isGraphRunTerminalEventType,
} from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type {
  AgentChatMessageView,
  AgentChatRoundtripTelemetry,
  AgentChatStructuredObjectView,
} from "../types";

/**
 * Conversation state produced by folding a run's envelopes: the transcript
 * messages, per-run telemetry rows, and the latest structured object.
 */
export interface AgentChatFoldState {
  /** Transcript entries in arrival order. */
  messages: AgentChatMessageView[];
  /** Per-run telemetry rows in first-seen order. */
  roundtrips: AgentChatRoundtripTelemetry[];
  /** Latest structured object extracted from a `NODE_OUTPUT` payload, if any. */
  structuredObject: AgentChatStructuredObjectView | null;
}

/** Creates the empty conversation state a fresh chat session starts from.
 *
 * @returns A state with empty `messages`/`roundtrips` and `structuredObject: null`.
 */
export function emptyAgentChatFoldState(): AgentChatFoldState {
  return { messages: [], roundtrips: [], structuredObject: null };
}

/**
 * Folds one envelope into the conversation state, returning a new
 * {@link AgentChatFoldState} (the input is never mutated).
 *
 * Per-envelope handling:
 * - `WORKFLOW_STARTED` marks the roundtrip `running` and records `startedAt`.
 * - `NODE_QUEUED` / `NODE_COMPLETED` / `GRAPH_RUN_LOG` bump the telemetry
 *   counters.
 * - `NODE_OUTPUT` folds an agent response (via `response`/`text` payload
 *   members, replacing any pending placeholder) and captures
 *   `structuredOutput`/`object` payloads as the structured object.
 * - `NODE_FAILED` records the first error and swaps the pending placeholder
 *   for an error message.
 * - `WORKFLOW_COMPLETED` marks the roundtrip `succeeded` and adds a fallback
 *   assistant message (from `answer`/`response`/`result`) when none exists.
 * - `WORKFLOW_FAILED` / `WORKFLOW_CANCELLED` mark the terminal status and
 *   swap the pending placeholder for an error message.
 *
 * Terminal envelopes additionally stamp `finishedAt` (idempotently) when the
 * event type itself did not. Unrecognized event types are ignored.
 *
 * @example
 * ```ts
 * let state = emptyAgentChatFoldState();
 * for (const envelope of envelopes) state = agentChatFoldEnvelope(state, envelope);
 * state.messages;    // transcript views
 * state.roundtrips;  // telemetry rows
 * state.structuredObject; // latest structured object or null
 * ```
 *
 * @param state - Current conversation state.
 * @param envelope - Run envelope to fold in.
 * @param opts - `replay: true` marks newly created roundtrips as replays.
 * @returns The updated state (new object; new arrays where changed).
 */
export function agentChatFoldEnvelope(
  state: AgentChatFoldState,
  envelope: GraphRunEventEnvelope,
  opts: { replay?: boolean } = {},
): AgentChatFoldState {
  const messages = state.messages.slice();
  const roundtrips = state.roundtrips.slice();
  let structuredObject = state.structuredObject;

  const roundtrip = roundtripOf(roundtrips, envelope.runId, opts.replay === true);
  switch (envelope.type) {
    case GraphExecutionEventType.WORKFLOW_STARTED:
      roundtrip.status = "running";
      roundtrip.startedAt = envelope.timestamp;
      break;
    case GraphExecutionEventType.NODE_QUEUED:
      roundtrip.nodeCount = (roundtrip.nodeCount ?? 0) + 1;
      break;
    case GraphExecutionEventType.NODE_COMPLETED:
      roundtrip.completedNodeCount = (roundtrip.completedNodeCount ?? 0) + 1;
      break;
    case GraphExecutionEventType.NODE_OUTPUT:
      foldNodeOutput(messages, roundtrip, envelope);
      foldStructuredObject(envelope, (value) => {
        structuredObject = { runId: envelope.runId, value };
      });
      break;
    case GraphExecutionEventType.NODE_FAILED:
      foldNodeFailure(messages, roundtrip, envelope);
      break;
    case GraphExecutionEventType.WORKFLOW_COMPLETED:
      foldWorkflowCompleted(messages, roundtrip, envelope);
      break;
    case GraphExecutionEventType.WORKFLOW_FAILED:
      roundtrip.status = "failed";
      roundtrip.finishedAt = envelope.timestamp;
      roundtrip.error = errorPayloadOf(envelope);
      replacePendingWithFailure(messages, envelope, roundtrip);
      break;
    case GraphExecutionEventType.WORKFLOW_CANCELLED:
      roundtrip.status = "cancelled";
      roundtrip.finishedAt = envelope.timestamp;
      replacePendingWithFailure(messages, envelope, roundtrip);
      break;
    case GraphExecutionEventType.GRAPH_RUN_LOG:
      roundtrip.logLines = (roundtrip.logLines ?? 0) + 1;
      break;
    default:
      break;
  }

  if (isGraphRunTerminalEventType(envelope.type) && !roundtrip.finishedAt) {
    roundtrip.finishedAt = envelope.timestamp;
  }

  return { messages, roundtrips, structuredObject };
}

/**
 * Finds the roundtrip for `runId` in `roundtrips`, creating (and appending) a
 * `queued` telemetry row — flagged as a replay when `replay` is `true` — on
 * first sight of the run.
 */
function roundtripOf(
  roundtrips: AgentChatRoundtripTelemetry[],
  runId: string,
  replay: boolean,
): AgentChatRoundtripTelemetry {
  const existing = roundtrips.find((entry) => entry.runId === runId);
  if (existing) return existing;
  const created: AgentChatRoundtripTelemetry = {
    runId,
    status: "queued",
    ...(replay ? { replayed: true } : {}),
  };
  roundtrips.push(created);
  return created;
}

/**
 * Folds a `NODE_OUTPUT` envelope: reads the agent response from the
 * `response`/`text` payload members and, when present, replaces the run's
 * pending placeholder (or appends a new assistant message) and flips a
 * `queued` roundtrip to `running`. Non-response outputs are ignored.
 */
function foldNodeOutput(
  messages: AgentChatMessageView[],
  roundtrip: AgentChatRoundtripTelemetry,
  envelope: GraphRunEventEnvelope,
): void {
  const response = stringMemberOf(envelope.payload, "response") ?? stringMemberOf(envelope.payload, "text");
  if (response === undefined) return;
  const actions = actionNamesOf(envelope.payload);
  const pendingIndex = messages.findIndex(
    (message) => message.pending && message.runId === envelope.runId,
  );
  const view: AgentChatMessageView = {
    id: `${envelope.runId}:${envelope.sequence}`,
    role: "assistant",
    content: response,
    attachments: [],
    knowledgeSourceIds: [],
    createdAt: envelope.timestamp,
    runId: envelope.runId,
    actions: actions.length ? actions : undefined,
  };
  if (pendingIndex >= 0) {
    messages[pendingIndex] = view;
    return;
  }
  messages.push(view);
  if (roundtrip.status === "queued") roundtrip.status = "running";
}

/**
 * Folds a `NODE_FAILED` envelope: records the first error payload on the
 * roundtrip and swaps the run's pending placeholder for an error message
 * carrying the failure text. Node failures without a pending placeholder only
 * update the telemetry error.
 */
function foldNodeFailure(
  messages: AgentChatMessageView[],
  roundtrip: AgentChatRoundtripTelemetry,
  envelope: GraphRunEventEnvelope,
): void {
  const payload = errorPayloadOf(envelope);
  if (!payload?.message) return;
  roundtrip.error = roundtrip.error ?? payload;
  const pendingIndex = messages.findIndex(
    (message) => message.pending && message.runId === envelope.runId,
  );
  if (pendingIndex < 0) return;
  messages[pendingIndex] = {
    id: `${envelope.runId}:${envelope.sequence}`,
    role: "error",
    content: payload.message,
    attachments: [],
    knowledgeSourceIds: [],
    createdAt: envelope.timestamp,
    runId: envelope.runId,
  };
}

/**
 * Folds a `WORKFLOW_COMPLETED` envelope: marks the roundtrip `succeeded` and,
 * only when the run produced no assistant message, adds a fallback one from
 * the `answer`/`response`/`result` payload members.
 */
function foldWorkflowCompleted(
  messages: AgentChatMessageView[],
  roundtrip: AgentChatRoundtripTelemetry,
  envelope: GraphRunEventEnvelope,
): void {
  roundtrip.status = "succeeded";
  roundtrip.finishedAt = envelope.timestamp;
  const hasAssistant = messages.some(
    (message) => message.role === "assistant" && message.runId === envelope.runId,
  );
  if (hasAssistant) return;
  const fallback =
    stringMemberOf(envelope.payload, "answer") ??
    stringMemberOf(envelope.payload, "response") ??
    stringMemberOf(envelope.payload, "result");
  if (fallback === undefined) return;
  messages.push({
    id: `${envelope.runId}:${envelope.sequence}`,
    role: "assistant",
    content: fallback,
    attachments: [],
    knowledgeSourceIds: [],
    createdAt: envelope.timestamp,
    runId: envelope.runId,
  });
}

/**
 * Replaces the run's pending placeholder message with an error message built
 * from the terminal envelope's error payload, falling back to the
 * `agent.chat.status.cancelled` / `agent.chat.status.failed` i18n keys when
 * the envelope carries no message. No-op when there is no pending placeholder.
 */
function replacePendingWithFailure(
  messages: AgentChatMessageView[],
  envelope: GraphRunEventEnvelope,
  roundtrip: AgentChatRoundtripTelemetry,
): void {
  const payload = errorPayloadOf(envelope);
  const pendingIndex = messages.findIndex(
    (message) => message.pending && message.runId === envelope.runId,
  );
  if (pendingIndex < 0) return;
  messages[pendingIndex] = {
    id: `${envelope.runId}:${envelope.sequence}`,
    role: "error",
    content:
      payload?.message ??
      (roundtrip.status === "cancelled" ? "agent.chat.status.cancelled" : "agent.chat.status.failed"),
    attachments: [],
    knowledgeSourceIds: [],
    createdAt: envelope.timestamp,
    runId: envelope.runId,
  };
}

/**
 * Extracts the structured object (use-object style) from a `NODE_OUTPUT`
 * envelope's payload: the `structuredOutput` member wins over `object`; both
 * must be present and non-null. Invokes `set` at most once per envelope.
 */
function foldStructuredObject(
  envelope: GraphRunEventEnvelope,
  set: (value: unknown) => void,
): void {
  const payload = recordOf(envelope.payload);
  if (!payload) return;
  const structured =
    payload["structuredOutput"] !== undefined
      ? payload["structuredOutput"]
      : payload["object"] !== undefined
        ? payload["object"]
        : undefined;
  if (structured !== undefined && structured !== null) set(structured);
}

/** Returns `value` as a plain record, or `null` for non-object/array values. */
function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Reads a non-empty string member from a record, otherwise `undefined`. */
function stringMemberOf(value: unknown, member: string): string | undefined {
  const record = recordOf(value);
  if (!record) return undefined;
  const memberValue = record[member];
  return typeof memberValue === "string" && memberValue.length > 0 ? memberValue : undefined;
}

/** Normalizes an `actions` payload (string or `{ name }` entries) to a list of action names. */
function actionNamesOf(value: unknown): string[] {
  const record = recordOf(value);
  const actions = record?.["actions"];
  if (!Array.isArray(actions)) return [];
  return actions.flatMap((entry) => {
    if (typeof entry === "string" && entry.length > 0) return [entry];
    const actionRecord = recordOf(entry);
    const name = actionRecord?.["name"];
    return typeof name === "string" && name.length > 0 ? [name] : [];
  });
}

/** Normalizes an envelope's error to `{ name, message }`, or `undefined` when absent/message-less. */
function errorPayloadOf(envelope: GraphRunEventEnvelope): { name?: string; message?: string } | undefined {
  if (!envelope.error) return undefined;
  const message = typeof envelope.error.message === "string" ? envelope.error.message : undefined;
  if (!message) return undefined;
  return { name: envelope.error.name, message };
}
