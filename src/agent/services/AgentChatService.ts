/**
 * @module for-angular/agent/services/AgentChatService
 * @summary Component-provided service driving the agent chat conversation on
 * the @ai-sdk Angular `Chat` state machine (slice U3 of SAA-836, SAA-1844).
 * @description The @ai-sdk `Chat` owns messages, streaming status, tool parts
 * and approvals from the transport seam onward; this service:
 *
 * - projects `Chat.messages` (`UIMessage` envelopes) into the
 *   {@link AgentChatMessageView} read model the existing `chat-*` components
 *   render, preserving the public signal surface;
 * - re-exposes `Chat.status` as `running`, `Chat.error` as `error`, and keeps
 *   the decaf-owned telemetry / structured-object / backend-availability state
 *   fed through the transport's side channel;
 * - derives host actions (`send`, `replay`, `cancel`, `editMessage`,
 *   `removeMessage`, `setVote`, `reset`) from the SDK API.
 *
 * The SDK state machine owns the placeholder / double-terminal bookkeeping the
 * old envelope fold used to do; decaf domain state (telemetry, structured
 * objects, artifacts, demo side-channels, availability tri-state) stays decaf.
 *
 * `userId` resolution: an explicitly configured `userId` wins; otherwise the
 * service falls back to `getOnWindow('loggedUser')` and sends `null` when no
 * user is logged in.
 */
import { Injectable, computed, effect, inject, signal } from "@angular/core";
import { Chat } from "@ai-sdk/angular";
import { getOnWindow } from "@decaf-ts/for-angular";
import { GraphBackendUnavailableError } from "@decaf-ts/for-angular/diagrams";
import {
  AGENT_CHAT_SESSION_PREFIX,
  AGENT_CHAT_TRANSPORT,
} from "../tokens/agent-chat.tokens";
import {
  AgentChatLegacyChatTransportAdapter,
} from "./AgentChatLegacyChatTransportAdapter";
import type { AgentChatTransportBody } from "./GraphRunAgentChatTransport";
import type {
  AgentChatAttachment,
  AgentChatConfiguration,
  AgentChatMessagePart,
  AgentChatMessageView,
  AgentChatRole,
  AgentChatRoundtripTelemetry,
  AgentChatRunDescriptor,
  AgentChatSdkTransport,
  AgentChatSideChannelHandlers,
  AgentChatStructuredObjectView,
  AgentChatTransport,
  AgentChatUIMessage,
  AgentChatUIMessageMetadata,
  AgentChatVote,
} from "../types";

/** Module-level counter backing generated session ids and fallbacks. */
let agentChatMessageSequence = 0;

