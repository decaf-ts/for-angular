/** @module for-angular/graph/validation/GraphWorkflowValidateClient
 * @summary Angular client for the canonical workflow validation endpoint (DECAF-50 §4.10/D5).
 * @description Calls the NestJS `POST /graph/workflows/validate` endpoint and
 * returns the structured, frontend-safe validation result the editor projects as
 * its validity state (D5, DECAF-50 §4.22): `{ valid, issues[] }`, where each
 * issue carries `code`, `path`, `message` and optional `nodeId`/`edgeId`/`details`.
 *
 * The endpoint is the authority; the client only consumes it. The client never
 * imports the backend validator or engine — it talks JSON over HTTP using local
 * wire-shape mirrors (the `for-angular` boundary forbids
 * `@decaf-ts/integrations` imports, DECAF-35).
 */
import { Injectable, inject } from '@angular/core';
import type { GraphJsonValue, GraphWorkflowDocument } from '@decaf-ts/ui-decorators/graph';
import { BadRequestError, InternalError, NotFoundError } from '@decaf-ts/db-decorators';
import { AuthorizationError, ForbiddenError } from '@decaf-ts/core';
import {
  GRAPH_BACKEND_URL,
  GraphBackendUnavailableError,
} from '../execution/GraphExecutionService';

/**
 * A single structured workflow-validation issue surfaced by the backend
 * nine-stage gate (DECAF-50 §4.8), mirrored locally because the backend
 * type is not frontend-safe.
 */
export interface GraphValidationIssue {
  /** Stable machine-readable issue code (e.g. `kind.unknown`). */
  code: string;
  /** Dotted path to the offending part of the document. */
  path: string;
  /** Human-readable description of the issue. */
  message: string;
  /** Node instance the issue refers to, when applicable. */
  nodeId?: string;
  /** Edge instance the issue refers to, when applicable. */
  edgeId?: string;
  /** Safe extra context (JSON values only — never credentials). */
  details?: Record<string, GraphJsonValue>;
}

/**
 * Result of validating a canonical workflow document (DECAF-50 §4.8),
 * mirrored locally from the backend contract. `resolved` is ignored by the
 * editor (it is engine-side); only `valid` and `issues` are projected.
 */
export interface GraphWorkflowValidationResult {
  /** `true` when the document passed every validation stage. */
  valid: boolean;
  /** Every issue found, in normative stage order. */
  issues: GraphValidationIssue[];
}

/**
 * Normalizes an untrusted validation payload into a
 * {@link GraphWorkflowValidationResult}. Returns `null` when the payload is not
 * a validation result (no boolean `valid` field), so a malformed or non-JSON
 * backend response is treated as unavailable rather than as an invalid graph.
 * Malformed `issues` entries are dropped rather than corrupting the projection.
 * @param payload The decoded response body.
 */
export function graphWorkflowValidationResultOf(
  payload: unknown
): GraphWorkflowValidationResult | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as {
    valid?: unknown;
    issues?: unknown;
  };
  if (typeof record.valid !== 'boolean') return null;
  const issues = Array.isArray(record.issues)
    ? record.issues.filter((issue): issue is GraphValidationIssue => {
        if (!issue || typeof issue !== 'object') return false;
        const candidate = issue as Record<string, unknown>;
        return (
          typeof candidate['message'] === 'string' &&
          typeof candidate['path'] === 'string' &&
          typeof candidate['code'] === 'string'
        );
      })
    : [];
  return {
    valid: record.valid && issues.length === 0,
    issues,
  };
}

/**
 * Angular client for the canonical workflow validation endpoint
 * (`POST /graph/workflows/validate`, DECAF-50 §4.10/D5): submits a
 * {@link GraphWorkflowDocument} and resolves the structured validity result the
 * editor projects. Backend unavailability surfaces as
 * {@link GraphBackendUnavailableError}, mirroring the run client.
 */
@Injectable({ providedIn: 'root' })
export class GraphWorkflowValidateClient {
  private readonly baseUrl = inject(GRAPH_BACKEND_URL);

  /**
   * Validates a canonical workflow document against the backend's trusted
   * nine-stage gate.
   * @param document The exact editor document to validate.
   * @throws {@link GraphBackendUnavailableError} when the backend is unreachable.
   * @throws {Error} for backend rejections (the endpoint's own error surface).
   */
  async validate(
    document: GraphWorkflowDocument
  ): Promise<GraphWorkflowValidationResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/graph/workflows/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document }),
        credentials: 'include',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new GraphBackendUnavailableError(
        err instanceof Error && err.name === 'TimeoutError'
          ? 'Graph backend did not respond within 10 seconds. Is it running?'
          : 'Graph backend is not running. Start it with `npm run start:backend`.'
      );
    }

    if (!response.ok) {
      // The boundary gate returns 422 with `{ message, issues }` when a document
      // is rejected before the nine-stage result is produced: surface those issues
      // as a structured invalid result instead of a transport failure.
      const payload = await response.json().catch(() => null);
      const rejected = graphWorkflowValidationResultOf(payload);
      if (rejected) return rejected;
      const record = (payload ?? {}) as { issues?: unknown };
      if (Array.isArray(record.issues) && record.issues.length) {
        const issues = graphWorkflowValidationResultOf({ valid: false, issues: record.issues });
        if (issues) return issues;
      }
      const text = payload ? JSON.stringify(payload) : response.statusText;
      throw graphValidateHttpErrorOf('workflow validation', response.status, text);
    }

    const payload = await response.json().catch(() => null);
    const result = graphWorkflowValidationResultOf(payload);
    if (!result) {
      throw new InternalError(
        'Graph workflow validation response is out of contract (valid/issues).'
      );
    }
    return result;
  }
}

/**
 * Maps the validation endpoint's HTTP failures onto the Decaf error hierarchy
 * so the frontend never surfaces raw `Error` objects (contract §1.1.3):
 * `400`→`BadRequestError`, `401`→`AuthorizationError`, `403`→`ForbiddenError`,
 * `404`→`NotFoundError`, everything else→`InternalError`.
 * @param op The failed endpoint's readable label (message prefix).
 * @param status HTTP response status code.
 * @param detail Backend response body, when available.
 */
function graphValidateHttpErrorOf(op: string, status: number, detail: string): Error {
  const base = `Graph ${op} failed: ${status} ${detail}`;
  if (status === 400) return new BadRequestError(base);
  if (status === 401) return new AuthorizationError(base);
  if (status === 403) return new ForbiddenError(base);
  if (status === 404) return new NotFoundError(base);
  return new InternalError(base);
}
