import { Component, input } from '@angular/core';
import {
  NgDiagramBaseNodeTemplateComponent,
  NgDiagramNodeTemplate,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';
import { PortDirection } from '@decaf-ts/ui-decorators/graph';
import type { GraphDemoNodeData } from './types';

@Component({
  selector: 'app-graph-node-template',
  standalone: true,
  imports: [NgDiagramBaseNodeTemplateComponent, NgDiagramPortComponent],
  templateUrl: './graph-node-template.component.html',
  styleUrl: './graph-node-template.component.scss',
})
export class GraphNodeTemplateComponent implements NgDiagramNodeTemplate<GraphDemoNodeData> {
  node = input.required<Node<GraphDemoNodeData>>();

  inputPorts() {
    return this.node().data.ports.filter((port) => port.direction === PortDirection.INPUT);
  }

  outputPorts() {
    return this.node().data.ports.filter((port) => port.direction === PortDirection.OUTPUT);
  }
}