/** Lifecycle statuses after which the run is no longer active. */
const TERMINAL_ROUNDTRIP_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

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
  /** Component-provided configuration merged over defaults on every {@link configure} call. */
  private configuration: {
    workflow?: unknown;
    workflowId?: string | null;
    sessionId?: string | null;
    userId?: string | null;
  } = {};

  /** Lazily generated session id when none is configured. */
  private generatedSessionId?: string;

  /** Injected transport (default {@link GraphRunAgentChatTransport}; override point for custom peers). */
  private readonly injectedTransport = inject<AgentChatTransport>(AGENT_CHAT_TRANSPORT);

  /** SDK transport seam: the injected transport when it is already a `ChatTransport`, otherwise a bridge. */
  private readonly transport: AgentChatSdkTransport = isSdkTransport(this.injectedTransport)
    ? this.injectedTransport
    : new AgentChatLegacyChatTransportAdapter(this.injectedTransport);

  /** @ai-sdk Angular chat state machine — the message/streaming/tool-approval owner. */
  private readonly chat = new Chat<AgentChatUIMessage>({
    id: this.sessionId,
    transport: this.transport,
    onError: (error) => {
      this.error.set(errorTextOf(error));
    },
  });

  /** Transcript messages projected from the SDK `UIMessage` list. */
  readonly messages = computed<AgentChatMessageView[]>(() =>
    agentChatMessagesFromUI(this.chat.messages),
  );
  /** Per-run telemetry rows rendered by the telemetry strip (decaf-owned). */
  readonly roundtrips = signal<AgentChatRoundtripTelemetry[]>([]);
  /** Latest structured object extracted from a run, or `null` (decaf-owned). */
  readonly structuredObject = signal<AgentChatStructuredObjectView | null>(null);
  /** `true` while a send/replay is in flight (SDK status submitted/streaming). */
  readonly running = computed(() => {
    const status = this.chat.status;
    return status === "submitted" || status === "streaming";
  });
  /** Run id of the in-flight roundtrip, or `null`. */
  readonly activeRunId = signal<string | null>(null);
  /** Last surfaced error text, or `null`. */
  readonly error = signal<string | null>(null);
  /** Tri-state backend availability: `null` unknown, `false` after a {@link GraphBackendUnavailableError}. */
  readonly backendAvailable = signal<boolean | null>(null);

  /** Decaf side-channel fed by the transport alongside the chunk stream. */
  private readonly sideChannel: AgentChatSideChannelHandlers = {
    onTelemetry: (telemetry) => this.mergeTelemetry(telemetry),
    onStructuredObject: (view) => this.structuredObject.set(view),
    onError: (error) => this.surfaceStreamError(error),
    onBackendAvailable: (available) => this.backendAvailable.set(available),
  };

  constructor() {
    effect(() => {
      const message = this.chat.error?.message;
      if (message) this.error.set(message);
    });
  }

  /**
   * Merges component-provided configuration (workflow document/id, session id,
   * user id override) over the current configuration; called on `ngOnInit`.
   *
   * @param {AgentChatConfiguration} configuration - Component configuration; an inline `workflow` document is also accepted.
   * @returns Nothing.
   */
  configure(configuration: AgentChatConfiguration & { workflow?: unknown }): void {
    this.configuration = { ...this.configuration, ...configuration };
  }

  /** Active session id: the configured one, or a generated `agent-chat-<epoch>-<seq>`. */
  get sessionId(): string {
    const configured = this.configuration.sessionId;
    if (configured && configured.length > 0) return configured;
    if (!this.generatedSessionId) {
      this.generatedSessionId = `${AGENT_CHAT_SESSION_PREFIX}-${Date.now()}-${++agentChatMessageSequence}`;
    }
    return this.generatedSessionId;
  }

  /**
   * Sends a user message through the SDK chat. No-op when the message is blank
   * or a roundtrip is already running. Transport-level failures surface on
   * `error` and flag backend unavailability; the SDK state machine handles the
   * streaming transcript.
   *
   * @param {string} message - Prompt text (trimmed before sending).
   * @param {AgentChatAttachment[]} [attachments] - Attachments staged for the message.
   * @param {string[]} [knowledgeSourceIds] - Knowledge-base ids selected for the message.
   * @returns Resolves when the send request has been handed to the SDK chat.
   */
  async send(
    message: string,
    attachments: AgentChatAttachment[] = [],
    knowledgeSourceIds: string[] = [],
  ): Promise<void> {
    const text = message.trim();
    if (!text || this.running()) return;
    this.error.set(null);
    this.chat.clearError();
    const metadata: AgentChatUIMessageMetadata = {
      attachments,
      knowledgeSourceIds,
      sessionId: this.sessionId,
      createdAt: new Date().toISOString(),
    };
    void this.chat
      .sendMessage(
        { text, metadata },
        {
          body: this.requestBody(attachments, knowledgeSourceIds),
          metadata: { sideChannel: this.sideChannel },
        },
      )
      .catch((err) => this.surfaceStreamError(err));
  }

  /**
   * Replays a previously created run through `Chat.resumeStream` (the
   * transport's `reconnectToStream` + `resumeStreamIsReplay` path). No-op while
   * another roundtrip is running.
   *
   * @param {AgentChatRunDescriptor} descriptor - Run id and event URL to replay.
   * @returns Resolves when the resume request has been handed to the SDK chat.
   */
  async replay(descriptor: AgentChatRunDescriptor): Promise<void> {
    if (this.running()) return;
    this.error.set(null);
    this.chat.clearError();
    void this.chat
      .resumeStream({
        body: this.requestBody([], [], descriptor),
        metadata: { sideChannel: this.sideChannel },
      })
      .catch((err) => this.surfaceStreamError(err));
  }

  /** Stops the active run; the transport aborts the stream and cancels the backend run.
   *
   * @returns Resolves once the SDK stop request settles.
   */
  async cancel(): Promise<void> {
    try {
      await this.chat.stop();
    } catch (err) {
      this.error.set(errorTextOf(err));
    }
  }

  /**
   * Replaces an already-sent user message: trailing messages after the edited
   * one (including the original entry) are dropped and the replacement text is
   * re-sent, preserving the original attachments and knowledge selections.
   * No-op for non-user or unknown messages, blank text, or while running.
   *
   * @param {string} messageId - Id of the user message being edited.
   * @param {string} newText - Replacement prompt text.
   * @returns Resolves when the replacement send request has been handed to the SDK chat.
   */
  async editMessage(messageId: string, newText: string): Promise<void> {
    if (this.running()) return;
    const messages = this.chat.messages;
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    const target = messages[index];
    if (target.role !== "user") return;
    const text = newText.trim();
    if (!text) return;
    const metadata = target.metadata ?? {};
    this.chat.messages = messages.slice(0, index);
    await this.send(
      text,
      metadata.attachments ?? [],
      metadata.knowledgeSourceIds ?? [],
    );
  }

  /** Removes one message from the local transcript (no backend call).
   *
   * @param {string} messageId - Id of the message to drop.
   * @returns Nothing.
   */
  removeMessage(messageId: string): void {
    const messages = this.chat.messages;
    if (!messages.some((message) => message.id === messageId)) return;
    this.chat.messages = messages.filter((message) => message.id !== messageId);
  }

  /** Records (or clears with `null`) the user's vote on a message.
   *
   * @param {string} messageId - Id of the message receiving the vote.
   * @param {AgentChatVote | null} vote - Vote to record, or `null` to clear it.
   * @returns Nothing.
   */
  setVote(messageId: string, vote: AgentChatVote | null): void {
    let changed = false;
    const messages = this.chat.messages.map((message) => {
      if (message.id !== messageId) return message;
      changed = true;
      return {
        ...message,
        metadata: {
          ...(message.metadata ?? {}),
          vote,
          editedAt: new Date().toISOString(),
        },
      };
    });
    if (!changed) return;
    this.chat.messages = messages;
  }

  /** Clears all conversation state and the decaf-owned signals.
   *
   * @returns Nothing.
   */
  reset(): void {
    this.chat.messages = [];
    this.chat.clearError();
    this.roundtrips.set([]);
    this.structuredObject.set(null);
    this.activeRunId.set(null);
    this.error.set(null);
  }

  /** Merges a telemetry snapshot into the roundtrips signal and tracks the active run. */
  private mergeTelemetry(telemetry: AgentChatRoundtripTelemetry): void {
    const rows = this.roundtrips();
    const index = rows.findIndex((row) => row.runId === telemetry.runId);
    this.roundtrips.set(
      index >= 0
        ? rows.map((row, position) => (position === index ? telemetry : row))
        : [...rows, telemetry],
    );
    this.activeRunId.set(
      TERMINAL_ROUNDTRIP_STATUSES.has(telemetry.status) ? null : telemetry.runId,
    );
  }

  /** Records a stream-level error on the `error` signal and availability tri-state. */
  private surfaceStreamError(err: unknown): void {
    this.error.set(errorTextOf(err));
    if (err instanceof GraphBackendUnavailableError) this.backendAvailable.set(false);
  }

  /** Decaf request body sent alongside the SDK chat request. */
  private requestBody(
    attachments: AgentChatAttachment[],
    knowledgeSourceIds: string[],
    descriptor?: AgentChatRunDescriptor,
  ): AgentChatTransportBody {
    return {
      workflow: this.configuration.workflow,
      workflowId: this.configuration.workflowId ?? undefined,
      sessionId: this.sessionId,
      userId: this.userId(),
      attachments,
      knowledgeSourceIds,
      ...(descriptor ? { descriptor } : {}),
    };
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

/** Detects a transport that already implements the @ai-sdk `ChatTransport` seam. */
function isSdkTransport(
  transport: AgentChatTransport | AgentChatSdkTransport,
): transport is AgentChatSdkTransport {
  return typeof (transport as AgentChatSdkTransport).sendMessages === "function";
}

/** Extracts a displayable message from an unknown thrown value. */
function errorTextOf(err: unknown): string {
  if (err instanceof GraphBackendUnavailableError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Projects SDK `UIMessage`s into the decaf read model the components render. */
function agentChatMessagesFromUI(messages: AgentChatUIMessage[]): AgentChatMessageView[] {
  return messages.map((message) => {
    const metadata = message.metadata ?? {};
    const errorPart = message.parts.find(
      (part): part is { type: "data-error"; data: { message: string; name?: string } } =>
        part.type === "data-error",
    );
    const role: AgentChatRole =
      message.role === "user"
        ? "user"
        : message.role === "system"
          ? "system"
          : errorPart
            ? "error"
            : "assistant";
    const text = message.parts
      .filter((part): part is { type: "text"; text: string; state?: "streaming" | "done" } =>
        part.type === "text",
      )
      .map((part) => part.text)
      .join("");
    const parts = role === "assistant" ? projectParts(message.parts) : undefined;
    const streaming = message.parts.some(
      (part) =>
        (part.type === "text" || part.type === "reasoning") &&
        "state" in part &&
        part.state === "streaming",
    );
    return {
      id: message.id,
      role,
      content: role === "error" ? (errorPart?.data.message ?? "") : text,
      attachments: metadata.attachments ?? [],
      knowledgeSourceIds: metadata.knowledgeSourceIds ?? [],
      createdAt: metadata.createdAt ?? "",
      ...(metadata.runId ? { runId: metadata.runId } : {}),
      ...(parts && parts.length ? { parts } : {}),
      ...(streaming ? { streaming } : {}),
      ...(metadata.actions?.length ? { actions: metadata.actions } : {}),
      ...(metadata.vote !== undefined ? { vote: metadata.vote } : {}),
      ...(metadata.editedAt ? { editedAt: metadata.editedAt } : {}),
    };
  });
}

/** Projects SDK message parts into decaf nested parts. */
function projectParts(parts: AgentChatUIMessage["parts"]): AgentChatMessagePart[] {
  const projected: AgentChatMessagePart[] = [];
  parts.forEach((part, index) => {
    const record = part as unknown as Record<string, unknown>;
    switch (record["type"]) {
      case "text":
        projected.push({
          id: `text:${index}`,
          kind: "text",
          text: typeof record["text"] === "string" ? (record["text"] as string) : "",
          ...(record["state"] === "streaming" ? { streaming: true } : {}),
        });
        break;
      case "reasoning":
        projected.push({
          id:
            typeof record["id"] === "string" && record["id"].length > 0
              ? (record["id"] as string)
              : `reasoning:${index}`,
          kind: "reasoning",
          content: typeof record["text"] === "string" ? (record["text"] as string) : "",
          ...(record["state"] === "streaming" ? { streaming: true } : {}),
        });
        break;
      case "custom":
        if (record["kind"] === "decaf.code") {
          const provider = record["providerMetadata"] as
            | { decaf?: Record<string, unknown> }
            | undefined;
          const decaf = provider?.decaf ?? {};
          projected.push({
            id: `code:${index}`,
            kind: "code",
            code: typeof decaf["code"] === "string" ? (decaf["code"] as string) : "",
            ...(typeof decaf["language"] === "string"
              ? { language: decaf["language"] as string }
              : {}),
            ...(typeof decaf["filename"] === "string"
              ? { filename: decaf["filename"] as string }
              : {}),
            ...(typeof decaf["title"] === "string" ? { title: decaf["title"] as string } : {}),
          });
        }
        break;
      case "file": {
        const url = typeof record["url"] === "string" ? (record["url"] as string) : "";
        if (!url) break;
        projected.push({
          id: `file:${index}`,
          kind: "attachment",
          attachment: {
            id: `file:${index}`,
            name: url.split("/").pop() ?? "attachment",
            mime:
              typeof record["mediaType"] === "string"
                ? (record["mediaType"] as string)
                : "application/octet-stream",
            size: 0,
            url,
          },
        });
        break;
      }
      default:
        if (typeof record["type"] === "string" && (record["type"] as string).startsWith("tool-")) {
          projected.push(projectToolPart(record, index));
        }
        break;
    }
  });
  return projected;
}

/** Projects an SDK tool part into a decaf tool part. */
function projectToolPart(
  record: Record<string, unknown>,
  index: number,
): AgentChatMessagePart {
  const state = typeof record["state"] === "string" ? (record["state"] as string) : "";
  const status =
    state === "output-available"
      ? "succeeded"
      : state === "output-error" || state === "output-denied"
        ? "failed"
        : state === "input-streaming" || state === "input-available"
          ? state === "input-available"
            ? "running"
            : "queued"
          : "running";
  const toolCallId =
    typeof record["toolCallId"] === "string" ? (record["toolCallId"] as string) : `tool:${index}`;
  const typeName = (record["type"] as string).slice("tool-".length);
  const toolName =
    typeof record["toolName"] === "string" && (record["toolName"] as string).length > 0
      ? (record["toolName"] as string)
      : typeName;
  return {
    id: toolCallId,
    kind: "tool",
    name: toolName,
    status,
    ...(record["input"] !== undefined ? { input: record["input"] } : {}),
    ...(record["output"] !== undefined ? { output: record["output"] } : {}),
    ...(typeof record["errorText"] === "string" ? { error: record["errorText"] as string } : {}),
  };
}
