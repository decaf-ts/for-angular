/**
 * @module for-angular/graph/capabilities/GraphEngineCapabilityApi
 * @summary HTTP client for the served engine capability manifest and workflow
 * catalogues (SAA-197 / Deliverable 3).
 * @description Fetches `graph/engines`, per-engine descriptors, and per-engine
 * workflow catalogues over the graph backend URL, mapping HTTP failures onto
 * decaf error types and 404s onto `undefined` lookups. Errors never surface as
 * raw `fetch` failures: transport outages become
 * {@link GraphEngineCapabilityUnavailableError}, so the store can classify
 * `backend-down` versus `malformed-response`.
 */
import { Injectable, inject } from "@angular/core";
import {
  BadRequestError,
  InternalError,
  NotFoundError,
  SerializationError,
} from "@decaf-ts/db-decorators";
import { AuthorizationError, ForbiddenError } from "@decaf-ts/core";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import { GRAPH_BACKEND_URL } from "../execution/GraphExecutionService";
import type {
  GraphEngineCapabilityManifest,
  GraphEngineDescriptor,
  GraphEngineWorkflowSummary,
} from "./GraphEngineCapability";

/** Transport failure: the capability endpoint could not be reached at all. */
export class GraphEngineCapabilityUnavailableError extends InternalError {
  /**
   * Creates the transport-unavailable error.
   *
   * @param operation - The capability operation that failed.
   * @param reason - The underlying failure, if any.
   */
  constructor(operation: string, reason?: unknown) {
    super(
      `Graph engine capability '${operation}' is unavailable (${String(
        reason ?? "backend offline",
      )}).`,
    );
  }
}

/** The selected engine's catalogue does not declare the list/lookup feature. */
export class GraphEngineWorkflowCatalogUnsupportedError extends InternalError {
  /**
   * Creates the catalogue-unsupported error.
   *
   * @param engineId - The engine that rejected the catalogue operation.
   * @param operation - Which catalogue operation was unsupported.
   */
  constructor(engineId: string, operation: "list" | "lookup") {
    super(
      `Graph engine '${engineId}' does not support workflow ${operation}.`,
    );
  }
}

/**
 * Backend port serving the capability manifest and engine workflow catalogues.
 * Implemented by {@link GraphEngineCapabilityApi} and provided through
 * {@link GRAPH_ENGINE_CAPABILITY_SOURCE}; hosts may swap in a test double.
 */
export interface GraphEngineCapabilitySource {
  /** Fetches the served capability manifest. */
  fetchManifest(): Promise<GraphEngineCapabilityManifest>;
  /**
   * Fetches one engine descriptor.
   * @param engineId - The engine id to look up.
   * @returns The descriptor, or `undefined` for an unknown engine.
   */
  fetchEngine(engineId: string): Promise<GraphEngineDescriptor | undefined>;
  /**
   * Lists an engine's workflows.
   * @param engineId - The engine whose catalogue to list.
   * @returns The workflow summaries.
   */
  listWorkflows(engineId: string): Promise<GraphEngineWorkflowSummary[]>;
  /**
   * Fetches one workflow document from an engine's catalogue.
   * @param engineId - The engine to query.
   * @param workflowId - The workflow to look up.
   * @returns The document, or `undefined` for an unknown workflow.
   */
  getWorkflow(
    engineId: string,
    workflowId: string,
  ): Promise<GraphWorkflowDocument | undefined>;
}

/**
 * Angular-root client implementing {@link GraphEngineCapabilitySource} against
 * the graph backend. All operations are read-only GETs with credentials and a
 * 10-second timeout; out-of-contract payloads raise decaf serialization errors.
 */
@Injectable({ providedIn: "root" })
export class GraphEngineCapabilityApi implements GraphEngineCapabilitySource {
  /** The graph backend base URL the client reads from. */
  private readonly backendUrl = inject(GRAPH_BACKEND_URL);

  /**
   * Fetches and validates the served capability manifest.
   *
   * @returns The validated manifest.
   * @throws decaf error mapped from the HTTP status or payload shape.
   */
  async fetchManifest(): Promise<GraphEngineCapabilityManifest> {
    const response = await this.request("graph/engines");
    if (!response.ok) {
      throw graphEngineHttpErrorOf(
        "manifest",
        response.status,
        await response.text().catch(() => response.statusText),
      );
    }
    const payload = (await response.json().catch(() => null)) as
      | { engines?: unknown; defaultEngineId?: unknown }
      | null;
    if (
      !payload ||
      !Array.isArray(payload.engines) ||
      typeof payload.defaultEngineId !== "string"
    ) {
      throw new SerializationError(
        "Graph engine manifest is out of contract (engines/defaultEngineId).",
      );
    }
    return payload as unknown as GraphEngineCapabilityManifest;
  }

