import { Injectable, inject, signal } from '@angular/core';
import { GRAPH_BACKEND_URL } from '../execution/GraphExecutionService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

export interface GraphSaveResult {
  workflowId: string;
  savedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GraphSaveService {
  private readonly baseUrl = inject(GRAPH_BACKEND_URL);
  readonly saving = signal(false);

  async save(
    workflowId: string,
    snapshot: GraphWorkflowSnapshot,
  ): Promise<GraphSaveResult> {
    this.saving.set(true);
    try {
      const response = await fetch(
        `${this.baseUrl}/graph/workflow/${encodeURIComponent(workflowId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        },
      );

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(
          `Graph save failed: ${response.status} ${text}`,
        );
      }

      return (await response.json()) as GraphSaveResult;
    } finally {
      this.saving.set(false);
    }
  }

  isSaving(): boolean {
    return this.saving();
  }
}
