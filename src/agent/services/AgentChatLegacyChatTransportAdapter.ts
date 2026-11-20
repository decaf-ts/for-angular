/**
 * @module for-angular/agent/services/AgentChatLegacyChatTransportAdapter
 * @summary Bridges a legacy {@link AgentChatTransport} (envelope callbacks) onto
 * the @ai-sdk `ChatTransport` seam so scripted/demo transports and older custom
 * implementations drive the SDK-owned chat state unchanged.
 * @description Wraps a legacy transport and produces `UIMessageChunk`s from its
 * envelope stream via {@link AgentChatEnvelopeChunkProducer}. This is what lets
 * `AgentChatFakeTransport` (the demo/storybook transport) and any
 * consumer-supplied legacy transport participate in the SDK message model
 * without reimplementing streaming.
 */
import type { ChatTransport, UIMessageChunk } from "ai";
import {
  AgentChatEnvelopeChunkProducer,
} from "./agentEnvelopeChunks";
import { requestFromMessages, type AgentChatTransportBody } from "./GraphRunAgentChatTransport";
import type {
  AgentChatRunDescriptor,
  AgentChatSdkTransport,
  AgentChatSideChannelHandlers,
  AgentChatTransport,
  AgentChatTransportHandlers,
  AgentChatUIMessage,
} from "../types";

/** Reads the per-request decaf side-channel handed over via request metadata. */
function sideChannelOf(metadata: unknown): AgentChatSideChannelHandlers | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const candidate = (metadata as { sideChannel?: unknown }).sideChannel;
  return candidate && typeof candidate === "object"
    ? (candidate as AgentChatSideChannelHandlers)
    : undefined;
}

/**
 * Adapts a legacy envelope-callback transport to the @ai-sdk `ChatTransport`
 * seam. One adapter wraps one legacy transport instance.
 */
export class AgentChatLegacyChatTransportAdapter implements AgentChatSdkTransport {
  /** Complete `reconnectToStream` replays reset the streaming message state. */
  readonly resumeStreamIsReplay = true;

  private sideChannel?: AgentChatSideChannelHandlers;

  /**
   * @param legacy - Envelope-callback transport to bridge.
   */
  constructor(private readonly legacy: AgentChatTransport) {}

  /** Installs the decaf side-channel handlers fed alongside the chunk stream. */
  setSideChannelHandlers(handlers: AgentChatSideChannelHandlers): void {
    this.sideChannel = handlers;
  }

  /**
   * Sends the last user message through the legacy transport as a chunk stream.
   *
   * @param {object} options - SDK send request (message list, decaf body, metadata, abort signal).
   * @returns {Promise<ReadableStream<UIMessageChunk>>} Chunk stream bridging the legacy envelope callbacks.
   */
  async sendMessages(
    options: Parameters<ChatTransport<AgentChatUIMessage>["sendMessages"]>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    const body = (options.body ?? {}) as AgentChatTransportBody;
    const request = requestFromMessages(options.messages, body);
    return this.openStream({
      replay: false,
      sessionId: request.sessionId,
      sideChannel: sideChannelOf(options.metadata) ?? this.sideChannel,
      abortSignal: options.abortSignal,
      run: (handlers) => this.legacy.send(request, handlers),
    });
  }

  /**
   * Replays a recorded run through the legacy transport as a chunk stream.
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
      sideChannel: sideChannelOf(options.metadata) ?? this.sideChannel,
      abortSignal: options.abortSignal,
      run: async (handlers) => {
        await this.legacy.replay(descriptor, handlers);
        return descriptor;
      },
    });
  }

  /**
   * Forwards to the legacy transport's cancellation.
   *
   * @param {string} runId - Backend run id to cancel.
   * @returns Resolves once the legacy transport accepts the cancellation.
   */
  async cancel(runId: string): Promise<void> {
    await this.legacy.cancel(runId);
  }

  /** Releases the legacy transport when it exposes a `close` hook. */
  close(): void {
    const closable = this.legacy as { close?: () => void };
    closable.close?.();
  }

  private openStream(options: {
    replay: boolean;
    sessionId?: string;
    sideChannel?: AgentChatSideChannelHandlers;
    abortSignal?: AbortSignal;
    run: (handlers: AgentChatTransportHandlers) => Promise<AgentChatRunDescriptor | void>;
  }): ReadableStream<UIMessageChunk> {
    const { replay, sessionId, abortSignal, run, sideChannel } = options;
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

    const closeStream = (reason: "stop" | "error" | "other" = "stop"): void => {
      enqueue(producer?.finish(reason) ?? []);
      if (controllerRef && !closed) {
        closed = true;
        try {
          controllerRef.close();
        } catch {
          /* already closed */
        }
      }
    };

    const onAbort = (): void => {
      if (runId) void this.legacy.cancel(runId).catch(() => undefined);
      closeStream("other");
      abortSignal?.removeEventListener("abort", onAbort);
    };

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        controllerRef = controller;
        abortSignal?.addEventListener("abort", onAbort);
        void (async () => {
          try {
            const handlers: AgentChatTransportHandlers = {
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
                closeStream("stop");
                abortSignal?.removeEventListener("abort", onAbort);
              },
              onError: (error) => sideChannel?.onError?.(error),
            };
            const descriptor = await run(handlers);
            if (descriptor && "runId" in descriptor) runId = descriptor.runId;
            sideChannel?.onBackendAvailable?.(true);
            if (abortSignal?.aborted) {
              onAbort();
              return;
            }
            producer = new AgentChatEnvelopeChunkProducer({
              runId: runId ?? `legacy:${Date.now()}`,
              sessionId,
              replay,
              handlers: sideChannel,
            });
            enqueue(producer.start());
          } catch (err) {
            sideChannel?.onError?.(err);
            producer = new AgentChatEnvelopeChunkProducer({
              runId: runId ?? `legacy-error:${Date.now()}`,
              sessionId,
              replay,
              handlers: sideChannel,
            });
            enqueue(producer.start());
            enqueue(
              producer.push({
                runId: producer.runId,
                workflowId: "",
                sequence: 1,
                type: "workflow.failed" as never,
                timestamp: new Date().toISOString(),
                error: {
                  name: err instanceof Error ? err.name : "Error",
                  message: err instanceof Error ? err.message : String(err),
                },
              }),
            );
            closeStream("error");
          }
        })();
      },
      cancel: () => {
        closed = true;
        if (runId) void this.legacy.cancel(runId).catch(() => undefined);
        abortSignal?.removeEventListener("abort", onAbort);
      },
    });
  }
}
