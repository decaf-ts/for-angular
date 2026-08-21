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
import type { GraphNodeInspectionPayload, GraphVisualState } from "@decaf-ts/integrations/graph/shared";

import { ServerEventConnector } from "@decaf-ts/for-http";
import type { GraphExecutionEvent } from "@decaf-ts/integrations/graph/shared";
import { graphDefinitionOf, type GraphWorkflowDefinition } from "@decaf-ts/ui-decorators/graph";

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
 * Serialised `GraphExecutionResultModel` returned by `GET /graph/results/:runId`.
 * `nodeResults` maps engine node ids to their per-node execution detail.
 */
export interface GraphRunResultModel {
  runId: string;
  workflowId: string;
  status: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  nodeResults: Record<string, GraphNodeResultEntry>;
  startedAt: string;
  finishedAt?: string;
}

/**
 * Per-node execution detail within a saved run result (DECAF-48 §4.6).
 */
export interface GraphNodeResultEntry {
  nodeId: string;
  status: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string; code?: string };
  startedAt?: string;
  finishedAt?: string;
  fromCache?: boolean;
  pinned?: boolean;
  events?: unknown[];
  iteration?: number;
}

/**
 * Recursively serializes a {@link GraphWorkflowDefinition} so it survives
 * `JSON.stringify`. Class constructors in `nodes[].node` are resolved to
 * plain `GraphNodeDefinition` objects via {@link graphDefinitionOf}. Nested
 * body workflows (found in node metadata `loop.body`) are serialized too.
 */
function serializeWorkflow(workflow: GraphWorkflowDefinition): GraphWorkflowDefinition {
  const nodes = (workflow.nodes ?? []).map((entry) => {
    if (!entry.node || typeof entry.node === "function") {
      try {
        const def = graphDefinitionOf(entry.node as never) as Record<string, unknown>;
        const graphMeta = def["graph"] as Record<string, unknown> | undefined;
        if (graphMeta && graphMeta["metadata"]) {
          graphMeta["metadata"] = serializeLoopMetadata(graphMeta["metadata"]);
        }
        return { ...entry, node: def, metadata: serializeLoopMetadata(entry.metadata) };
      } catch {
        return { ...entry, metadata: serializeLoopMetadata(entry.metadata) };
      }
    }
    return { ...entry, metadata: serializeLoopMetadata(entry.metadata) };
  });
  return { ...workflow, nodes: nodes as GraphWorkflowDefinition["nodes"] };
}

function serializeLoopMetadata(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object") return metadata;
  const obj = metadata as Record<string, unknown>;
  const loop = obj["loop"];
  if (!loop || typeof loop !== "object") return metadata;
  const loopObj = loop as Record<string, unknown>;
  const body = loopObj["body"];
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return { ...obj, loop: { ...loopObj, body: serializeWorkflow(body as GraphWorkflowDefinition) } };
  }
  return metadata;
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
   * Run id of the most recent `execute()` invocation. Inspections for a run
   * are fetched from `GET /graph/results/:runId` via `getRunResult`.
   */
  readonly lastRunId = signal<string | null>(null);

  /**
   * Probes the backend by sending a lightweight HEAD request. Updates the
   * `backendAvailable` signal. Returns `true` when the backend responds
   * (any HTTP status), `false` when the request fails to connect.
   */
  async checkBackend(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/graph/results/__health__`, {
        method: "GET",
        // Match the SSE path (`credentials: "include"`) so session-cookie auth
        // is transmitted consistently on every backend call (SAA-116 F1).
        credentials: "include",
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
    const serializableWorkflow = serializeWorkflow(workflow);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/graph/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: serializableWorkflow, inputs }),
        credentials: "include",
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
    this.lastRunId.set(result.runId);

    // Stream events for this run over SSE.
    this.streamEvents(result.runId);

    return { status: result.status, outputs: result.outputs };
  }

  /**
   * Fetches the full run result (per-node inputs/outputs/state) for the given
   * run id from the backend `GET /graph/results/:runId` endpoint. Resolves
   * with `null` when the run result is not (yet) available.
   */
  async getRunResult(runId: string): Promise<GraphRunResultModel | null> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/results/${encodeURIComponent(runId)}`, {
        method: "GET",
        credentials: "include",
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        return null;
      }
      return (await response.json()) as GraphRunResultModel;
    } catch {
      return null;
    }
  }

  /**
   * Convenience for inspection: resolves the run result for
   * {@link lastRunId} and folds every `nodeResults` entry into
   * {@link GraphNodeInspectionPayload} values (DECAF-48 §4.6).
   */
  async fetchInspections(runId: string): Promise<GraphNodeInspectionPayload[]> {
    const result = await this.getRunResult(runId);
    if (!result) return [];
    return Object.entries(result.nodeResults ?? {}).map(([nodeId, entry]) => {
      const detail = (entry ?? {}) as GraphNodeResultEntry;
      return {
        runId: result.runId,
        workflowId: result.workflowId,
        nodeId,
        state: this.visualStateOf(detail.status),
        inputs: detail.inputs ?? {},
        outputs: detail.outputs,
        error: detail.error,
      };
    });
  }

  /**
   * Maps a stored per-node result status onto the frontend-safe visual state
   * used by inspection payloads. `cached` renders as `succeeded`; unknown or
   * absent statuses map to `idle`.
   * @param status Engine-stored node status from `GET /graph/results/:runId`.
   * @returns The corresponding {@link GraphVisualState}.
   */
  private visualStateOf(status?: string): GraphVisualState {
    switch (status) {
      case "running":
        return "running" as GraphVisualState;
      case "failed":
        return "failed" as GraphVisualState;
      case "cached":
      case "succeeded":
        return "succeeded" as GraphVisualState;
      case "skipped":
        return "skipped" as GraphVisualState;
      default:
        return "idle" as GraphVisualState;
    }
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
