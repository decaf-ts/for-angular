import { Injectable, inject, signal } from '@angular/core';
import { GRAPH_AUTOSAVE_DEBOUNCE_MS } from '../tokens/graph-configuration.tokens';
import { GraphSaveService } from './GraphSaveService';
import type {
  GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';
import { graphWorkflowSnapshotLikeToCanonical } from '@decaf-ts/ui-decorators/graph';

/** Snapshot form accepted by autosave: either a legacy canvas snapshot or a canonical wrapper. */
export type GraphAutosaveSnapshot =
  | LegacyGraphWorkflowSnapshot
  | GraphWorkflowSnapshot;

interface PendingSave {
  workflowId: string;
  snapshot: GraphAutosaveSnapshot;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Debounced autosave: collects mutations while `enabled`, converts the
 * pending snapshot to canonical form, and flushes one save after the
 * configured debounce window. Pending state is replaced, never queued.
 */
@Injectable({ providedIn: 'root' })
export class GraphAutoSaveService {
  private readonly debounceMs = inject(GRAPH_AUTOSAVE_DEBOUNCE_MS);
  private readonly saveService = inject(GraphSaveService);

  readonly enabled = signal(false);
  private pending: PendingSave | null = null;

  onMutation(workflowId: string, snapshot: GraphAutosaveSnapshot): void {
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

    // Canonical autosave (§4.11): the autosave save-posts the canonical
    // snapshot wrapper (`{ document, editor?, metadata? }`) so the backend
    // GraphWorkflowModel carries the canonical `document`. The legacy flag-off
    // path is gone after the P7 cutover.
    return this.saveService.saveDocument(
      workflowId,
      graphWorkflowSnapshotLikeToCanonical(snapshot),
    ).then(
      () => void 0,
      (err: unknown) => {
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
