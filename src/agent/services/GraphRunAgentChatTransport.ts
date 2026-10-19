/**
 * @module for-angular/agent/services/GraphRunAgentChatTransport
 * @summary Default {@link AgentChatTransport} backed by the graph run HTTP +
 * SSE endpoints (slice U3 of SAA-836).
 * @description Bridges the agent chat surface to the canonical graph run
 * backend:
 *
 * - {@link send} creates a run via `POST /graph/runs` (chat inputs
 *   `{message, sessionId, userId, attachments?, knowledgeBaseIds?}`) and
 *   resolves to the {@link AgentChatRunDescriptor} as soon as the backend
 *   accepts the run (`202`), streaming envelopes in the background through
 *   {@link GraphRunEventClient}.
 * - {@link replay} re-streams a recorded run's events from sequence zero.
 * - {@link cancel} issues the idempotent `DELETE /graph/runs/{runId}`.
 *
 * The `onError` handler deliberately does **not** disconnect the event client:
 * its bounded SSE retry budget is followed by run-status polling, so a
 * transient failure keeps the stream alive instead of tearing it down. Only a
 * terminal envelope (or a synchronous connect failure) settles the stream and
 * disconnects.
 */
import { Injectable, inject } from "@angular/core";
import { GraphRunClient } from "diagrams/src/lib/graph/runs/GraphRunClient";
import {
  GraphRunEventClient,
  type GraphRunEventClientSubscriber,
} from "diagrams/src/lib/graph/runs/GraphRunEventClient";
import { GraphBackendUnavailableError } from "diagrams/src/lib/graph/execution/GraphExecutionService";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type {
  AgentChatRunDescriptor,
  AgentChatSendRequest,
  AgentChatTransport,
  AgentChatTransportHandlers,
} from "../types";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";

/**
 * Root-provided default transport implementing {@link AgentChatTransport} on
 * top of {@link GraphRunClient} and {@link GraphRunEventClient}. Override via
 * the `AGENT_CHAT_TRANSPORT` injection token for custom transports.
 */
@Injectable({ providedIn: "root" })
export class GraphRunAgentChatTransport implements AgentChatTransport {
  private readonly runClient = inject(GraphRunClient);
  private readonly eventClient = inject(GraphRunEventClient);

  /**
   * Creates a graph run for the chat request and streams its envelopes in the
   * background.
   *
   * The chat inputs are posted as run inputs
   * `{message, sessionId, userId, attachments?, knowledgeBaseIds?}` — optional
   * members are omitted when empty — alongside the inline `workflow` or
   * `workflowId`. The promise resolves with the run descriptor immediately
   * after `POST /graph/runs` accepts the run; envelopes (and terminal
   * callbacks) arrive later through `handlers`. Transport-level failures
 * (e.g. {@link GraphBackendUnavailableError}) reject the promise so the
 * caller can fail the roundtrip.
 *
 * @example
 * ```ts
 * const transport = inject(AGENT_CHAT_TRANSPORT); // GraphRunAgentChatTransport by default
 * const { runId } = await transport.send(
 *   { message: "Hello", attachments: [], knowledgeSourceIds: [], sessionId: "s1", userId: null },
 *   { onEvent, onTerminal, onError },
 * );
 * await transport.cancel(runId); // idempotent DELETE /graph/runs/{runId}
 * ```
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

  /** Re-streams the recorded run from sequence zero; resolves only when streaming was set up. */
  async replay(
    descriptor: { runId: string; eventsUrl: string },
    handlers: AgentChatTransportHandlers,
  ): Promise<void> {
    return this.stream(descriptor.runId, descriptor.eventsUrl, handlers);
  }

  /** Cancels the live run via the idempotent `DELETE /graph/runs/{runId}` endpoint. */
  async cancel(runId: string): Promise<void> {
    await this.runClient.cancelRun(runId);
  }

  /**
   * Connects the event client for `runId` and forwards envelopes to
   * `handlers`, disconnecting after the terminal envelope (or a synchronous
   * connect failure). `onError` does not settle the stream: the event
   * client's retry budget and status-polling fallback keep pursuing the run
   * after transient SSE errors.
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
