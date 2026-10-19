/**
 * @module for-angular/stories/graph-node-inspection
 * @summary Storybook stories for the node inspection split view.
 * @description Covers {@link GraphNodeInspectionComponent} with its inputs/outputs panes, per-node I/O payloads and error rendering.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PortDirection, GraphVisualState, type GraphNodeInspectionPayload } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgDiagramModelService, type Node } from 'ng-diagram';
import { GraphNodeCatalogService } from 'diagrams/src/lib/graph/catalog/GraphNodeCatalogService';
import {
  GraphNodeInspectionComponent,
  type GraphInspectionRunState,
  type GraphRunValidationIssue,
} from 'diagrams/src/lib/graph/components/graph-node-inspection/graph-node-inspection.component';
import { graphInspection } from 'diagrams/src/lib/graph/execution/GraphInspectionStore';
import type { GraphDemoNodeData } from 'diagrams/src/lib/graph/types';
import './setup';
import { getComponentMeta } from './utils';

const CODE_DATA: GraphDemoNodeData = {
  title: 'Code',
  description: 'Runs a snippet of JavaScript',
  kind: 'core.utility.code',
  labels: [],
  sourceClass: 'CodeGraphNode',
  ports: [
    { property: 'code', name: 'Code', label: 'Code', direction: PortDirection.INPUT, type: 'code', required: true, hidden: false },
    { property: 'result', name: 'Result', label: 'Result', direction: PortDirection.OUTPUT, type: 'text', required: true, hidden: false },
  ],
};

const BOUNDARY_INPUT_DATA: GraphDemoNodeData = {
  title: 'Text',
  description: 'Workflow input',
  kind: 'core.boundary.input',
  labels: [],
  sourceClass: 'WorkflowInputBoundary',
  ports: [],
  role: 'input',
  property: 'text',
} as GraphDemoNodeData;

const BOUNDARY_OUTPUT_DATA: GraphDemoNodeData = {
  title: 'Result',
  description: 'Workflow output',
  kind: 'core.boundary.output',
  labels: [],
  sourceClass: 'WorkflowOutputBoundary',
  ports: [],
  role: 'output',
  property: 'result',
} as GraphDemoNodeData;

const NODES: Node<GraphDemoNodeData>[] = [
  { id: 'code-1', position: { x: 0, y: 0 }, type: 'core.utility.code', data: CODE_DATA },
  { id: 'input-text', position: { x: 0, y: 0 }, type: 'core.boundary.input', data: BOUNDARY_INPUT_DATA },
  { id: 'output-result', position: { x: 0, y: 0 }, type: 'core.boundary.output', data: BOUNDARY_OUTPUT_DATA },
];

const CATALOG = {
  get: (kind: string) =>
    kind === 'core.utility.code'
      ? {
          parameters: [
            { id: 'timeoutMs', label: 'Timeout (ms)', parameterType: 'textinput', value: '5000' },
            { id: 'strict', label: 'Strict mode', parameterType: 'boolean', value: true },
          ],
          display: { width: 96, height: 96 },
        }
      : { parameters: [], display: { width: 96, height: 96 } },
  status: () => 'ready',
  failure: () => null,
};

@Component({
  selector: 'story-graph-node-inspection-host',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GraphNodeInspectionComponent],
  providers: [
    {
      provide: NgDiagramModelService,
      useValue: {
        nodes: () => NODES,
        edges: () => [],
        metadata: () => ({ viewport: { scale: 1 } }),
      },
    },
    { provide: GraphNodeCatalogService, useValue: CATALOG },
  ],
  template: `
    <div style="height: 420px; display: flex; flex-direction: column">
      <app-graph-node-inspection
        [runState]="runState"
        [validationIssues]="validationIssues"
        [workflowInputForm]="workflowInputForm"
        [workflowInputFields]="workflowInputFields"
      />
    </div>
  `,
})
class GraphNodeInspectionHostComponent implements OnInit, OnDestroy {
  @Input() runState: GraphInspectionRunState = 'ready';
  @Input() validationIssues: GraphRunValidationIssue[] = [];
  @Input() nodeId = 'code-1';
  @Input() payload: GraphNodeInspectionPayload | null = null;
  @Input() workflowInputForm: FormGroup | null = null;
  @Input() workflowInputFields: never[] = [];

  ngOnInit(): void {
    graphInspection.reset();
    graphInspection.open(this.nodeId);
    if (this.payload) graphInspection.set(this.payload);
  }

  ngOnDestroy(): void {
    graphInspection.reset();
  }
}

const component = getComponentMeta<GraphNodeInspectionHostComponent>([]);
const meta: Meta<GraphNodeInspectionHostComponent> = {
  title: 'Graph/Modals/Node Inspection Split View',
  component: GraphNodeInspectionHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    payload: { control: false, table: { disable: true } },
    workflowInputForm: { control: false, table: { disable: true } },
    workflowInputFields: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphNodeInspectionHostComponent>;

export const memberWithRunPayload: Story = {
  args: {
    nodeId: 'code-1',
    runState: 'ready',
    payload: {
      runId: 'run-42',
      workflowId: 'demo-workflow',
      nodeId: 'code-1',
      state: GraphVisualState.SUCCEEDED,
      inputs: { code: 'return $input.value * 2;', value: 21 },
      outputs: { result: 42 },
    },
  },
};

export const memberWithoutPayload: Story = {
  args: { nodeId: 'code-1', runState: 'pending' },
};

export const memberFailedRun: Story = {
  args: {
    nodeId: 'code-1',
    runState: 'failed',
    validationIssues: [
      { path: 'nodes[0].inputs.value', message: 'Required input is not connected', code: 'missing-input' },
    ],
  },
};

export const memberFailedNode: Story = {
  args: {
    nodeId: 'code-1',
    runState: 'ready',
    payload: {
      runId: 'run-42',
      workflowId: 'demo-workflow',
      nodeId: 'code-1',
      state: GraphVisualState.FAILED,
      inputs: { value: null },
      error: { name: 'GraphNodeError', message: 'Code node failed: value is not a number' },
    },
  },
};

export const boundaryInput: Story = {
  args: {
    nodeId: 'input-text',
    runState: 'idle',
    workflowInputForm: new FormGroup({ text: new FormControl('hello world') }),
    workflowInputFields: [
      { property: 'text', path: 'text', label: 'Text', controlName: 'text', controlType: 'text' },
    ] as never[],
  },
};

export const boundaryOutput: Story = {
  args: {
    nodeId: 'output-result',
    runState: 'ready',
    payload: {
      runId: 'run-42',
      workflowId: 'demo-workflow',
      nodeId: 'output-result',
      state: GraphVisualState.SUCCEEDED,
      inputs: { result: 42 },
      outputs: { result: 42 },
    },
  },
};

export const memberIdle: Story = {
  args: { nodeId: 'code-1', runState: 'idle' },
};

export const memberRunningBadge: Story = {
  args: {
    nodeId: 'code-1',
    runState: 'ready',
    payload: {
      runId: 'run-42',
      workflowId: 'demo-workflow',
      nodeId: 'code-1',
      state: GraphVisualState.RUNNING,
      inputs: { value: 21 },
    },
  },
};

export const memberBlockedBadge: Story = {
  args: {
    nodeId: 'code-1',
    runState: 'ready',
    payload: {
      runId: 'run-42',
      workflowId: 'demo-workflow',
      nodeId: 'code-1',
      state: GraphVisualState.BLOCKED,
      inputs: { value: 21 },
    },
  },
};

export const memberSkippedBadge: Story = {
  args: {
    nodeId: 'code-1',
    runState: 'ready',
    payload: {
      runId: 'run-42',
      workflowId: 'demo-workflow',
      nodeId: 'code-1',
      state: GraphVisualState.SKIPPED,
      inputs: { value: 21 },
    },
  },
};

export const memberPendingNoPayload: Story = {
  args: { nodeId: 'code-1', runState: 'pending' },
};

export const memberReadyNoPayload: Story = {
  args: { nodeId: 'code-1', runState: 'ready' },
};
