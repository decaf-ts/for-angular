import { Injectable, inject, signal } from '@angular/core';
import { GRAPH_AUTOSAVE_DEBOUNCE_MS } from '../tokens/graph-configuration.tokens';
import { GraphSaveService } from './GraphSaveService';
import type { GraphWorkflowSnapshot } from '@decaf-ts/ui-decorators/graph';

interface PendingSave {
  workflowId: string;
  snapshot: GraphWorkflowSnapshot;
  timer: ReturnType<typeof setTimeout> | null;
}

@Injectable({ providedIn: 'root' })
export class GraphAutoSaveService {
  private readonly debounceMs = inject(GRAPH_AUTOSAVE_DEBOUNCE_MS);
  private readonly saveService = inject(GraphSaveService);

  readonly enabled = signal(false);
  private pending: PendingSave | null = null;

  onMutation(workflowId: string, snapshot: GraphWorkflowSnapshot): void {
    if (!this.enabled()) return;

    if (this.pending?.timer) {
      clearTimeout(this.pending.timer);
    }

    this.pending = {
      workflowId,
      snapshot,
      timer: setTimeout(() => {
        void this.flush();
      }, this.debounceMs),
    };
  }

  flush(): Promise<void> {
    if (!this.pending) return Promise.resolve();

    const { workflowId, snapshot, timer } = this.pending;
    if (timer) clearTimeout(timer);
    this.pending = null;

    return this.saveService.save(workflowId, snapshot).then(
      () => void 0,
      (err) => {
        console.error('[GraphAutoSaveService] flush failed', err);
      },
    );
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (!value && this.pending?.timer) {
      clearTimeout(this.pending.timer);
      this.pending = null;
    }
  }
}
