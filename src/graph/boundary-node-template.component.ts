import { Component, input } from '@angular/core';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import type { GraphBoundaryNodeData } from './types';

@Component({
  selector: 'app-graph-boundary-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './boundary-node-template.component.html',
  styleUrl: './boundary-node-template.component.scss',
})
export class GraphBoundaryNodeTemplateComponent
  implements NgDiagramNodeTemplate<GraphBoundaryNodeData>
{
  node = input.required<Node<GraphBoundaryNodeData>>();

  outputPorts() {
    return this.node().data.ports.filter((port) => port.direction === PortDirection.OUTPUT);
  }

  displayValue(value: unknown) {
    if (value === undefined || value === null || value === '') return 'empty';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
