/**
 * @module for-angular/stories/graph-renderer
 * @summary Storybook stories for the graph canvas renderer.
 * @description Covers {@link GraphRendererComponent} with a demo workflow: canvas model build, run-form input ports (G1/SAA-783) and snapshot restore.
 */
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { TextPipelineWorkflow } from 'src/app/pages/graph/workflow-root';
import { GraphNodeCatalogService } from 'src/diagrams/components/graph/catalog/GraphNodeCatalogService';
import { GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT } from 'src/diagrams/components/graph/catalog/GraphNodeManifestSnapshot';
import { GraphRendererComponent } from 'src/diagrams/components/graph/components/graph-renderer/graph-renderer.component';
import type {
  GraphInspectionRunState,
  GraphRunValidationIssue,
} from 'src/diagrams/components/graph/components/graph-node-inspection/graph-node-inspection.component';
import { GraphWorkflowDocumentStore } from 'src/diagrams/components/graph/document/GraphWorkflowDocumentStore';
import { GRAPH_DEV_MODE } from 'src/diagrams/components/graph/tokens/graph-configuration.tokens';
import './setup';
import { getComponentMeta } from './utils';

const MANIFESTS = GRAPH_BUILT_IN_NODE_MANIFEST_SNAPSHOT;
const byKind = (kind: string) => MANIFESTS.find((manifest) => manifest.kind === kind);

/** Story-scoped catalogue/dev-mode overrides read by the host providers. */
const storyConfig = {
  catalogStatus: 'ready',
  catalogFailure: null as unknown,
  devMode: false,
};

function resetStoryConfig(): void {
  storyConfig.catalogStatus = 'ready';
  storyConfig.catalogFailure = null;
  storyConfig.devMode = false;
}

function catalogMock() {
  return {
    manifests: signal(MANIFESTS),
    status: signal(storyConfig.catalogStatus),
    failure: signal(storyConfig.catalogFailure),
    reader: () => ({
      all: () => MANIFESTS,
      get: byKind,
      resolve: (instance: { kind: string }) => byKind(instance.kind),
    }),
    get: byKind,
    load: async () => undefined,
    refresh: async () => undefined,
  };
}

/**
 * Host wrapper for {@link GraphRendererComponent}: mounts the demo workflow
 * canvas with a fresh document store and an in-memory node catalogue, so the
 * canvas, the add-node palette, the catalogue lifecycle states, and the run
 * result panes can each be captured deterministically.
 */
@Component({
  selector: 'story-graph-renderer-host',
  standalone: true,
  imports: [CommonModule, GraphRendererComponent],
  providers: [
    GraphWorkflowDocumentStore,
    { provide: GraphNodeCatalogService, useFactory: catalogMock },
    { provide: GRAPH_DEV_MODE, useFactory: () => storyConfig.devMode },
  ],
  template: `
    <div style="height: 560px; width: 100%; background: #0b1220">
      <app-graph-renderer
        [graphRoot]="graphRoot"
        [availableNodes]="manifests"
        [runResultState]="runResultState"
        [validationIssues]="validationIssues"
      />
    </div>
  `,
})
class GraphRendererHostComponent implements AfterViewInit {
  @Input() runResultState: GraphInspectionRunState = 'idle';
  @Input() validationIssues: GraphRunValidationIssue[] = [];
  @Input() openPalette = false;
  @Input() paletteQuery = '';

  readonly graphRoot = TextPipelineWorkflow;
  readonly manifests = MANIFESTS;

  @ViewChild(GraphRendererComponent) private renderer?: GraphRendererComponent;

  ngAfterViewInit(): void {
    if (this.openPalette) {
      this.renderer?.togglePalette();
      if (this.paletteQuery) this.renderer?.onPaletteQueryChange(this.paletteQuery);
    }
  }
}

const component = getComponentMeta<GraphRendererHostComponent>([]);
const meta: Meta<GraphRendererHostComponent> = {
  title: 'Graph/Canvas/Renderer',
  component: GraphRendererHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphRendererHostComponent>;

function render(
  args: Partial<GraphRendererHostComponent>,
  config: Partial<typeof storyConfig> = {}
): Story {
  return {
    args,
    render: (storyArgs) => {
      resetStoryConfig();
      Object.assign(storyConfig, config);
      return { props: storyArgs };
    },
  };
}

/** The demo `TextPipelineWorkflow` rendered on the canvas (edit mode). */
export const defaultCanvas: Story = render({});

/** Add-node palette opened over the canvas. */
export const paletteOpen: Story = render({ openPalette: true });

/** Add-node palette with a search query that matches no catalogue entry. */
export const paletteSearchEmpty: Story = render({ openPalette: true, paletteQuery: 'zzzz-no-match' });

/** Catalogue still loading: the palette reports the loading state. */
export const catalogueLoading: Story = render({}, { catalogStatus: 'loading' });

/** Catalogue degraded: built-in nodes only, with a backend-unavailable notice. */
export const catalogueDegraded: Story = render(
  {},
  { catalogStatus: 'degraded', catalogFailure: { kind: 'backend-down', message: 'catalogue backend unavailable' } }
);

/** Catalogue failed: structured failure message with a retry affordance. */
export const catalogueFailed: Story = render(
  {},
  { catalogStatus: 'failed', catalogFailure: { kind: 'malformed-response', message: 'catalogue returned an unexpected payload' } }
);

/** Run result still being fetched: the split view shows the pending pane. */
export const runResultPending: Story = render({ runResultState: 'pending' });

/** Run result ready: the split view shows node inputs/outputs. */
export const runResultReady: Story = render({ runResultState: 'ready' });

/** Run result fetch failed: the split view shows the retry affordance. */
export const runResultFailed: Story = render({ runResultState: 'failed' });

/** Graph invalid: structured validation issues are surfaced on the canvas. */
export const invalidWithIssues: Story = render({
  validationIssues: [
    { path: 'nodes[0].inputs.value', message: 'Required input is not connected', code: 'missing-input' },
  ],
});

/** Developer mode: the raw snapshot textarea renders. */
export const devModeSnapshot: Story = render({}, { devMode: true });
