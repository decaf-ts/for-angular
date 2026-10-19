/**
 * @module for-angular/agent/services/AgentChatService
 * @summary Component-provided signal service driving the agent chat
 * conversation state (slice U3 of SAA-836).
 * @description Owns the conversation lifecycle for `ngx-decaf-agent-chat`:
 * resolves the configured/generated session, sends user messages through the
 * injected `AGENT_CHAT_TRANSPORT`, replays recorded runs, cancels the active
 * run, and folds every run envelope (via
 * {@link agentChatFoldEnvelope}) into the Angular signals the UI binds to
 * (`messages`, `roundtrips`, `structuredObject`, plus `running`,
 * `activeRunId`, `error`, and `backendAvailable` status flags).
 *
 * Terminal envelopes arrive through **both** `onEvent` and `onTerminal` (the
 * transport contract emits terminal events on both callbacks), so
 * {@link AgentChatService.applyEnvelope} guards with a per-run sequence
 * watermark: envelopes whose `sequence` is not strictly greater than the last
 * folded one are dropped, making the double delivery a no-op.
 *
 * `userId` resolution: an explicitly configured `userId` wins; otherwise the
 * service falls back to `getOnWindow('loggedUser')` and sends `null` when no
 * user is logged in.
 */
import { Injectable, inject, signal } from "@angular/core";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { isGraphRunTerminalEventType } from "@decaf-ts/as-graph/shared";
import { getOnWindow } from "../../lib/utils/helpers";
import { GraphBackendUnavailableError } from "diagrams/src/lib/graph/execution/GraphExecutionService";
import { AGENT_CHAT_SESSION_PREFIX, AGENT_CHAT_TRANSPORT } from "../tokens/agent-chat.tokens";
import {
  agentChatFoldEnvelope,
  emptyAgentChatFoldState,
  type AgentChatFoldState,
} from "./agentEnvelopeFold";
import type {
  AgentChatAttachment,
  AgentChatConfiguration,
  AgentChatMessageView,
  AgentChatRoundtripTelemetry,
  AgentChatRunDescriptor,
  AgentChatStructuredObjectView,
  AgentChatTransport,
} from "../types";

/** Module-level counter backing locally generated message ids (`user:<n>`, `error:<n>`) and fallback session ids. */
let agentChatMessageSequence = 0;

/**
 * Conversation state service provided per `ngx-decaf-agent-chat` instance
 * (see the component's `providers`). Configure it with
 * {@link configure} during `ngOnInit`, then drive it with {@link send},
 * {@link replay}, {@link cancel}, and {@link reset}.
 *
 * @example
 * ```ts
 * const chat = inject(AgentChatService);
 * chat.configure({ workflowId: "wf-agent-demo" });
 * await chat.send("Summarize Q3 revenue", [], ["kb-handbook"]);
 * effect(() => console.log(chat.messages(), chat.roundtrips()));
 * ```
 */
@Injectable()
export class AgentChatService {
  /** Injected transport (default {@link GraphRunAgentChatTransport}; override point for custom peers). */
  private readonly transport = inject<AgentChatTransport>(AGENT_CHAT_TRANSPORT);

  /** Component-provided configuration merged over defaults on every {@link configure} call. */
  private configuration: {
    workflow?: unknown;
    workflowId?: string | null;
    sessionId?: string | null;
    userId?: string | null;
  } = {};

  /** Current conversation state the signals publish from. */
  private foldState: AgentChatFoldState = emptyAgentChatFoldState();
  /** Per-run watermark of the last folded envelope `sequence` (dedupes the transport's double terminal delivery). */
  private foldedSequences = new Map<string, number>();

  /** Transcript messages rendered by the chat's aria-live log. */
  readonly messages = signal<AgentChatMessageView[]>([]);
  /** Per-run telemetry rows rendered by the telemetry strip. */
  readonly roundtrips = signal<AgentChatRoundtripTelemetry[]>([]);
  /** Latest structured object extracted from a run, or `null`. */
  readonly structuredObject = signal<AgentChatStructuredObjectView | null>(null);
  /** `true` while a send/replay is in flight (guards concurrent sends). */
  readonly running = signal(false);
  /** Run id of the in-flight roundtrip, or `null`. */
  readonly activeRunId = signal<string | null>(null);
  /** Last surfaced error text, or `null`. */
  readonly error = signal<string | null>(null);
  /** Tri-state backend availability: `null` unknown, `false` after a {@link GraphBackendUnavailableError}. */
  readonly backendAvailable = signal<boolean | null>(null);

  /**
   * Merges component-provided configuration (workflow document/id, session id,
   * user id override) over the current configuration; called on `ngOnInit`.
   *
   * @param configuration - Component inputs merged over the current
   *   configuration; `workflow`/`workflowId` select the run target, `sessionId`
   *   pins the conversation (or `null` to regenerate on next send), and
   *   `userId` overrides `loggedUser` (`null` forces anonymous).
   */
  configure(configuration: AgentChatConfiguration & { workflow?: unknown }): void {
    this.configuration = { ...this.configuration, ...configuration };
  }

  /** Active session id: the configured one, or a generated `agent-chat-<epoch>-<seq>` that is then persisted in configuration. */
  get sessionId(): string {
    const configured = this.configuration.sessionId;
    if (configured && configured.length > 0) return configured;
    const generated = `${AGENT_CHAT_SESSION_PREFIX}-${Date.now()}-${agentChatMessageSequence}`;
    this.configuration = { ...this.configuration, sessionId: generated };
    return generated;
  }

