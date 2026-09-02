import { Injectable, inject } from '@angular/core';
import { GraphAutoSaveService } from './GraphAutoSaveService';
import { GraphHistoryService } from './GraphHistoryService';
import { GraphWorkflowDocumentStore } from '../document/GraphWorkflowDocumentStore';
import { graphWorkflowSnapshotFromLegacy } from '@decaf-ts/ui-decorators/graph';
import type {
  GraphWorkflowDocument,
  GraphWorkflowSnapshot,
  LegacyGraphWorkflowSnapshot,
} from '@decaf-ts/ui-decorators/graph';

/** The editor interaction class that produced a mutation, driving history labels and autosave. */
export type GraphMutationSource =
  | 'node-position'
  | 'edge-connect'
  | 'edge-disconnect'
  | 'port-toggle'
  | 'node-crud';

/**
 * Bridges editor mutations to history and autosave: records checkpoints into
 * {@link GraphHistoryService} (labelled by mutation source) and notifies
 * {@link GraphAutoSaveService}, snapshotting via the configured builder.
 */
@Injectable({ providedIn: 'root' })
export class GraphMutationDetectorService {
  private readonly autoSave = inject(GraphAutoSaveService);
  private readonly history = inject(GraphHistoryService);
  private readonly documentStore = inject(GraphWorkflowDocumentStore);

  private snapshotBuilder: (() => LegacyGraphWorkflowSnapshot | null) | null = null;
  private workflowId: string | null = null;

  configure(
    workflowId: string,
    snapshotBuilder: () => LegacyGraphWorkflowSnapshot | null,
  ): void {
    this.workflowId = workflowId;
    this.snapshotBuilder = snapshotBuilder;
  }

  /**
   * Records one canvas mutation: the mutation reads from
   * {@link GraphWorkflowDocumentStore} (spec §4.11) — the canonical path is the
   * only path after the P7 cutover.
   */
  recordMutation(source: GraphMutationSource): void {
    if (!this.workflowId) return;

    this.recordFromStore(source);
  }

  private recordFromStore(source: GraphMutationSource): void {
    const workflowId = this.workflowId;
    if (!workflowId) return;

    const document = this.documentStore.document();
    if (!document) return;

    const snapshot = this.canonicalSnapshotOf(document);

    if (this.autoSave.enabled()) {
      this.autoSave.onMutation(workflowId, snapshot);
    } else {
      this.history.push(workflowId, snapshot, source);
    }
  }

  /**
   * Builds the canonical history/autosave entry for one mutation: the document
   * always comes from the {@link GraphWorkflowDocumentStore} (spec §4.11) while
   * `editor`/`metadata` carry the live editor-only state (boundary values, node
   * ports/configs, duplicate counts, viewport metadata) for lossless round trips.
   */
  private canonicalSnapshotOf(document: GraphWorkflowDocument): GraphWorkflowSnapshot {
    const legacy = this.snapshotBuilder?.() ?? null;
    if (!legacy) return { document };
    const canonical = graphWorkflowSnapshotFromLegacy(legacy);
    return { document, editor: canonical.editor, metadata: canonical.metadata };
  }
}
