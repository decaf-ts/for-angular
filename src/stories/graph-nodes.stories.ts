import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  NgDiagramComponent,
  NgDiagramNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
  type ModelAdapter,
} from 'ng-diagram';
import { GraphNodeCatalogService } from 'src/graph/catalog/GraphNodeCatalogService';
import { GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT } from 'src/graph/catalog/GraphNodeManifestSnapshot';
import { GraphNodeTemplateComponent } from 'src/graph/components/graph-node-template/graph-node-template.component';
import { buildManifestMemberNode, graphPaletteEntriesOf } from 'src/graph/utils';
import './setup';
import { getComponentMeta } from './utils';

const PALETTE = graphPaletteEntriesOf(GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT);

const CATALOG = {
  get: () => ({ parameters: [], display: { width: 140, height: 96 } }),
  status: () => 'ready',
  failure: () => null,
  reader: () => ({ all: () => [], get: () => undefined, resolve: () => undefined }),
};

const NODE_TEMPLATE_MAP = new NgDiagramNodeTemplateMap(
  PALETTE.map((entry) => [entry.kind, GraphNodeTemplateComponent] as [string, typeof GraphNodeTemplateComponent])
);

function kindsInCategory(category: string): string[] {
  return PALETTE.filter((entry) => entry.category === category).map((entry) => entry.kind);
}

@Component({
  selector: 'story-graph-nodes-host',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [
    provideNgDiagram(),
    { provide: GraphNodeCatalogService, useValue: CATALOG },
  ],
  template: `
    <div style="height: 460px; width: 100%">
      @if (model(); as graphModel) {
        <ng-diagram [model]="graphModel" [nodeTemplateMap]="nodeTemplateMap" />
      }
    </div>
  `,
})
class GraphNodesHostComponent implements OnInit {
  @Input() kinds: string[] = [];

  readonly nodeTemplateMap = NODE_TEMPLATE_MAP;
  readonly model = signal<ModelAdapter | null>(null);

  ngOnInit(): void {
    const entries = PALETTE.filter((entry) => this.kinds.includes(entry.kind));
    const nodes = entries.map((entry, index) => {
      const blueprint = buildManifestMemberNode(entry, index, `${entry.kind}-1`);
      return {
        id: blueprint.id,
        type: blueprint.type,
        position: blueprint.position,
        size: blueprint.size,
        resizable: blueprint.resizable,
        draggable: blueprint.draggable,
        autoSize: blueprint.autoSize,
        data: blueprint.data,
      };
    });
    this.model.set(
      initializeModel({
        nodes,
        edges: [],
        metadata: { viewport: { x: 0, y: 0, scale: 0.7 } },
      })
    );
  }
}

const nodeComponent = getComponentMeta<GraphNodesHostComponent>([]);
const nodeMeta: Meta<GraphNodesHostComponent> = {
  title: 'Graph/Nodes/Node Catalog',
  component: GraphNodesHostComponent,
  ...nodeComponent,
  argTypes: {
    ...nodeComponent.argTypes,
    kinds: { control: false, table: { disable: true } },
  },
};
export default nodeMeta;
type NodeStory = StoryObj<GraphNodesHostComponent>;

export const agent: NodeStory = { args: { kinds: kindsInCategory('Agent') } };
export const flowControl: NodeStory = { args: { kinds: kindsInCategory('Flow Control') } };
export const loops: NodeStory = { args: { kinds: kindsInCategory('Loop') } };
export const triggers: NodeStory = { args: { kinds: kindsInCategory('Trigger') } };
export const utility: NodeStory = { args: { kinds: kindsInCategory('Utility') } };
