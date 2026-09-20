import { Component, computed, input, inject } from '@angular/core';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramPortComponent,
  type NgDiagramNodeTemplate,
  type Node,
} from 'ng-diagram';
import { GraphRendererNodeData } from '../../types';
import { ghostNodeStore } from '../../execution/GhostNodeStore';

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
      ghostNodeStore.requestAddNode(parentNodeId);
    }
  }

  onAddNodeKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.onAddNode(event);
  }
}
