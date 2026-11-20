/**
 * @module for-angular/agent/services/GraphRunAgentChatTransport
 * @summary Default agent chat transport backed by the graph run HTTP + SSE
 * endpoints. Implements both the @ai-sdk `ChatTransport` seam (the primary,
 * SDK-owned path) and the legacy {@link AgentChatTransport} contract.
 * @description Bridges the agent chat surface to the canonical graph run
 * backend:
 *
 * - `sendMessages` creates a run via `POST /graph/runs` (chat inputs
 *   `{message, sessionId, userId, attachments?, knowledgeBaseIds?}`) and
 *   returns a `ReadableStream` of `UIMessageChunk`s produced from the run's
 *   envelopes by {@link AgentChatEnvelopeChunkProducer}. The `@ai-sdk` `Chat`
 *   state machine owns messages, streaming status, tool parts and approvals
 *   from there on.
 * - `reconnectToStream` replays a recorded run from sequence zero and flags
 *   `resumeStreamIsReplay` so the SDK resets streaming message state; the
 *   recorded-run status-poll fallback stays transport-internal.
 * - `cancel`/`close` issue the idempotent `DELETE /graph/runs/{runId}`.
 * - `send`/`replay` remain for legacy consumers (scripted/demo transports and
 *   older call sites).
 *
 * Decaf domain state (telemetry, structured-object history, demo
 * side-channels, backend-available tri-state) is pushed through
 * {@link AgentChatSideChannelHandlers}, never duplicated into the SDK model.
 *
 * The `onError` handler deliberately does **not** disconnect the event client:
 * its bounded SSE retry budget is followed by run-status polling, so a
 * transient failure keeps the stream alive instead of tearing it down. Only a
 * terminal envelope (or a synchronous connect failure) settles the stream and
 * disconnects.
 */
import { Injectable, inject } from "@angular/core";
import { GraphRunClient } from "@decaf-ts/for-angular/diagrams";
import {
  GraphRunEventClient,
  type GraphRunEventClientSubscriber,
} from "@decaf-ts/for-angular/diagrams";
import { GraphBackendUnavailableError } from "@decaf-ts/for-angular/diagrams";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type { ChatTransport, UIMessageChunk } from "ai";
import type {
  AgentChatAttachment,
  AgentChatRunDescriptor,
  AgentChatSdkTransport,
  AgentChatSendRequest,
  AgentChatSideChannelHandlers,
  AgentChatTransport,
  AgentChatTransportHandlers,
  AgentChatUIMessage,
} from "../types";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import {
  AgentChatEnvelopeChunkProducer,
  type AgentChatChunkProducerOptions,
} from "./agentEnvelopeChunks";

/** Decaf request body the agent service attaches to SDK chat requests. */
export interface AgentChatTransportBody {
  /** Inline workflow document (takes precedence over `workflowId`). */
  workflow?: unknown;
  /** Backend workflow id. */
  workflowId?: string;
  /** Conversation session id. */
  sessionId?: string;
  /** Resolved logged-user id, or `null` when anonymous. */
  userId?: string | null;
  /** UI-only attachment metadata forwarded as run inputs. */
  attachments?: AgentChatAttachment[];
  /** Selected knowledge-base ids forwarded as run inputs. */
  knowledgeSourceIds?: string[];
  /** Replay target used by `reconnectToStream`. */
  descriptor?: AgentChatRunDescriptor;
}

type MessagesOptions = Parameters<ChatTransport<AgentChatUIMessage>["sendMessages"]>[0];

/**
 * Root-provided default transport implementing {@link AgentChatSdkTransport}
 * (and the legacy {@link AgentChatTransport} contract) on top of
 * {@link GraphRunClient} and {@link GraphRunEventClient}. Override via the
 * `AGENT_CHAT_TRANSPORT` injection token for custom transports.
 */
