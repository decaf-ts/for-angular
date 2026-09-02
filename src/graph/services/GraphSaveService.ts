import { Injectable, inject, signal } from '@angular/core';
import { InternalError } from '@decaf-ts/db-decorators';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import type {
  GraphSnapshotEditorState,
  GraphWorkflowDocument,
  GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';

/** Result of a workflow save: persisted identity and timestamp. */
export interface GraphSaveResult {
  workflowId: string;
  savedAt: string;
}

/** Canonical save result: additionally echoes the persisted document. */
export interface GraphDocumentSaveResult extends GraphSaveResult {
  document?: GraphWorkflowDocument;
}

/**
 * Saves workflows to the backend persistence API: the canonical route
 * (`PUT /graph/workflows/:workflowId`, DECAF-50 §4.10) and the legacy
 * snapshot fallback. Exposes a `saving` signal for toolbar state.
 */
@Injectable({ providedIn: 'root' })
export class GraphSaveService {
  readonly saving = signal(false);
  private readonly baseUrl = inject(GRAPH_BACKEND_URL, { optional: true }) ?? '';

  /**
   * Canonical save. Posts the canonical snapshot wrapper (`{ document, editor,
   * metadata }`) to the normative NestJS canonical route (`PUT
   * /graph/workflows/:workflowId`) — DECAF-50 §4.10/§4.11; the document field
   * only; legacy wrapper snapshots are rejected.
   */
  async saveDocument(
    workflowId: string,
    snapshot: GraphWorkflowSnapshot,
  ): Promise<GraphDocumentSaveResult> {
    this.saving.set(true);
    try {
      const response = await fetch(
        `${this.baseUrl}/graph/workflows/${encodeURIComponent(workflowId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
          credentials: 'include',
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new InternalError(
          `Graph canonical save failed: ${response.status} ${text}`
        );
      }
      return (await response.json()) as GraphDocumentSaveResult;
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Loads the canonical wrapper saved for `workflowId` from the normative
   * NestJS route (`GET /graph/workflows/:workflowId`) — DECAF-50 §4.10.
   * Resolves `null` when the workflow was never saved on the backend (HTTP
   * 404) so a fresh editor session stays on the canvas-derived document.
   * The load fetch carries no `Content-Type` (bodyless GET; a presence would
   * fire a CORS preflight) and aborts after 10 seconds like every other
   * backend fetch, so an unreachable backend cannot hold the browser's network
   * idle state open forever.
   */
  async loadDocument(
    workflowId: string,
  ): Promise<GraphWorkflowSnapshot | null> {
    const response = await fetch(
      `${this.baseUrl}/graph/workflows/${encodeURIComponent(workflowId)}`,
      {
        method: 'GET',
        credentials: 'include',
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new InternalError(
        `Graph canonical load failed: ${response.status} ${text}`
      );
    }
    return (await response.json()) as GraphWorkflowSnapshot;
  }

  isSaving(): boolean {
    return this.saving();
  }
}
