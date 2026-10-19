/**
 * @module for-angular/stories/graph-ghost-node-template
 * @summary Storybook stories for the ghost (drag-preview) node template.
 * @description Covers {@link GraphGhostNodeTemplateComponent} palette drag previews across node kinds.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  NgDiagramComponent,
  NgDiagramNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
  type ModelAdapter,
} from 'ng-diagram';
import { GraphGhostNodeTemplateComponent } from 'diagrams/src/lib/graph/components/graph-ghost-node-template/graph-ghost-node-template.component';
import { ghostNodeStore } from 'diagrams/src/lib/graph/execution/GhostNodeStore';
import type { GraphRendererNodeData } from 'diagrams/src/lib/graph/types';
import './setup';
import { getComponentMeta } from './utils';

const LOOP_ID = 'loop-1';
const GHOST_ID = 'ghost-loop-1';

function ghostData(): GraphRendererNodeData {
  return {
    title: 'Add node',
    description: 'Click + to add a node to the loop body',
    kind: 'graph.ghost',
    labels: [],
    ports: [],
    sourceClass: 'GraphGhostNode',
    ghostParentId: LOOP_ID,
    isGhost: true,
    expanded: false,
  };
}

/**
 * Host wrapper rendering the loop-body ghost node inside an `ng-diagram`
 * canvas. The `hasLoopBody`/`hovered` inputs drive the store state that
 * decides whether the ghost is always visible (empty loop) or faded out until
 * the loop (or the ghost itself) is hovered.
 */
@Component({
  selector: 'story-graph-ghost-node-host',
  standalone: true,
  imports: [CommonModule, NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `
    <div style="height: 260px; width: 100%; background: #0b1220">
      @if (model(); as graphModel) {
        <ng-diagram [model]="graphModel" [nodeTemplateMap]="nodeTemplateMap" />
      }
    </div>
  `,
})
class GraphGhostNodeHostComponent implements OnInit, OnDestroy {
  @Input() hasLoopBody = false;
  @Input() hovered = false;

  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['graph.ghost', GraphGhostNodeTemplateComponent],
  ]);
  readonly model = signal<ModelAdapter | null>(null);

  ngOnInit(): void {
    ghostNodeStore.clear();
    ghostNodeStore.setLoopBodyIds(this.hasLoopBody ? [LOOP_ID] : []);
    ghostNodeStore.hoveredLoopId.set(this.hovered ? LOOP_ID : null);
    this.model.set(
      initializeModel({
        nodes: [
          {
            id: GHOST_ID,
            type: 'graph.ghost',
            position: { x: 60, y: 60 },
            size: { width: 56, height: 56 },
            data: ghostData(),
          },
        ],
        edges: [],
        metadata: { viewport: { x: 0, y: 0, scale: 1 } },
      })
    );
  }

  ngOnDestroy(): void {
    ghostNodeStore.clear();
  }
}

const component = getComponentMeta<GraphGhostNodeHostComponent>([]);
const meta: Meta<GraphGhostNodeHostComponent> = {
  title: 'Graph/Nodes/Ghost Node Template',
  component: GraphGhostNodeHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphGhostNodeHostComponent>;

/** Empty loop: the ghost is the always-visible add-node anchor. */
export const activeEmptyLoop: Story = {
  args: { hasLoopBody: false },
};

/** Populated loop, not hovered: the ghost fades out (`--muted`). */
export const mutedWithLoopBody: Story = {
  args: { hasLoopBody: true, hovered: false },
};

/** Populated loop, hovered: the ghost is revealed again as the insertion anchor. */
export const revealedOnHover: Story = {
  args: { hasLoopBody: true, hovered: true },
};
