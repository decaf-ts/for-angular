/**
 * @module for-angular/graph/components/graph-node-inspection
 * @summary Split-view node I/O inspection panel docked to the canvas.
 * @description Renders the inspection payload for the current
 * `graphInspection.openNodeId()`: the right pane shows inputs and the left
 * pane shows outputs (or the error when the node failed). Both panes reuse
 * {@link GraphIoViewerComponent} (JSON / table / raw).
 */
import { Component, computed, inject } from '@angular/core';
import { NgDiagramModelService, type Node } from 'ng-diagram';
import { graphInspection } from '../../execution/GraphInspectionStore';
import { GraphIoViewerComponent } from '../graph-io-viewer/graph-io-viewer.component';

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
 * Read-only split-view I/O inspection panel (inline, not a modal) launched by
 * double-clicking an already-ran node. Renders the {@link graphInspection}
 * store's open payload: the right pane shows inputs and the left pane shows
 * outputs — or the error when the node failed. Both panes reuse
 * {@link GraphIoViewerComponent} (JSON / table / raw, Req-9); the header shows
 * node identity and a state badge. No editing happens in this panel (Req-10).
 */
@Component({
  selector: 'app-graph-node-inspection',
  standalone: true,
  imports: [GraphIoViewerComponent],
  templateUrl: './graph-node-inspection.component.html',
  styleUrl: './graph-node-inspection.component.scss',
})
export class GraphNodeInspectionComponent {
  private readonly modelService = inject(NgDiagramModelService);
  /** The shared inspection store driving which node is shown. */
  protected readonly store = graphInspection;

  /** Payload of the currently-open node, or `null` when closed/no payload. */
  protected readonly payload = this.store.openPayload;

  /** Display title of the open node (falls back to the node id). */
  protected readonly nodeTitle = computed(() => {
    const payload = this.payload();
    if (!payload) return '';
    return nodeMeta(this.nodeOf(payload.nodeId), payload.nodeId).title;
  });

  /** Execution state of the open node, rendered in the header badge. */
  protected readonly nodeState = computed(() => {
    const payload = this.payload();
    if (!payload) return '';
    return String(payload.state ?? '');
  });

  /** Resolved identity (title / source class / kind) of the open node. */
  protected readonly meta = computed<InspectionNodeMeta | null>(() => {
    const payload = this.payload();
    if (!payload) return null;
    return nodeMeta(this.nodeOf(payload.nodeId), payload.nodeId);
  });

  /** Looks up a canvas node by id to resolve its display identity. */
  private nodeOf(nodeId: string): Node | undefined {
    return this.modelService.nodes().find((node) => node.id === nodeId);
  }

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

  /** Closes the inspection panel. */
  protected close(): void {
    this.store.close();
  }
}