  /**
   * Sends a user message: pushes the local user entry, calls the transport's
   * `send`, and folds streamed envelopes into the signals. No-op when the
   * message is blank or a roundtrip is already running. On a transport
   * rejection the active roundtrip fails with an error message entry.
   *
   * @param message - Raw user text (trimmed before use).
   * @param attachments - UI-only attachment metadata for the message.
   * @param knowledgeSourceIds - Selected knowledge-base ids.
   */
  async send(
    message: string,
    attachments: AgentChatAttachment[] = [],
    knowledgeSourceIds: string[] = [],
  ): Promise<void> {
    const text = message.trim();
    if (!text || this.running()) return;
    this.error.set(null);
    this.running.set(true);
    this.pushMessage({
      id: `user:${++agentChatMessageSequence}`,
      role: "user",
      content: text,
      attachments,
      knowledgeSourceIds,
      createdAt: new Date().toISOString(),
    });
    try {
      const descriptor = await this.transport.send(
        {
          workflow: this.configuration.workflow,
          workflowId: this.configuration.workflowId ?? undefined,
          message: text,
          attachments,
          knowledgeSourceIds,
          sessionId: this.sessionId,
          userId: this.userId(),
        },
        {
          onEvent: (envelope) => this.applyEnvelope(envelope, false),
          onTerminal: (envelope) => this.applyEnvelope(envelope, false),
          onError: (err) => this.surfaceStreamError(err),
        },
      );
      this.activeRunId.set(descriptor.runId);
      this.backendAvailable.set(true);
    } catch (err) {
      this.failActiveRoundtrip(err);
    }
  }

  /**
   * Re-streams a previously created run's recorded envelopes, marking newly
   * folded roundtrips as replays. No-op while another roundtrip is running.
   */
  async replay(descriptor: AgentChatRunDescriptor): Promise<void> {
    if (this.running()) return;
    this.error.set(null);
    this.running.set(true);
    try {
      await this.transport.replay(descriptor, {
        onEvent: (envelope) => this.applyEnvelope(envelope, true),
        onTerminal: (envelope) => this.applyEnvelope(envelope, true),
        onError: (err) => this.surfaceStreamError(err),
      });
    } catch (err) {
      this.failActiveRoundtrip(err);
    } finally {
      this.running.set(false);
      this.activeRunId.set(null);
    }
  }

  /** Cancels the active run through the transport; surfaces (but does not throw) transport errors. */
  async cancel(): Promise<void> {
    const runId = this.activeRunId();
    if (!runId) return;
    try {
      await this.transport.cancel(runId);
    } catch (err) {
      this.error.set(errorTextOf(err));
    }
  }

  /** Clears all conversation state, signals, and the per-run dedupe watermarks. */
  reset(): void {
    this.foldState = emptyAgentChatFoldState();
    this.foldedSequences.clear();
    this.publish();
    this.running.set(false);
    this.activeRunId.set(null);
    this.error.set(null);
  }

  /**
   * Folds one envelope into the signals. Envelopes are dropped unless their
   * `sequence` is strictly greater than the run's last folded one — this
   * dedupes the terminal envelope the transport delivers through both
   * `onEvent` and `onTerminal`. Terminal envelopes clear `running` and
   * `activeRunId`.
   */
  private applyEnvelope(envelope: GraphRunEventEnvelope, replay: boolean): void {
    const lastFolded = this.foldedSequences.get(envelope.runId) ?? 0;
    if (envelope.sequence <= lastFolded) return;
    this.foldedSequences.set(envelope.runId, envelope.sequence);
    this.foldState = agentChatFoldEnvelope(this.foldState, envelope, { replay });
    this.publish();
    if (isGraphRunTerminalEventType(envelope.type)) {
      this.running.set(false);
      this.activeRunId.set(null);
    }
  }

  /** Records a stream-level error on the `error` signal; flags the backend unavailable for {@link GraphBackendUnavailableError}. */
  private surfaceStreamError(err: unknown): void {
    this.error.set(errorTextOf(err));
    if (err instanceof GraphBackendUnavailableError) this.backendAvailable.set(false);
  }

  /** Fails the active roundtrip: records the error, clears run state, and appends an `error` message entry. */
  private failActiveRoundtrip(err: unknown): void {
    this.error.set(errorTextOf(err));
    if (err instanceof GraphBackendUnavailableError) this.backendAvailable.set(false);
    this.running.set(false);
    this.activeRunId.set(null);
    this.pushMessage({
      id: `error:${++agentChatMessageSequence}`,
      role: "error",
      content: errorTextOf(err),
      attachments: [],
      knowledgeSourceIds: [],
      createdAt: new Date().toISOString(),
    });
  }

  /** Appends a message to the fold state and republishes the signals. */
  private pushMessage(message: AgentChatMessageView): void {
    this.foldState = { ...this.foldState, messages: [...this.foldState.messages, message] };
    this.publish();
  }

  /** Copies the current fold state into the `messages`/`roundtrips`/`structuredObject` signals. */
  private publish(): void {
    this.messages.set(this.foldState.messages);
    this.roundtrips.set(this.foldState.roundtrips);
    this.structuredObject.set(this.foldState.structuredObject);
  }

  /**
   * Resolves the user id sent with chat requests: the explicitly configured
   * `userId` wins (including `null` to force anonymous); otherwise the
   * `loggedUser` window value is used, falling back to `null`.
   */
  private userId(): string | null {
    const configured = this.configuration.userId;
    if (configured !== undefined) return configured;
    const logged = getOnWindow("loggedUser");
    return typeof logged === "string" && logged.length > 0 ? logged : null;
  }
}

/** Extracts a displayable message from an unknown thrown value. */
function errorTextOf(err: unknown): string {
  if (err instanceof GraphBackendUnavailableError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}
