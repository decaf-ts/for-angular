/**
 * @module for-angular/graph/components/graph-node-inspection
 * @summary Three-pane node split view for double-click CRUD (D3/G3-10..G3-12).
 * @description Renders the D3 split view for the current
 * `graphInspection.openNodeId()`: run inputs LEFT, the node's CRUD form
 * CENTER, run outputs RIGHT — all three populated after a run. The panel always
 * renders an explicit empty/failed state for a node that has run status but no
 * inspection payload, so it can never render nothing ("right now NOTHING APPEARS",
 * DECAF-50 §4.22 D3/G3-12). Boundary (workflow-input) nodes render the
 * editable workflow-input form as their CRUD center pane (G3-10/G3-13).
 */
import { Component, computed, inject, input, output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { NgDiagramModelService, type Node } from 'ng-diagram';
import type { GraphNodeInspectionPayload } from '@decaf-ts/ui-decorators/graph';
import { graphInspection } from '../../execution/GraphInspectionStore';
import { GraphNodeCatalogService } from '../../catalog/GraphNodeCatalogService';
import { GraphWorkflowDocumentStore } from '../../document/GraphWorkflowDocumentStore';
import type { WorkflowInputFieldDefinition } from '../../workflow-inputs';
import { GraphIoViewerComponent } from '../graph-io-viewer/graph-io-viewer.component';
import type { GraphNodeEditResult } from '../graph-node-edit-modal/graph-node-edit-modal.component';
import { GraphNodeInlineEditorComponent } from './graph-node-inline-editor.component';
import { GraphWorkflowInputEditorComponent } from './graph-workflow-input-editor.component';

/** Run-result lifecycle the split view renders its run panes from (G3-12). */
export type GraphInspectionRunState = 'idle' | 'pending' | 'ready' | 'failed';

/** Structured validation issue surfaced by a run (G3-33). */
export interface GraphRunValidationIssue {
  path?: string;
  message: string;
  code?: string;
}

interface InspectionNodeMeta {
  title: string;
  sourceClass: string;
  kind: string;
}

function nodeMeta(node: Node | undefined, nodeId: string): InspectionNodeMeta {
  const data = (node?.data ?? {}) as Record<string, unknown>;
  return {
    title: String(data['title'] ?? nodeId),
    sourceClass: String(data['sourceClass'] ?? nodeId),
    kind: String(data['kind'] ?? 'node'),
  };
}

/**
 * Three-pane split view (D3/G3-10..G3-13, DECAF-50 §4.22): the CENTER pane is
 * the node's CRUD form (inline editor for member nodes, the editable
 * workflow-input form for boundary nodes), the LEFT pane is the run inputs and the
 * RIGHT pane is the run outputs (or the node error). A ran node without a
 * fetched payload renders explicit empty/failed states with a retry affordance,
 * never an empty panel. Both run panes reuse {@link GraphIoViewerComponent}
 * (JSON / table / raw).
 */
@Component({
  selector: 'app-graph-node-inspection',
  standalone: true,
  imports: [
    GraphIoViewerComponent,
    GraphNodeInlineEditorComponent,
    GraphWorkflowInputEditorComponent,
  ],
  templateUrl: './graph-node-inspection.component.html',
  styleUrl: './graph-node-inspection.component.scss',
})
export class GraphNodeInspectionComponent {
  private readonly modelService = inject(NgDiagramModelService);
  private readonly documentStore = inject(GraphWorkflowDocumentStore, { optional: true });
  private readonly catalog = inject(GraphNodeCatalogService, { optional: true });

  /** The shared inspection store driving which node is shown. */
  protected readonly store = graphInspection;

  /** Run-result lifecycle state (drives the empty/failed run panes, G3-12). */
  readonly runState = input<GraphInspectionRunState>('idle');
  /** Structured validation issues surfaced by the run (G3-33). */
  readonly validationIssues = input<GraphRunValidationIssue[]>([]);
  /** The renderer's editable workflow-input form (boundary CRUD, G3-13). */
  readonly workflowInputForm = input<FormGroup | null>(null);
  /** The renderer's workflow-input field definitions (boundary CRUD, G3-13). */
  readonly workflowInputFields = input<WorkflowInputFieldDefinition[]>([]);

  /** Re-fetch the run result when a pane renders the failed state (G3-33). */
  readonly retry = output<void>();

  /** Payload of the currently-open node, or `null` when no payload landed. */
  protected readonly payload = this.store.openPayload;

  /** Canvas node the split view is showing, when it is still on canvas. */
  protected readonly openNode = computed<Node | undefined>(() => {
    const nodeId = this.store.openNodeId();
    if (!nodeId) return undefined;
    return this.modelService.nodes().find((node) => node.id === nodeId);
  });

  /** Resolved identity (title / source class / kind) of the open node. */
  protected readonly meta = computed<InspectionNodeMeta | null>(() => {
    const nodeId = this.store.openNodeId();
    if (!nodeId) return null;
    return nodeMeta(this.openNode(), nodeId);
  });

  /** Display title of the open node (falls back to the node id). */
  protected readonly nodeTitle = computed(() => this.meta()?.title ?? this.store.openNodeId() ?? '');

  /** Execution state of the open node, rendered in the header badge. */
  protected readonly nodeState = computed(() => {
    const payload = this.payload();
    if (payload) return String(payload.state ?? '');
    return String(this.runState() === 'ready' ? 'succeeded' : this.runState());
  });

  /** CSS modifier class for the header state badge by execution state. */
  protected readonly stateBadgeClass = computed(() => {
    const state = this.nodeState();
    const map: Record<string, string> = {
      running: 'graph-node-inspection__badge--running',
      blocked: 'graph-node-inspection__badge--blocked',
      succeeded: 'graph-node-inspection__badge--succeeded',
      failed: 'graph-node-inspection__badge--failed',
      skipped: 'graph-node-inspection__badge--skipped',
    };
    return map[state] ?? '';
  });

  /** Boundary role of the open node (`input`/`output`), or `null` for members. */
  protected readonly boundaryRole = computed<'input' | 'output' | null>(() => {
    const role = (this.openNode()?.data as { role?: string } | undefined)?.role;
    return role === 'input' || role === 'output' ? role : null;
  });

  /** Whether the open node is a workflow-boundary badge (G3-10). */
  protected readonly isBoundary = computed(() => this.boundaryRole() !== null);

  /** Boundary property (workflow input/output id) of the open node. */
  protected readonly boundaryProperty = computed(() =>
    String((this.openNode()?.data as { property?: string } | undefined)?.property ?? '')
  );

  /** Boundary node's current value (read-only for output boundaries). */
  protected readonly boundaryValue = computed(
    () => (this.openNode()?.data as { value?: unknown } | undefined)?.value
  );

  /** Workflow-input field definition matching the open boundary node. */
  protected readonly boundaryField = computed<WorkflowInputFieldDefinition | null>(() => {
    const property = this.boundaryProperty();
    if (!property) return null;
    return (
      this.workflowInputFields().find(
        (field) => field.property === property || field.path === property
      ) ?? null
    );
  });

  /** Canonical node instance of the open node, when it is a member node. */
  protected readonly nodeInstance = computed(() => {
    const nodeId = this.store.openNodeId();
    if (!nodeId) return null;
    return this.documentStore?.document()?.nodes.find((node) => node.id === nodeId) ?? null;
  });

  /** Manifest parameter definitions of the open node's kind (CRUD rows). */
  protected readonly parameterDefs = computed(
    () => this.catalog?.get(this.meta()?.kind ?? '')?.parameters ?? []
  );

  /** Whether a run payload exists for the open node (G3-12). */
  protected readonly hasPayload = computed(() => this.payload() !== null);

  /** Whether the open node's run result fetch failed (G3-12/G3-33). */
  protected readonly runFailed = computed(() => this.runState() === 'failed');

  /**
   * Explicit empty-state reason for a run pane: a node with run status but no
   * fetched payload renders this instead of nothing (G3-12).
   */
  protected readonly emptyReason = computed(() => {
    if (this.runState() === 'pending') return 'Fetching the run result…';
    if (this.runState() === 'failed') return 'The run result could not be fetched.';
    return 'No run data recorded for this node.';
  });

  /** Closes the split view. */
  protected close(): void {
    this.store.close();
  }

  /** Requests a run-result re-fetch from the page (G3-33 retry affordance). */
  protected requestRetry(): void {
    this.retry.emit();
  }

  /** Dispatches the inline CRUD form's patch into the canonical document. */
  protected onInlineSave(result: GraphNodeEditResult): void {
    const store = this.documentStore;
    if (!store) return;
    try {
      store.updateNode(result.nodeId, {
        inputBindings: result.inputBindings,
        parameters: result.parameters,
        ...(result.metadata && Object.keys(result.metadata).length
          ? { metadata: result.metadata }
          : {}),
      });
    } catch (error) {
      console.warn('[GraphNodeInspectionComponent] inline document write skipped', error);
    }
  }
}
