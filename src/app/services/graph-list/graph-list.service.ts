import { Injectable, inject } from '@angular/core';
import { InternalError } from '@decaf-ts/db-decorators';
import { GRAPH_BACKEND_URL } from 'src/diagrams/components/graph/execution/GraphExecutionService';

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
  runnable?: boolean;
}

/**
 * One row of `GET /graph/workflows/:workflowId/runs` (SAA-76): the persisted
 * run projection the execution list binds to. Optional payload members
 * (`inputs`/`result`/`error`) are omitted for runs the caller does not own.
 *
 * SAA-836 S2: when the run is served by the mastra backend the row is the
 * backend's run-metrics projection instead (`resourceId`/`updatedAt`/`snapshot`
 * instead of the local run record's timestamps and payload members). The
 * `snapshot` member is present only for payload-authorized callers and carries
 * the backend's recorded replay payload for the run.
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
  /** Fingerprint of the executed document (local run rows). */
  documentFingerprint?: string;
  /** Owning resource id (mastra run-metrics rows). */
  resourceId?: string;
  /** Backend-recorded replay snapshot payload (mastra rows, payload-authorized callers only). */
  snapshot?: unknown;
  /** Run creation timestamp (ISO string). */
  createdAt?: string;
  /** Run update timestamp (ISO string, mastra run-metrics rows). */
  updatedAt?: string;
  /** Execution start timestamp (ISO string). */
  startedAt?: string;
  /** Terminal-state timestamp (ISO string). */
  finishedAt?: string;
}

/**
 * Paginated run-row page envelope (SAA-836 S2): served by
 * `GET /graph/workflows/:workflowId/runs?page&perPage` when the runs are
 * delegated to the mastra backend's paginator.
 */
export interface GraphRunRowsPage {
  /** The page's run rows, newest first. */
  data: GraphRunRow[];
  /** One-indexed page number the envelope serves. */
  current: number;
  /** Total rows across all pages. */
  total: number;
  /** Total pages. */
  count: number;
}

/** Runtime guard for the SAA-836 S2 page envelope shape. */
function isGraphRunRowsPage(value: unknown): value is GraphRunRowsPage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate['data']) &&
    typeof candidate['current'] === 'number' &&
    typeof candidate['total'] === 'number' &&
    typeof candidate['count'] === 'number'
  );
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

  /**
   * Lists a workflow's past runs, newest first. Accepts both response shapes
   * the endpoint serves: the flat array (local run rows and mastra rows without
   * paging parameters) and the SAA-836 S2 page envelope (`{data, current,
   * total, count}`) when the backend paginates the mastra rows.
   */
  async listRuns(workflowId: string): Promise<GraphRunRow[]> {
    const rows = await this.request<GraphRunRow[] | GraphRunRowsPage>(
      `/graph/workflows/${encodeURIComponent(workflowId)}/runs`
    );
    return isGraphRunRowsPage(rows) ? rows.data : rows;
  }

  /**
   * Lists one page of a workflow's past runs through the SAA-836 S2 paginated
   * shape (`page` one-indexed, `perPage` clamped server-side). Unwraps the
   * page envelope to its rows.
   * @param workflowId The workflow whose runs to list.
   * @param page One-indexed page number.
   * @param perPage Page size.
   */
  async listRunsPage(
    workflowId: string,
    page: number,
    perPage: number
  ): Promise<GraphRunRow[]> {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    });
    const envelope = await this.request<GraphRunRowsPage>(
      `/graph/workflows/${encodeURIComponent(workflowId)}/runs?${params.toString()}`
    );
    if (!isGraphRunRowsPage(envelope)) {
      throw new InternalError(
        'Graph run list pagination is unsupported by this backend.'
      );
    }
    return envelope.data;
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
