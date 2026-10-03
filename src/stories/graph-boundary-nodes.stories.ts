import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { PortDirection } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  NgDiagramComponent,
  NgDiagramNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
  type ModelAdapter,
} from 'ng-diagram';
import { GraphNodeCatalogService } from 'src/graph/catalog/GraphNodeCatalogService';
import { GraphBoundaryNodeTemplateComponent } from 'src/graph/components/boundary-node-template/boundary-node-template.component';
import type { GraphBoundaryNodeData } from 'src/graph/types';
import './setup';
import { getComponentMeta } from './utils';

function boundaryData(
  role: 'input' | 'output',
  title: string,
  property: string
): GraphBoundaryNodeData {
  return {
    title,
    kind: `core.boundary.${role}`,
    role,
    property,
    sourceClass: 'WorkflowBoundary',
    sourcePort: 'value',
    duplicateIndex: 0,
    isPrimary: true,
    value: role === 'input' ? 'hello world' : { result: 42 },
    ports: [
      {
        property: 'value',
        name: 'Value',
        label: 'Value',
        direction: role === 'input' ? PortDirection.OUTPUT : PortDirection.INPUT,
        type: 'text',
        required: true,
        hidden: false,
      },
    ],
  };
}

@Component({
  selector: 'story-graph-boundary-nodes-host',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [
    provideNgDiagram(),
    {
      provide: GraphNodeCatalogService,
      useValue: { get: () => undefined, status: () => 'ready', failure: () => null },
    },
  ],
  template: `
    <div style="height: 320px; width: 100%">
      @if (model(); as graphModel) {
        <ng-diagram [model]="graphModel" [nodeTemplateMap]="nodeTemplateMap" />
      }
    </div>
  `,
})
class GraphBoundaryNodesHostComponent implements OnInit {
  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['core.boundary.input', GraphBoundaryNodeTemplateComponent],
    ['core.boundary.output', GraphBoundaryNodeTemplateComponent],
  ]);
  readonly model = signal<ModelAdapter | null>(null);

  ngOnInit(): void {
    this.model.set(
      initializeModel({
        nodes: [
          {
            id: 'input-text',
            type: 'core.boundary.input',
            position: { x: 40, y: 60 },
            size: { width: 160, height: 64 },
            data: boundaryData('input', 'Text', 'text'),
          },
          {
            id: 'output-result',
            type: 'core.boundary.output',
            position: { x: 320, y: 60 },
            size: { width: 160, height: 64 },
            data: boundaryData('output', 'Result', 'result'),
          },
        ],
        edges: [],
        metadata: { viewport: { x: 0, y: 0, scale: 1 } },
      })
    );
  }
}

const component = getComponentMeta<GraphBoundaryNodesHostComponent>([]);
const meta: Meta<GraphBoundaryNodesHostComponent> = {
  title: 'Graph/Nodes/Boundary Nodes',
  component: GraphBoundaryNodesHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphBoundaryNodesHostComponent>;

export const inputAndOutput: Story = {};
