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
import { graphInspection } from '../../execution/GraphInspectionStore';

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

  /**
   * Boundary decision (D2/G3-09): the workflow boundary is a real
   * trigger/result port, not a synthesized handle. The input badge (trigger)
   * exposes its `value` output port; the output badge (result) exposes its
   * `value` input port. Port labels are readable on the badge (the D2 rule).
   */
  inputPorts() {
    return this.node()
      .data.ports.filter((port) => port.direction === PortDirection.INPUT);
  }

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

  /**
   * Double-click on a boundary badge opens its CRUD form (D3/G3-10, DECAF-50
   * §4.22): a workflow input boundary renders the editable workflow-input form,
   * an output boundary its run value — both in the split view's CENTER pane.
   */
  openEditor(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    graphInspection.open(this.node().id);
  }
}
