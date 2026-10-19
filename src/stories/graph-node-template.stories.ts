/**
 * @module for-angular/stories/graph-node-template
 * @summary Storybook stories for the graph member node template.
 * @description Covers {@link GraphNodeTemplateComponent} across selection, run status, ports and node kinds from the served catalogue.
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
import { GraphNodeTemplateComponent } from 'src/graph/components/graph-node-template/graph-node-template.component';
import { GraphWorkflowDocumentStore } from 'src/graph/document/GraphWorkflowDocumentStore';
import { graphExecutionState } from 'src/graph/execution/GraphExecutionStateService';
import { graphSelection } from 'src/graph/execution/GraphSelectionStore';
import { graphValidity } from 'src/graph/validation/GraphWorkflowValidityStore';
import type { GraphDemoNodeData } from 'src/graph/types';
import './setup';
import { getComponentMeta } from './utils';

const BASE_PORTS = [
  { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.INPUT, type: 'text', required: true, hidden: false },
  { property: 'count', name: 'Count', label: 'Count', direction: PortDirection.INPUT, type: 'number', required: false, hidden: false },
  { property: 'result', name: 'Result', label: 'Result', direction: PortDirection.OUTPUT, type: 'text', required: true, hidden: false },
];

function nodeDataOf(overrides: Partial<GraphDemoNodeData> = {}): GraphDemoNodeData {
  return {
    title: 'Code',
    description: 'Runs a JavaScript snippet',
    kind: 'core.utility.code',
    category: 'Utility',
    labels: ['transform'],
    sourceClass: 'CodeGraphNode',
    ports: BASE_PORTS as GraphDemoNodeData['ports'],
    ...overrides,
  };
}

const CATALOG = {
  get: () => ({
    parameters: [{ id: 'timeoutMs', label: 'Timeout (ms)', parameterType: 'textinput', value: '5000' }],
    display: { width: 140, height: 96 },
  }),
  status: () => 'ready',
  failure: () => null,
  reader: () => ({ all: () => [], get: () => undefined, resolve: () => undefined }),
};

@Component({
  selector: 'story-graph-node-template-host',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [
    provideNgDiagram(),
    { provide: GraphNodeCatalogService, useValue: CATALOG },
  ],
  template: `
    <div style="height: 420px; width: 100%">
      @if (model(); as graphModel) {
        <ng-diagram [model]="graphModel" [nodeTemplateMap]="nodeTemplateMap" />
      }
    </div>
  `,
})
class GraphNodeTemplateHostComponent implements OnInit, OnDestroy {
  @Input() nodeData: GraphDemoNodeData = nodeDataOf();
  @Input() selected = false;
  @Input() executionStatus: string | null = null;
  @Input() invalid = false;
  @Input() pinned = false;
  @Input() withDocument = true;

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['core.utility.code', GraphNodeTemplateComponent],
  ]);
  readonly model = signal<ModelAdapter | null>(null);

  private readonly documentStore = new GraphWorkflowDocumentStore();

  ngOnInit(): void {
    const data = this.nodeData;
    this.model.set(
      initializeModel({
        nodes: [
          { id: 'n1', type: data.kind, position: { x: 40, y: 40 }, data, size: { width: 140, height: 96 } },
        ],
        edges: [],
        metadata: { viewport: { x: 0, y: 0, scale: 1 } },
      })
    );

    if (this.withDocument) {
      this.documentStore.initialize({
        id: 'demo-workflow',
        name: 'Demo workflow',
        inputs: [],
        outputs: [],
        nodes: [
          {
            id: 'n1',
            kind: data.kind,
            label: data.title,
            parameters: {},
            ...(this.pinned ? { pinned: { parameters: {} } } : {}),
          },
        ],
        edges: [],
      });
    }

    if (this.selected) graphSelection.setSelected(['n1']);
    if (this.executionStatus) {
      graphExecutionState.setNodeState('n1', { status: this.executionStatus } as never);
    }
    if (this.invalid) {
      graphValidity.issues.set([{ code: 'missing-input', path: 'nodes[0].inputs.value', message: 'Required input is not connected', nodeId: 'n1' }]);
      graphValidity.status.set('invalid');
    }
  }

  ngOnDestroy(): void {
    graphSelection.clear();
    graphExecutionState.reset();
    graphValidity.reset();
    this.documentStore.reset();
  }
}

const component = getComponentMeta<GraphNodeTemplateHostComponent>([]);
const meta: Meta<GraphNodeTemplateHostComponent> = {
  title: 'Graph/Nodes/Node Template',
  component: GraphNodeTemplateHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    nodeData: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphNodeTemplateHostComponent>;

export const defaultFace: Story = {
  args: { nodeData: nodeDataOf() },
};

export const selectedFace: Story = {
  args: { nodeData: nodeDataOf(), selected: true },
};

export const pinnedFace: Story = {
  args: { nodeData: nodeDataOf({ pinnable: true }), pinned: true },
};

export const invalidFace: Story = {
  args: { nodeData: nodeDataOf(), invalid: true },
};

export const runningFace: Story = {
  args: { nodeData: nodeDataOf(), executionStatus: 'running' },
};

export const succeededFace: Story = {
  args: { nodeData: nodeDataOf(), executionStatus: 'succeeded' },
};

export const failedFace: Story = {
  args: { nodeData: nodeDataOf(), executionStatus: 'failed' },
};

export const skippedFace: Story = {
  args: { nodeData: nodeDataOf(), executionStatus: 'skipped' },
};

export const iconSilhouetteFallback: Story = {
  args: {
    nodeData: nodeDataOf({ title: 'Foreach', kind: 'core.utility.code', iconReference: undefined }),
  },
};

export const catalogueIcon: Story = {
  args: {
    nodeData: nodeDataOf({
      iconReference: { type: 'catalogue', name: 'ti-repeat' },
    }),
  },
};

export const urlIcon: Story = {
  args: {
    nodeData: nodeDataOf({
      iconReference: { type: 'url', url: 'https://example.test/icon.svg' },
    }),
  },
};

export const valueBoundPort: Story = {
  args: {
    nodeData: nodeDataOf({
      ports: [
        { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.INPUT, type: 'text', required: true, hidden: false },
        { property: 'count', name: 'Count', label: 'Count', direction: PortDirection.INPUT, type: 'number', required: false, hidden: false },
        { property: 'result', name: 'Result', label: 'Result', direction: PortDirection.OUTPUT, type: 'text', required: true, hidden: false },
      ] as GraphDemoNodeData['ports'],
    }),
  },
};

export const blockedFace: Story = {
  args: { nodeData: nodeDataOf(), executionStatus: 'blocked' },
};

export const cachedFace: Story = {
  args: { nodeData: nodeDataOf(), executionStatus: 'cached' },
};

export const squareShape: Story = {
  args: { nodeData: nodeDataOf({ shape: 'square' }) },
};

export const pillShape: Story = {
  args: { nodeData: nodeDataOf({ shape: 'pill' }) },
};

export const sharpCorners: Story = {
  args: { nodeData: nodeDataOf({ cornerRadius: 0 }) },
};

export const largeCornerRadius: Story = {
  args: { nodeData: nodeDataOf({ cornerRadius: 28 }) },
};

export const connectionPorts: Story = {
  args: {
    nodeData: nodeDataOf({
      title: 'Agent',
      kind: 'core.utility.code',
      ports: [
        { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.INPUT, type: 'text', required: true, hidden: false },
        { property: 'result', name: 'Result', label: 'Result', direction: PortDirection.OUTPUT, type: 'text', required: true, hidden: false },
        { property: 'model', name: 'Model', label: 'Model', direction: PortDirection.CONNECTION, required: false, hidden: false, graph: { direction: PortDirection.CONNECTION, category: 'model' } },
        { property: 'memory', name: 'Memory', label: 'Memory', direction: PortDirection.CONNECTION, required: false, hidden: false, graph: { direction: PortDirection.CONNECTION, category: 'memory' } },
        { property: 'workspace', name: 'Workspace', label: 'Workspace', direction: PortDirection.CONNECTION, required: false, hidden: false, graph: { direction: PortDirection.CONNECTION, category: 'workspace' } },
      ] as GraphDemoNodeData['ports'],
    }),
  },
};

export const switchNodeWithCases: Story = {
  args: {
    nodeData: nodeDataOf({
      title: 'Switch',
      description: 'Routes the input to the first matching case',
      kind: 'core.utility.code',
      ports: [
        { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.INPUT, type: 'text', required: true, hidden: false },
        { property: 'case_a', name: 'Case A', label: 'Case A', direction: PortDirection.OUTPUT, required: false, hidden: false, path: 'case_a' },
        { property: 'case_b', name: 'Case B', label: 'Case B', direction: PortDirection.OUTPUT, required: false, hidden: false, path: 'case_b' },
        { property: 'default', name: 'Default', label: 'Default', direction: PortDirection.OUTPUT, required: false, hidden: false, path: 'default' },
      ] as GraphDemoNodeData['ports'],
      switchMetadata: {
        cases: [
          { id: 'a', label: 'Case A', condition: { left: 'value', operator: 'eq', right: 'a' } as never, outputPort: 'case_a' },
          { id: 'b', label: 'Case B', condition: { left: 'value', operator: 'eq', right: 'b' } as never, outputPort: 'case_b' },
        ],
        defaultPort: 'default',
        hasDefault: true,
      },
    }),
  },
};

export const switchNodeNoDefault: Story = {
  args: {
    nodeData: nodeDataOf({
      title: 'Switch',
      description: 'No default branch configured',
      kind: 'core.utility.code',
      ports: [
        { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.INPUT, type: 'text', required: true, hidden: false },
        { property: 'case_a', name: 'Case A', label: 'Case A', direction: PortDirection.OUTPUT, required: false, hidden: false, path: 'case_a' },
        { property: 'default', name: 'Default', label: 'Default', direction: PortDirection.OUTPUT, required: false, hidden: false, path: 'default' },
      ] as GraphDemoNodeData['ports'],
      switchMetadata: {
        cases: [
          { id: 'a', label: 'Case A', condition: { left: 'value', operator: 'eq', right: 'a' } as never, outputPort: 'case_a' },
        ],
        defaultPort: 'default',
        hasDefault: false,
      },
    }),
  },
};