  /**
   * Fetches one engine descriptor; unknown engines resolve to `undefined`.
   *
   * @param engineId - The engine id to look up.
   * @returns The descriptor, or `undefined` for an unknown engine.
   * @throws decaf error mapped from the HTTP status.
   */
  async fetchEngine(
    engineId: string,
  ): Promise<GraphEngineDescriptor | undefined> {
    const response = await this.request(
      `graph/engines/${encodeURIComponent(engineId)}`,
    );
    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw graphEngineHttpErrorOf(
        "engine descriptor",
        response.status,
        await response.text().catch(() => response.statusText),
      );
    }
    return (await response.json().catch(() => null)) as
      | GraphEngineDescriptor
      | undefined;
  }

  /**
   * Lists an engine's workflows; a 501 (feature not supported) becomes a
   * {@link GraphEngineWorkflowCatalogUnsupportedError}.
   *
   * @param engineId - The engine whose catalogue to list.
   * @returns The workflow summaries.
   * @throws decaf error mapped from the HTTP status or payload shape.
   */
  async listWorkflows(
    engineId: string,
  ): Promise<GraphEngineWorkflowSummary[]> {
    const response = await this.request(
      `graph/engines/${encodeURIComponent(engineId)}/workflows`,
    );
    if (response.status === 501) {
      throw new GraphEngineWorkflowCatalogUnsupportedError(engineId, "list");
    }
    if (response.status === 404) {
      throw new NotFoundError(
        `No graph engine '${engineId}' is available.`,
      );
    }
    if (!response.ok) {
      throw graphEngineHttpErrorOf(
        "workflow list",
        response.status,
        await response.text().catch(() => response.statusText),
      );
    }
    const payload = await response.json().catch(() => null);
    if (!Array.isArray(payload)) {
      throw new SerializationError(
        "Graph engine workflow list is out of contract (expected an array).",
      );
    }
    return payload as GraphEngineWorkflowSummary[];
  }

  /**
   * Fetches one workflow document; unknown workflows resolve to `undefined`
   * and a 501 becomes a {@link GraphEngineWorkflowCatalogUnsupportedError}.
   *
   * @param engineId - The engine to query.
   * @param workflowId - The workflow to look up.
   * @returns The document, or `undefined` for an unknown workflow.
   * @throws decaf error mapped from the HTTP status.
   */
  async getWorkflow(
    engineId: string,
    workflowId: string,
  ): Promise<GraphWorkflowDocument | undefined> {
    const response = await this.request(
      `graph/engines/${encodeURIComponent(engineId)}/workflows/${encodeURIComponent(
        workflowId,
      )}`,
    );
    if (response.status === 404) return undefined;
    if (response.status === 501) {
      throw new GraphEngineWorkflowCatalogUnsupportedError(engineId, "lookup");
    }
    if (!response.ok) {
      throw graphEngineHttpErrorOf(
        "workflow lookup",
        response.status,
        await response.text().catch(() => response.statusText),
      );
    }
    return (await response.json().catch(() => null)) as
      | GraphWorkflowDocument
      | undefined;
  }

  /**
   * Performs a credentialed GET against the graph backend.
   *
   * @param path - The backend-relative path to fetch.
   * @returns The raw fetch response.
   * @throws {GraphEngineCapabilityUnavailableError} When the transport fails.
   */
  private async request(path: string): Promise<Response> {
    try {
      return await fetch(`${this.backendUrl}/${path}`, {
        method: "GET",
        credentials: "include",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new GraphEngineCapabilityUnavailableError(path, error);
    }
  }
}

/**
 * Classifies a capability-client failure for the store's status signal:
 * `backend-down` for transport outages, `malformed-response` for everything else.
 *
 * @param error - The thrown error to classify.
 * @return The failure kind and message.
 */
export function graphEngineCapabilityFailureOf(error: unknown): {
  kind: "backend-down" | "malformed-response";
  message: string;
} {
  if (error instanceof GraphEngineCapabilityUnavailableError) {
    return { kind: "backend-down", message: error.message };
  }
  return {
    kind: "malformed-response",
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Maps an HTTP status onto the matching decaf error type.
 *
 * @param op - The capability operation that failed.
 * @param status - The HTTP status code.
 * @param detail - The response detail (body text or status text).
 * @return The mapped decaf error.
 */
function graphEngineHttpErrorOf(
  op: string,
  status: number,
  detail: string,
): Error {
  const base = `Graph engine ${op} failed: ${status} ${detail}`;
  if (status === 400) return new BadRequestError(base);
  if (status === 401) return new AuthorizationError(base);
  if (status === 403) return new ForbiddenError(base);
  if (status === 404) return new NotFoundError(base);
  return new InternalError(base);
}
