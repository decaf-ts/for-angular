/**
 * @module for-angular/stories/graph-boundary-nodes
 * @summary Storybook stories for the graph boundary (`value`/`result`) node template.
 * @description Covers {@link GraphBoundaryNodeTemplateComponent} across selection, connected ports and the run-status badge states (SAA-783 G2), so a boundary node carries the same status classes as a member node.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
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
import { graphSelection } from 'src/graph/execution/GraphSelectionStore';
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
class GraphBoundaryNodesHostComponent implements OnInit, OnDestroy {
  @Input() selected = false;
  @Input() connected = false;
  @Input() inputData: GraphBoundaryNodeData = boundaryData('input', 'Text', 'text');
  @Input() outputData: GraphBoundaryNodeData = boundaryData('output', 'Result', 'result');

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
            data: this.inputData,
          },
          {
            id: 'output-result',
            type: 'core.boundary.output',
            position: { x: 320, y: 60 },
            size: { width: 160, height: 64 },
            data: this.outputData,
          },
        ],
        edges: this.connected
          ? [
              {
                id: 'e1',
                source: 'input-text',
                sourcePort: 'value',
                target: 'output-result',
                targetPort: 'value',
                data: {},
              },
            ]
          : [],
        metadata: { viewport: { x: 0, y: 0, scale: 1 } },
      })
    );
    if (this.selected) graphSelection.setSelected(['input-text']);
  }

  ngOnDestroy(): void {
    graphSelection.clear();
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

export const selectedBadge: Story = {
  args: { selected: true },
};

export const connectedPorts: Story = {
  args: { connected: true },
};

export const inputBadgeWithInputPort: Story = {
  args: {
    inputData: {
      ...boundaryData('input', 'Text', 'text'),
      ports: [
        { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.OUTPUT, type: 'text', required: true, hidden: false },
        { property: 'override', name: 'Override', label: 'Override', direction: PortDirection.INPUT, type: 'text', required: false, hidden: false },
      ],
    },
  },
};

export const outputBadgeWithMultiplePorts: Story = {
  args: {
    outputData: {
      ...boundaryData('output', 'Result', 'result'),
      ports: [
        { property: 'result', name: 'Result', label: 'Result', direction: PortDirection.INPUT, type: 'text', required: true, hidden: false },
        { property: 'error', name: 'Error', label: 'Error', direction: PortDirection.INPUT, type: 'text', required: false, hidden: false },
        { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.OUTPUT, type: 'text', required: false, hidden: false },
        { property: 'default', name: 'Default', label: 'Default', direction: PortDirection.OUTPUT, type: 'text', required: false, hidden: false },
      ],
    },
  },
};
