/**
 * @module for-angular/graph/execution/GraphExecutionService
 * @summary Angular service that drives graph execution over the network.
 * @description Exposes the engine's execute operation as an injectable Angular
 * service by delegating to the NestJS `GraphExecutionController` over HTTP +
 * SSE. The service posts the workflow to `POST /graph/execute`, then opens a
 * `ServerEventConnector` on `GET /graph/events` to stream execution events as
 * an RxJS observable. No execution engine code runs in the browser.
 *
 * When the backend is unreachable, `execute()` rejects with a user-friendly
 * error message. Use `checkBackend()` to probe the backend availability
 * before showing the run button.
 */
import { InjectionToken, Injectable, inject, signal } from "@angular/core";
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
  { providedIn: "root", factory: () => "http://localhost:3000" },
);

/**
 * Error thrown when the graph execution backend is unreachable.
 */
export class GraphBackendUnavailableError extends Error {
  constructor(message = "Graph backend is not running. Start it with `npm run start:backend`.") {
    super(message);
    this.name = "GraphBackendUnavailableError";
  }
}

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
   * Signal reflecting whether the backend was reachable at the last probe.
   * `null` means the backend has not been probed yet.
   */
  readonly backendAvailable = signal<boolean | null>(null);

  /**
   * Probes the backend by sending a lightweight HEAD request. Updates the
   * `backendAvailable` signal. Returns `true` when the backend responds
   * (any HTTP status), `false` when the request fails to connect.
   */
  async checkBackend(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/graph/results/__health__`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      // Any response (even 404) means the server is up.
      this.backendAvailable.set(true);
      return true;
    } catch {
      this.backendAvailable.set(false);
      return false;
    }
  }

  /**
   * Executes a workflow by posting it to the backend and streaming events
   * over SSE. Resolves with the execution outputs when the workflow
   * completes (or rejects on failure).
   *
   * @throws {GraphBackendUnavailableError} when the backend is unreachable.
   * @throws {Error} when the backend returns a non-OK HTTP status.
   */
  async execute(
    workflow: GraphWorkflowDefinition,
    inputs: Record<string, unknown>,
  ): Promise<{ status: string; outputs: Record<string, unknown> }> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/graph/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, inputs }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      this.backendAvailable.set(false);
      throw new GraphBackendUnavailableError(
        err instanceof Error && err.name === "TimeoutError"
          ? "Graph backend did not respond within 10 seconds. Is it running?"
          : "Graph backend is not running. Start it with `npm run start:backend`.",
      );
    }

    this.backendAvailable.set(true);

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
    let connector: ServerEventConnector;
    try {
      connector = ServerEventConnector.open(sseUrl);
    } catch {
      // SSE connector failed to open — events won't stream, but the
      // execution already succeeded on the backend.
      return;
    }

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