@Injectable({ providedIn: "root" })
export class GraphRunAgentChatTransport
  implements AgentChatSdkTransport, AgentChatTransport
{
  /** Complete `reconnectToStream` replays reset the streaming message state. */
  readonly resumeStreamIsReplay = true;

  private readonly runClient = inject(GraphRunClient);
  private readonly eventClient = inject(GraphRunEventClient);
  private readonly activeRuns = new Set<string>();
  private sideChannel?: AgentChatSideChannelHandlers;

  /** Installs the decaf side-channel handlers fed alongside the chunk stream. */
  setSideChannelHandlers(handlers: AgentChatSideChannelHandlers): void {
    this.sideChannel = handlers;
  }

  /**
   * Creates a graph run for the SDK chat request and returns the chunk stream
   * produced from its envelopes.
   *
   * @param {MessagesOptions} options - SDK send request (message list, decaf body, metadata, abort signal).
   * @returns {Promise<ReadableStream<UIMessageChunk>>} Chunk stream for the SDK `Chat` state machine.
   */
  async sendMessages(
    options: MessagesOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const body = (options.body ?? {}) as AgentChatTransportBody;
    const request = requestFromMessages(options.messages, body);
    return this.openStream({
      replay: false,
      sessionId: request.sessionId,
      handlers: sideChannelOf(options.metadata) ?? this.sideChannel,
      create: async () => {
        const created = await this.runClient.createRun({
          ...(isWorkflowDocument(request.workflow)
            ? { workflow: request.workflow }
            : {}),
          ...(request.workflowId ? { workflowId: request.workflowId } : {}),
          inputs: {
            message: request.message,
            sessionId: request.sessionId,
            userId: request.userId,
            ...(request.attachments.length ? { attachments: request.attachments } : {}),
            ...(request.knowledgeSourceIds.length
              ? { knowledgeBaseIds: request.knowledgeSourceIds }
              : {}),
          },
        });
        return { runId: created.runId, eventsUrl: created.eventsUrl };
      },
      abortSignal: options.abortSignal,
    });
  }

  /**
   * Replays a recorded run from sequence zero. The descriptor travels on the
   * request body (`body.descriptor`); without one there is nothing to resume.
   *
   * @param {object} options - SDK resume request; `body` carries the {@link AgentChatRunDescriptor}.
   * @returns {Promise<ReadableStream<UIMessageChunk> | null>} Replay chunk stream, or `null` with no descriptor.
   */
  async reconnectToStream(
    options: Parameters<ChatTransport<AgentChatUIMessage>["reconnectToStream"]>[0],
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    const body = (options.body ?? {}) as AgentChatTransportBody;
    const descriptor = body.descriptor;
    if (!descriptor) return null;
    return this.openStream({
      replay: true,
      sessionId: body.sessionId,
      handlers: sideChannelOf(options.metadata) ?? this.sideChannel,
      create: async () => descriptor,
      abortSignal: options.abortSignal,
    });
  }

  /**
   * Creates a run for the request and streams its envelopes in the background
   * (legacy contract).
   *
   * @param {AgentChatSendRequest} request - Legacy send request.
   * @param {AgentChatTransportHandlers} handlers - Envelope callbacks for the streamed run.
   * @returns {Promise<AgentChatRunDescriptor>} Descriptor of the created run.
   */
  async send(
    request: AgentChatSendRequest,
    handlers: AgentChatTransportHandlers,
  ): Promise<AgentChatRunDescriptor> {
    const workflow = request.workflow as GraphWorkflowDocument | undefined;
    const created = await this.runClient.createRun({
      ...(workflow ? { workflow } : {}),
      ...(request.workflowId ? { workflowId: request.workflowId } : {}),
      inputs: {
        message: request.message,
        sessionId: request.sessionId,
        userId: request.userId,
        ...(request.attachments.length ? { attachments: request.attachments } : {}),
        ...(request.knowledgeSourceIds.length
          ? { knowledgeBaseIds: request.knowledgeSourceIds }
          : {}),
      },
    });
    void this.stream(created.runId, created.eventsUrl, handlers);
    return { runId: created.runId, eventsUrl: created.eventsUrl };
  }

  /**
   * Re-streams the recorded run from sequence zero (legacy contract).
   *
   * @param {AgentChatRunDescriptor} descriptor - Run id and event URL to replay.
   * @param {AgentChatTransportHandlers} handlers - Envelope callbacks for the replayed run.
   * @returns Resolves once the event client is connected.
   */
  async replay(
    descriptor: { runId: string; eventsUrl: string },
    handlers: AgentChatTransportHandlers,
  ): Promise<void> {
    return this.stream(descriptor.runId, descriptor.eventsUrl, handlers);
  }

  /**
   * Cancels the live run via the idempotent `DELETE /graph/runs/{runId}` endpoint.
   *
   * @param {string} runId - Backend run id to cancel.
   * @returns Resolves once the backend accepts the cancellation.
   */
  async cancel(runId: string): Promise<void> {
    await this.runClient.cancelRun(runId);
  }

  /** Releases every stream the transport still owns (SDK-owned lifecycle). */
  close(): void {
    for (const runId of this.activeRuns) {
      this.eventClient.disconnect(runId);
    }
    this.activeRuns.clear();
  }

  /**
   * Builds the `ReadableStream` around a run: create/resolve the descriptor,
   * open the event client, and translate envelopes into `UIMessageChunk`s.
   */
  private openStream(options: {
    replay: boolean;
    sessionId?: string;
    handlers?: AgentChatSideChannelHandlers;
    create: () => Promise<AgentChatRunDescriptor>;
    abortSignal?: AbortSignal;
  }): ReadableStream<UIMessageChunk> {
    const { replay, sessionId, create, abortSignal, handlers } = options;
    let producer: AgentChatEnvelopeChunkProducer | undefined;
    let runId: string | undefined;
    let lastSequence = 0;
    let closed = false;
    let controllerRef: ReadableStreamDefaultController<UIMessageChunk> | undefined;

    const enqueue = (chunks: UIMessageChunk[]): void => {
      if (!controllerRef || closed) return;
      for (const chunk of chunks) {
        try {
          controllerRef.enqueue(chunk);
        } catch {
          closed = true;
          return;
        }
      }
    };

    const finish = (reason: "stop" | "error" | "other" = "stop"): void => {
      if (!producer) return;
      enqueue(producer.finish(reason));
      if (controllerRef && !closed) {
        closed = true;
        try {
          controllerRef.close();
        } catch {
          /* already closed */
        }
      }
    };

    const unsubscribeAbort = (): void => {
      abortSignal?.removeEventListener("abort", onAbort);
    };
    const onAbort = (): void => {
      if (runId) {
        this.activeRuns.delete(runId);
        void this.cancel(runId).catch(() => undefined);
        this.eventClient.disconnect(runId);
      }
      finish("other");
      unsubscribeAbort();
    };

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        controllerRef = controller;
        abortSignal?.addEventListener("abort", onAbort);
        void (async () => {
          try {
            const descriptor = await create();
            runId = descriptor.runId;
            this.activeRuns.add(descriptor.runId);
            handlers?.onBackendAvailable?.(true);
            if (abortSignal?.aborted) {
              onAbort();
              return;
            }
            producer = new AgentChatEnvelopeChunkProducer({
              runId: descriptor.runId,
              sessionId,
              replay,
              handlers,
            } satisfies AgentChatChunkProducerOptions);
            enqueue(producer.start());
            const subscriber: GraphRunEventClientSubscriber = {
              onEvent: (envelope) => {
                if (envelope.sequence <= lastSequence) return;
                lastSequence = envelope.sequence;
                enqueue(producer?.push(envelope) ?? []);
              },
              onTerminal: (envelope) => {
                if (envelope.sequence > lastSequence) {
                  lastSequence = envelope.sequence;
                  enqueue(producer?.push(envelope) ?? []);
                }
                finish("stop");
                unsubscribeAbort();
                this.activeRuns.delete(descriptor.runId);
                this.eventClient.disconnect(descriptor.runId);
              },
              onError: (error) => {
                handlers?.onError?.(error);
              },
            };
            this.eventClient.connect(
              { runId: descriptor.runId, eventsUrl: descriptor.eventsUrl, afterSequence: 0 },
              subscriber,
            );
          } catch (err) {
            const error =
              err instanceof GraphBackendUnavailableError
                ? err
                : err instanceof Error
                  ? err
                  : new GraphBackendUnavailableError();
            handlers?.onError?.(error);
            if (err instanceof GraphBackendUnavailableError) {
              handlers?.onBackendAvailable?.(false);
            } else {
              handlers?.onBackendAvailable?.(true);
            }
            const errorRunId = runId ?? `send-error:${Date.now()}`;
            producer = new AgentChatEnvelopeChunkProducer({
              runId: errorRunId,
              sessionId,
              replay,
              handlers,
            });
            enqueue(producer.start());
            enqueue(producer.push(syntheticFailure(errorRunId, error.message)));
            finish("error");
            unsubscribeAbort();
          }
        })();
      },
      cancel: () => {
        closed = true;
        unsubscribeAbort();
        if (runId) {
          this.activeRuns.delete(runId);
          void this.cancel(runId).catch(() => undefined);
          this.eventClient.disconnect(runId);
        }
      },
    });
  }

  /**
   * Connects the event client for `runId` and forwards envelopes to
   * `handlers` (legacy contract), disconnecting after the terminal envelope.
   */
  private async stream(
    runId: string,
    eventsUrl: string,
    handlers: AgentChatTransportHandlers,
  ): Promise<void> {
    let settled = false;
    const settle = (): void => {
      if (settled) return;
      settled = true;
      this.eventClient.disconnect(runId);
    };
    const subscriber: GraphRunEventClientSubscriber = {
      onEvent: (envelope: GraphRunEventEnvelope) => handlers.onEvent(envelope),
      onTerminal: (envelope: GraphRunEventEnvelope) => {
        handlers.onTerminal(envelope);
        settle();
      },
      onError: (error: unknown) => {
        handlers.onError(error);
      },
    };
    try {
      this.eventClient.connect({ runId, eventsUrl, afterSequence: 0 }, subscriber);
    } catch (err) {
      handlers.onError(
        err instanceof GraphBackendUnavailableError ? err : new GraphBackendUnavailableError(),
      );
      settle();
    }
  }
}

