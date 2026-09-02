/**
 * @module for-angular/graph/runs/GraphRunClient
 * @summary Angular client for the graph run lifecycle HTTP endpoints (DECAF-50 §4.14).
 * @description Delegates the canonical run cutover path (the legacy
 * `/graph/execute` path stays untouched) to the NestJS graph backend:
 *
 * - `POST /graph/runs` creates a run and resolves to `202` with
 *   `eventsUrl`/`resultUrl` **before** the engine finishes (spec §4.14).
 * - `GET /graph/runs/{runId}` reads the run's lifecycle state, including the
 *   run's stored `result` payload after a terminal event.
 * - `DELETE /graph/runs/{runId}` cancels a live run (idempotent for terminal
 *   runs) and returns the terminal run.
 *
 * The client never imports the execution engine; it talks JSON over HTTP using
 * the frontend-safe wire shapes re-exported from
 * `@decaf-ts/integrations/graph/shared` (DECAF-50 §4.1/§4.2) and mirrors the
 * legacy `GraphExecutionService`'s error surface
 * ({@link GraphBackendUnavailableError} for network-level failures).
 */
import { Injectable, inject } from "@angular/core";
import type { GraphWorkflowDocument } from "@decaf-ts/ui-decorators/graph";
import type { GraphRunEventEnvelope } from "@decaf-ts/integrations/graph/shared";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  SerializationError,
} from "@decaf-ts/db-decorators";
import { AuthorizationError, ForbiddenError } from "@decaf-ts/core";
import {
  GRAPH_BACKEND_URL,
  GraphBackendUnavailableError,
} from "../execution/GraphExecutionService";

/** Created-run response returned by `POST /graph/runs` (DECAF-50 §4.14). */
export interface GraphRunCreatedResponse {
  runId: string;
  workflowId: string;
  /** Lifecycle status handed back by `POST /graph/runs` (always `queued`). */
  status: string;
  eventsUrl: string;
  resultUrl: string;
}

/** Run create request body. Either workflow or workflowId, never both. */
export interface GraphRunRequestBody {
  workflow?: GraphWorkflowDocument;
  workflowId?: string;
  inputs?: Record<string, unknown>;
}

/** Per-node execution result carried by a run's stored result. */
export interface GraphRunNodeResult {
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
}

/** Stored execution result surfaced by a terminal run's `result` field. */
export interface GraphRunExecutionResult {
  runId: string;
  workflowId: string;
  status: string;
  document: GraphWorkflowDocument;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  nodeResults: Record<string, GraphRunNodeResult>;
  events: unknown[];
  startedAt?: string;
  finishedAt?: string;
  metadata?: Record<string, unknown>;
}

/** Canonical run state surfaced by `GET /graph/runs/{runId}`. */
export interface GraphRunStatusResult {
  runId: string;
  workflowId: string;
  ownerUser?: string | null;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  documentFingerprint?: string;
  result?: GraphRunExecutionResult;
  error?: { name: string; message: string; stack?: string; code?: string };
}

/**
 * Validates an SSE message payload as a {@link GraphRunEventEnvelope}:
 * returns the envelope when it carries the required `runId`/`sequence`/
 * `type`/`timestamp` fields, otherwise `null` (so malformed frames are
 * skipped instead of corrupting the stream).
 */
export function graphRunEventEnvelopeOf(
  payload: unknown
): GraphRunEventEnvelope | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const runId = record["runId"];
  const sequence = record["sequence"];
  const type = record["type"];
  const timestamp = record["timestamp"];
  if (
    typeof runId !== "string" ||
    typeof sequence !== "number" ||
    typeof type !== "string" ||
    typeof timestamp !== "string"
  ) {
    return null;
  }
  return payload as unknown as GraphRunEventEnvelope;
}

/**
 * Angular client for the run lifecycle HTTP endpoints (DECAF-50 §4.14):
 * creates runs (`POST /graph/runs`), reads and cancels them, and surfaces
 * backend unavailability as {@link GraphBackendUnavailableError}.
 */
@Injectable({ providedIn: "root" })
export class GraphRunClient {
  private readonly baseUrl = inject(GRAPH_BACKEND_URL);

