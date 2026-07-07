/**
 * @module for-angular/graph/execution/GraphExecutionService
 * @summary Angular service that drives graph execution over the network.
 * @description Exposes the engine's execute operation as an injectable Angular
 * service by delegating to the NestJS `GraphExecutionController` over HTTP +
 * SSE. The service posts the workflow to `POST /graph/execute`, then opens a
 * `ServerEventConnector` on `GET /graph/events` to stream execution events as
 * an RxJS observable. No execution engine code runs in the browser.
 */
import { InjectionToken, Injectable, inject } from "@angular/core";
import { Subject, Observable } from "rxjs";

import { ServerEventConnector } from "@decaf-ts/for-http";
import type { GraphExecutionEvent } from "@decaf-ts/integrations/graph/shared";
import type { GraphWorkflowDefinition } from "@decaf-ts/ui-decorators/graph";

/**
 * Injection token for the base URL of the NestJS backend that hosts the graph
 * execution engine. Defaults to `http://localhost:3000`.
 */
export const GRAPH_BACKEND_URL = new InjectionToken<string>(
  "GRAPH_BACKEND_URL",
  { providedIn: "root", factory: () => "http://localhost:3000" }
);

/**
 * Response shape from `POST /graph/execute`.
 */
interface GraphExecuteResponse {
  runId: string;
  status: string;
  outputs: Record<string, unknown>;
}

/**
 * Injectable Angular service that delegates graph execution to a remote
 * NestJS backend and surfaces execution events as an RxJS observable.
 */
@Injectable()
export class GraphExecutionService {
  private readonly baseUrl = inject(GRAPH_BACKEND_URL);
  private readonly eventsSubject = new Subject<GraphExecutionEvent>();
  readonly events$: Observable<GraphExecutionEvent> =
    this.eventsSubject.asObservable();

  /**
   * Executes a workflow by posting it to the backend and streaming events
   * over SSE. Resolves with the execution outputs when the workflow
   * completes (or rejects on failure).
   */
  async execute(
    workflow: GraphWorkflowDefinition,
    inputs: Record<string, unknown>,
  ): Promise<{ status: string; outputs: Record<string, unknown> }> {
    const response = await fetch(`${this.baseUrl}/graph/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow, inputs }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(
        `Graph execution request failed: ${response.status} ${text}`,
      );
    }

    const result = (await response.json()) as GraphExecuteResponse;

    // Stream events for this run over SSE.
    this.streamEvents(result.runId);

    return { status: result.status, outputs: result.outputs };
  }

  /**
   * Opens a `ServerEventConnector` on the backend SSE endpoint and forwards
   * parsed `GraphExecutionEvent` objects to the RxJS subject. The connection
   * is automatically torn down when the workflow reaches a terminal status.
   */
  private streamEvents(runId: string): void {
    const sseUrl = `${this.baseUrl}/graph/events`;
    const connector = ServerEventConnector.open(sseUrl);

    const removeListener = connector.addListener({
      onEvent: ([, , id, payload]) => {
        // Only forward events belonging to this run.
        if (id !== runId) return;

        const event = this.parseEvent(payload);
        if (!event) return;

        this.eventsSubject.next(event);

        // Tear down on terminal workflow events.
        if (
          event.type === "workflow.completed" ||
          event.type === "workflow.failed" ||
          event.type === "workflow.cancelled"
        ) {
          removeListener();
        }
      },
      onError: (err) => {
        this.eventsSubject.error(
          err instanceof Error ? err : new Error(String(err)),
        );
      },
    });
  }

  /**
   * Deserialises the SSE payload back into a `GraphExecutionEvent`. The
   * backend serialises `timestamp` as an ISO string; we convert it back to a
   * `Date` so `GraphExecutionStateMapper` can call `.toISOString()` on it.
   */
  private parseEvent(payload: unknown): GraphExecutionEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const raw = payload as Record<string, unknown>;

    const ts = raw["timestamp"];
    const timestamp =
      ts instanceof Date ? ts : ts ? new Date(ts as string) : new Date();

    return {
      id: String(raw["id"] ?? ""),
      sequence: Number(raw["sequence"] ?? 0),
      runId: String(raw["runId"] ?? ""),
      parentRunId:
        raw["parentRunId"] != null ? String(raw["parentRunId"]) : undefined,
      workflowId: String(raw["workflowId"] ?? ""),
      type: raw["type"] as GraphExecutionEvent["type"],
      timestamp,
      nodeId: raw["nodeId"] != null ? String(raw["nodeId"]) : undefined,
      edgeId: raw["edgeId"] != null ? String(raw["edgeId"]) : undefined,
      port: raw["port"] != null ? String(raw["port"]) : undefined,
      iteration:
        raw["iteration"] != null ? Number(raw["iteration"]) : undefined,
      path: Array.isArray(raw["path"]) ? (raw["path"] as string[]) : [],
      status: raw["status"] as GraphExecutionEvent["status"],
      payload: raw["payload"],
      error: raw["error"] as GraphExecutionEvent["error"],
      metadata: raw["metadata"] as Record<string, unknown> | undefined,
    };
  }
}