/**
 * Reconstructs the legacy send request from the SDK message list + body.
 *
 * The last user message supplies the prompt text, while attachments,
 * knowledge selections and the session id fall back to its metadata when the
 * request body does not override them.
 *
 * @param {AgentChatUIMessage[]} messages - SDK message list from the chat request.
 * @param {AgentChatTransportBody} body - Decaf request body attached to the request.
 * @returns {AgentChatSendRequest} Legacy send request ready for a transport.
 */
export function requestFromMessages(
  messages: AgentChatUIMessage[],
  body: AgentChatTransportBody,
): AgentChatSendRequest {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUser
    ? lastUser.parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("")
    : "";
  const metadata = lastUser?.metadata ?? {};
  return {
    workflow: body.workflow,
    workflowId: body.workflowId,
    message: text,
    attachments: body.attachments ?? metadata.attachments ?? [],
    knowledgeSourceIds:
      body.knowledgeSourceIds ?? metadata.knowledgeSourceIds ?? [],
    sessionId: body.sessionId ?? metadata.sessionId ?? lastUser?.id ?? "",
    userId: body.userId ?? null,
  };
}

/** Reads the per-request decaf side-channel handed over via request metadata. */
function sideChannelOf(metadata: unknown): AgentChatSideChannelHandlers | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const candidate = (metadata as { sideChannel?: unknown }).sideChannel;
  return candidate && typeof candidate === "object"
    ? (candidate as AgentChatSideChannelHandlers)
    : undefined;
}

/** Builds a terminal failure envelope used when a run cannot be created. */
function syntheticFailure(runId: string, message: string): GraphRunEventEnvelope {
  return {
    runId,
    workflowId: "",
    sequence: 1,
    type: GraphExecutionEventType.WORKFLOW_FAILED,
    timestamp: new Date().toISOString(),
    error: { name: "Error", message },
  };
}

/** Narrows an unknown workflow value to a graph workflow document. */
function isWorkflowDocument(value: unknown): value is GraphWorkflowDocument {
  return !!value && typeof value === "object";
}