  /**
   * Creates a run for a canonical {@link GraphWorkflowDocument} (plus inputs)
   * or a saved workflowId (plus inputs). Resolves with the run's
   * start payload — `202` with `eventsUrl`/`resultUrl` — before the backend's
   * asynchronous engine finishes.
   * @param request Run create request; `workflow` and `workflowId` are
   *                rejected as ambiguous by the backend when both are set.
   * @throws {@link GraphBackendUnavailableError} when the backend is unreachable.
   * @throws {Error} for backend rejections (the run's own error surface).
   */
  async createRun(request: GraphRunRequestBody): Promise<GraphRunCreatedResponse> {
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/graph/runs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(request.workflow !== undefined ? { workflow: request.workflow } : {}),
            ...(request.workflowId !== undefined ? { workflowId: request.workflowId } : {}),
            ...(request.inputs !== undefined ? { inputs: request.inputs } : {}),
          }),
          credentials: "include",
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (err) {
      throw new GraphBackendUnavailableError(
        err instanceof Error && err.name === "TimeoutError"
          ? "Graph backend did not respond within 10 seconds. Is it running?"
          : "Graph backend is not running. Start it with `npm run start:backend`.",
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw graphRunHttpErrorOf("run create request", response.status, text);
    }

    const created = (await response.json()) as GraphRunCreatedResponse;
    if (
      typeof created.runId !== "string" ||
      !created.runId ||
      typeof created.eventsUrl !== "string" ||
      !created.eventsUrl ||
      typeof created.resultUrl !== "string" ||
      !created.resultUrl
    ) {
      throw new SerializationError(
        "Graph run create response is out of contract (runId/eventsUrl/resultUrl)",
      );
    }
    return created;
  }

  /**
   * Reads a run's state (status, result, error). Resolves `null` when the run
   * is not available.
   * @param runId The run's unique id.
   */
  async getStatus(runId: string): Promise<GraphRunStatusResult | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graph/runs/${encodeURIComponent(runId)}`,
        {
          method: "GET",
          credentials: "include",
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) return null;
      return (await response.json()) as GraphRunStatusResult;
    } catch {
      return null;
    }
  }

  /**
   * Fetches the run's stored execution result after a terminal event. Resolves
   * `null` when the run has no stored result (which the legacy
   * `graph/results/:runId` inspection fold treats the same way).
   * @param runId The run's unique id.
   */
  async getRunResult(runId: string): Promise<GraphRunExecutionResult | null> {
    const status = await this.getStatus(runId);
    if (!status || !status.result) return null;
    return status.result;
  }

  /**
   * Cancels a run. Cancelling is idempotent for terminal runs; the run's
   * terminal state is still returned by the backend.
   * @param runId The run's unique id.
   */
  async cancelRun(runId: string): Promise<GraphRunStatusResult> {
    const response = await fetch(
      `${this.baseUrl}/graph/runs/${encodeURIComponent(runId)}`,
      {
        method: "DELETE",
        credentials: "include",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw graphRunHttpErrorOf("run cancellation", response.status, text);
    }
    return (await response.json()) as GraphRunStatusResult;
  }

  /**
   * Convenience alias mirroring {@link GraphRunClient.getRunResult} for the
   * legacy `graph/results/:runId` inspection fold (DECAF-48 §4.6). Resolves
   * to `null` when the run's stored result is absent.
   * @param runId The run's unique id.
   */
  async fetchRunResult(runId: string): Promise<GraphRunExecutionResult | null> {
    return this.getRunResult(runId);
  }
}

/**
 * Maps the run lifecycle's HTTP failures onto the Decaf error hierarchy so
 * the frontend never surfaces raw `Error` objects (contract §1.1.3):
 * `400`→`BadRequestError`, `401`→`AuthorizationError`, `403`→`ForbiddenError`,
 * `404`→`NotFoundError`, everything else→`InternalError` (a backend 5xx is
 * the backend's own failure surfaced upstream).
 * @param op The failed run endpoint's readable label (message prefix).
 * @param status HTTP response status code.
 * @param detail Backend response body, when available.
 */
function graphRunHttpErrorOf(op: string, status: number, detail: string): Error {
  const base = `Graph ${op} failed: ${status} ${detail}`;
  if (status === 400) return new BadRequestError(base);
  if (status === 401) return new AuthorizationError(base);
  if (status === 403) return new ForbiddenError(base);
  if (status === 404) return new NotFoundError(base);
  return new InternalError(base);
}
