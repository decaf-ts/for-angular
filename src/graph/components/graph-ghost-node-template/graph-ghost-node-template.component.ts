import { Component, input, inject } from '@angular/core';
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
