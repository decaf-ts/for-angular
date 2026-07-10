import { Component, inject, input, computed } from '@angular/core';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramModelService,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import { GraphBoundaryNodeData } from '../../types';
import { graphSelection } from '../../execution/GraphSelectionStore';

@Component({
  selector: 'app-graph-boundary-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './boundary-node-template.component.html',
  styleUrl: './boundary-node-template.component.scss',
})
export class GraphBoundaryNodeTemplateComponent implements NgDiagramNodeTemplate<GraphBoundaryNodeData> {
  node = input.required<Node<GraphBoundaryNodeData>>();
  private readonly modelService = inject(NgDiagramModelService);

  readonly isSelected = computed(() => {
    const nodeId = this.node().id;
    return graphSelection.selectedNodeIds().has(nodeId);
  });

  readonly connectedPortIds = computed(() => {
    const nodeId = this.node().id;
    const edges = this.modelService.edges();
    const ids = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId && edge.sourcePort) ids.add(edge.sourcePort);
      if (edge.target === nodeId && edge.targetPort) ids.add(edge.targetPort);
    }
    return ids;
  });

  outputPorts() {
    const isDefault = (port: { property: string; path?: string }) =>
      port.property === 'value' || port.path === 'value' || port.property === 'default' || port.path === 'default';
    return this.node()
      .data.ports.filter((port) => port.direction === PortDirection.OUTPUT)
      .sort((a, b) => {
        const aDefault = isDefault(a) ? 1 : 0;
        const bDefault = isDefault(b) ? 1 : 0;
        return aDefault - bDefault;
      });
  }

  async deleteNode(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.modelService.deleteNodes([this.node().id]);
  }
}
