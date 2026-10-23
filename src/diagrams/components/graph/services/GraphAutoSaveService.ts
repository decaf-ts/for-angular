import { Injectable, inject, signal } from '@angular/core';
import { GRAPH_AUTOSAVE_DEBOUNCE_MS } from '../tokens/graph-configuration.tokens';
import { GraphSaveService } from './GraphSaveService';
import { graphValidity } from '../validation/GraphWorkflowValidityStore';
import type { GraphWorkflowSnapshot } from '@decaf-ts/as-graph/shared';

/** Snapshot form accepted by autosave: the canonical document-first wrapper (§4.26 R2-2). */
export type GraphAutosaveSnapshot = GraphWorkflowSnapshot;

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
    // R2-3(8): autosave must never persist an invalid graph, exactly as the
    // manual save gate blocks `onSaveWorkflow`. The user's toggle intent is
    // preserved (`enabled` is left untouched); only scheduling is suppressed
    // while the validity projection marks the document invalid.
    if (graphValidity.isInvalid()) return;

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

    // R2-3(8): never flush a document the validity projection marks invalid,
    // even when it was scheduled while still valid (the graph can turn invalid
    // inside the debounce window). The toggle intent stays untouched.
    if (graphValidity.isInvalid()) return Promise.resolve();

    // Canonical autosave (§4.11): the autosave save-posts the canonical
    // snapshot wrapper (`{ document, editor?, metadata? }`) so the backend
    // GraphWorkflowModel carries the canonical `document`. The legacy snapshot
    // form is gone (§4.26 R2-2): the canonical wrapper is the only form.
    return this.saveService.saveDocument(workflowId, snapshot).then(
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
