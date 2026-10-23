/**
 * @module for-angular/stories/graph-edge-template
 * @summary Storybook stories for the graph edge template.
 * @description Covers {@link GraphEdgeTemplateComponent} edge rendering across selection and data/control edge kinds.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { PortDirection } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  NgDiagramComponent,
  NgDiagramEdgeTemplateMap,
  NgDiagramNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
  type ModelAdapter,
} from 'ng-diagram';
import { GraphNodeCatalogService } from 'src/diagrams/components/graph/catalog/GraphNodeCatalogService';
import { GraphEdgeTemplateComponent } from 'src/diagrams/components/graph/components/graph-edge-template/graph-edge-template.component';
import { GraphNodeTemplateComponent } from 'src/diagrams/components/graph/components/graph-node-template/graph-node-template.component';
import { graphExecutionState } from 'src/diagrams/components/graph/execution/GraphExecutionStateService';
import type { GraphRendererNodeData } from 'src/diagrams/components/graph/types';
import './setup';
import { getComponentMeta } from './utils';

const NODE_TYPE = 'demo.node';
const EDGE_ID = 'edge-1';
const ENGINE_EDGE_ID = 'source:result->target:value';

const CATALOG = {
  get: () => ({ parameters: [], display: { width: 120, height: 80 } }),
  status: () => 'ready',
  failure: () => null,
  reader: () => ({ all: () => [], get: () => undefined, resolve: () => undefined }),
};

function nodeData(id: string, title: string): GraphRendererNodeData {
  return {
    title,
    description: title,
    kind: NODE_TYPE,
    labels: [],
    sourceClass: 'DemoNode',
    ports: [
      { property: 'value', name: 'Value', label: 'Value', direction: PortDirection.INPUT, type: 'text', required: false, hidden: false },
      { property: 'result', name: 'Result', label: 'Result', direction: PortDirection.OUTPUT, type: 'text', required: false, hidden: false },
    ],
  };
}

/**
 * Host wrapper rendering a single labelled edge through the custom
 * `graph-edge` template inside an `ng-diagram` canvas. The `state` input seeds
 * the shared execution store keyed by the engine plan-edge id so every visual
 * run state (`running`/`blocked`/`succeeded`/`failed`/`skipped`) is captured.
 */
@Component({
  selector: 'story-graph-edge-template-host',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [
    provideNgDiagram(),
    { provide: GraphNodeCatalogService, useValue: CATALOG },
  ],
  template: `
    <div style="height: 300px; width: 100%; background: #0b1220">
      @if (model(); as graphModel) {
        <ng-diagram
          [model]="graphModel"
          [nodeTemplateMap]="nodeTemplateMap"
          [edgeTemplateMap]="edgeTemplateMap"
        />
      }
    </div>
  `,
})
class GraphEdgeTemplateHostComponent implements OnInit, OnDestroy {
  @Input() state: string | null = null;
  @Input() label: string | null = 'result';
  @Input() positionOnEdge: number | null = null;

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    [NODE_TYPE, GraphNodeTemplateComponent],
  ]);
  readonly edgeTemplateMap = new NgDiagramEdgeTemplateMap([
    ['graph-edge', GraphEdgeTemplateComponent],
  ]);
  readonly model = signal<ModelAdapter | null>(null);

  ngOnInit(): void {
    graphExecutionState.reset();
    if (this.state) {
      graphExecutionState.setEdgeState(ENGINE_EDGE_ID, { status: this.state });
    }
    this.model.set(
      initializeModel({
        nodes: [
          { id: 'n1', type: NODE_TYPE, position: { x: 20, y: 90 }, size: { width: 120, height: 80 }, data: nodeData('n1', 'Source') },
          { id: 'n2', type: NODE_TYPE, position: { x: 320, y: 90 }, size: { width: 120, height: 80 }, data: nodeData('n2', 'Target') },
        ],
        edges: [
          {
            id: EDGE_ID,
            type: 'graph-edge',
            source: 'n1',
            sourcePort: 'result',
            target: 'n2',
            targetPort: 'value',
            data: {
              label: this.label ?? undefined,
              positionOnEdge: this.positionOnEdge ?? undefined,
              engineEdgeId: ENGINE_EDGE_ID,
            },
          },
        ],
        metadata: { viewport: { x: 0, y: 0, scale: 1 } },
      })
    );
  }

  ngOnDestroy(): void {
    graphExecutionState.reset();
  }
}

const component = getComponentMeta<GraphEdgeTemplateHostComponent>([]);
const meta: Meta<GraphEdgeTemplateHostComponent> = {
  title: 'Graph/Edges/Edge Template',
  component: GraphEdgeTemplateHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphEdgeTemplateHostComponent>;

/** No run state: the default edge stroke. */
export const defaultEdge: Story = {
  args: { state: null, label: 'result' },
};

/** Edge currently executing (faded green). */
export const running: Story = {
  args: { state: 'running' },
};

/** Edge waiting on upstream nodes (faded yellow). */
export const blocked: Story = {
  args: { state: 'blocked' },
};

/** Edge carried its value successfully (green). */
export const succeeded: Story = {
  args: { state: 'succeeded' },
};

/** Edge's run failed (red, thickened stroke). */
export const failed: Story = {
  args: { state: 'failed' },
};

/** Edge was not executed after a failed run (faded). */
export const skipped: Story = {
  args: { state: 'skipped' },
};

/** Unlabelled edge (no label element rendered). */
export const unlabelled: Story = {
  args: { state: null, label: null },
};

/** Label anchored near the source (`positionOnEdge` override). */
export const labelNearSource: Story = {
  args: { state: null, label: 'lines', positionOnEdge: 0.15 },
};
