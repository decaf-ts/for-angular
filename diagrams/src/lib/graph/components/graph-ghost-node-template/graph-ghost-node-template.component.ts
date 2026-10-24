import { Component, computed, input, inject } from '@angular/core';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import { GraphRendererNodeData } from '../../types';
import { ghostNodeStore } from '../../execution/GhostNodeStore';
/**
 * Canvas template rendering ghost/placeholder nodes created by loop and switch
 * expansion: non-deletable chrome tied to its parent via
 * {@link GraphRendererNodeData}`ghostParentId` (DECAF-50 §4.20).
 * @category Graph
 */
@Component({
  selector: 'app-graph-ghost-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './graph-ghost-node-template.component.html',
  styleUrl: './graph-ghost-node-template.component.scss',
})
export class GraphGhostNodeTemplateComponent implements NgDiagramNodeTemplate<GraphRendererNodeData> {
  node = input.required<Node<GraphRendererNodeData>>();

  /**
   * R2-3(5) (round-2): when the loop already holds a real body node the ghost
   * is faded out and revealed only while the for-each loop (or the ghost itself)
   * is hovered; an empty loop keeps the ghost always visible.
   */
  readonly muted = computed(() => {
    const parent = this.node().data.ghostParentId;
    if (!parent || !ghostNodeStore.hasLoopBody(parent)) return false;
    return (
      ghostNodeStore.hoveredLoopId() !== parent &&
      ghostNodeStore.hoveredGhostId() !== this.node().id
    );
  });

  onHoverStart() {
    ghostNodeStore.hoveredGhostId.set(this.node().id);
  }

  onHoverEnd() {
    if (ghostNodeStore.hoveredGhostId() === this.node().id) {
      ghostNodeStore.hoveredGhostId.set(null);
    }
  }

  onAddNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const parentNodeId = this.node().data.ghostParentId;
    if (parentNodeId) {
      ghostNodeStore.requestAddNode(parentNodeId, this.anchorOf(event));
    }
  }

  /**
   * Pointer location that opened the palette. A pointer/click event carries the
   * viewport coordinates; a keyboard activation falls back to the ghost's own
   * centre so the popup still appears at the affordance, never under the
   * canvas-level button.
   */
  private anchorOf(event: Event): { x: number; y: number } | undefined {
    const pointer = event as MouseEvent;
    if (typeof pointer.clientX === 'number' && typeof pointer.clientY === 'number') {
      return { x: pointer.clientX, y: pointer.clientY };
    }
    const rect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
  }

  onAddNodeKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.onAddNode(event);
  }
}
