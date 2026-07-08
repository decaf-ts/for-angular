import { Injectable, inject, effect } from '@angular/core';
import { GraphAutoSaveService } from './GraphAutoSaveService';
import { GraphHistoryService } from './GraphHistoryService';
import { graphNodeConfig } from '../execution/GraphNodeConfigStore';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

export type GraphMutationSource =
  | 'node-position'
  | 'edge-connect'
  | 'edge-disconnect'
  | 'port-toggle'
  | 'node-crud';

@Injectable({ providedIn: 'root' })
export class GraphMutationDetectorService {
  private readonly autoSave = inject(GraphAutoSaveService);
  private readonly history = inject(GraphHistoryService);

  private snapshotBuilder: (() => GraphWorkflowSnapshot | null) | null = null;
  private workflowId: string | null = null;

  configure(
    workflowId: string,
    snapshotBuilder: () => GraphWorkflowSnapshot | null,
  ): void {
    this.workflowId = workflowId;
    this.snapshotBuilder = snapshotBuilder;
  }

  recordMutation(source: GraphMutationSource): void {
    if (!this.workflowId || !this.snapshotBuilder) return;

    const snapshot = this.snapshotBuilder();
    if (!snapshot) return;

    if (this.autoSave.enabled()) {
      this.autoSave.onMutation(this.workflowId, snapshot);
    } else {
      this.history.push(this.workflowId, snapshot, source);
    }
  }
}
