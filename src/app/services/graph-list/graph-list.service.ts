import { Injectable, inject } from '@angular/core';
import { InternalError } from '@decaf-ts/db-decorators';
import { GRAPH_BACKEND_URL } from 'src/graph/execution/GraphExecutionService';

/**
 * One row of `GET /graph/workflows` (SAA-76): the serving summary the workflow
 * list binds to. Mirrors the backend `GraphWorkflowSummary` contract.
 */
export interface GraphWorkflowSummary {
  /** Workflow document id (the persistence primary key). */
  workflowId: string;
  /** Display name mirrored from the document, when present. */
  name?: string;
  /** ISO timestamp of the last save/update. */
  updatedAt: string;
}

/**
 * One row of `GET /graph/workflows/:workflowId/runs` (SAA-76): the persisted
 * run projection the execution list binds to. Optional payload members
 * (`inputs`/`result`/`error`) are omitted for runs the caller does not own.
 */
export interface GraphRunRow {
  /** Engine-assigned run id. */
  runId: string;
  /** Workflow (document) id the run executes. */
  workflowId: string;
  /** Current lifecycle status. */
  status: string;
  /** Owning user, absent for anonymous callers. */
  owner?: string;
  /** Fingerprint of the executed document. */
  documentFingerprint?: string;
  /** Run creation timestamp (ISO string). */
  createdAt?: string;
  /** Execution start timestamp (ISO string). */
  startedAt?: string;
  /** Terminal-state timestamp (ISO string). */
  finishedAt?: string;
}

/**
 * Reads the workflow and run list endpoints added by SAA-76
 * (`GET /graph/workflows`, `GET /graph/workflows/:workflowId/runs`) through the
 * same `GRAPH_BACKEND_URL` fetch contract the editor save/load services use.
 */
@Injectable({ providedIn: 'root' })
export class GraphListService {
  private readonly baseUrl = inject(GRAPH_BACKEND_URL, { optional: true }) ?? '';

  /** Lists the workflows visible to the caller, newest update first. */
  async listWorkflows(): Promise<GraphWorkflowSummary[]> {
    return this.request<GraphWorkflowSummary[]>('/graph/workflows');
  }

  /** Lists a workflow's past runs, newest first. */
  async listRuns(workflowId: string): Promise<GraphRunRow[]> {
    return this.request<GraphRunRow[]>(
      `/graph/workflows/${encodeURIComponent(workflowId)}/runs`
    );
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      credentials: 'include',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new InternalError(
        `Graph list request failed: ${response.status} ${text}`
      );
    }
    return (await response.json()) as T;
  }
}
