/**
 * @module for-angular/stories/graph-engine-workflow-picker
 * @summary Storybook stories for the engine workflow picker.
 * @description Covers {@link GraphEngineWorkflowPickerComponent} catalogue browsing, selection and empty/loading states.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphEngineWorkflowPickerComponent } from 'diagrams/src/lib/graph/components/graph-engine-workflow-picker/graph-engine-workflow-picker.component';
import {
  GRAPH_ENGINE_CAPABILITY_SOURCE,
  GraphEngineCapabilityService,
  GraphEngineCapabilityStore,
  type GraphEngineCapabilityManifest,
  type GraphEngineCapabilitySource,
  type GraphEngineDescriptor,
  type GraphEngineWorkflowSummary,
} from 'diagrams/src/lib/graph/capabilities';
import './setup';
import { getComponentMeta } from './utils';

const LOCAL_ENGINE: GraphEngineDescriptor = {
  engineId: 'local',
  displayName: 'Local',
  local: true,
  pinnedEngineVersion: '1.0.0',
  capabilities: [
    { feature: 'workflowList', verdict: 'SUPPORTED' },
    { feature: 'workflowRun', verdict: 'SUPPORTED' },
  ],
};

const MASTRA_ENGINE: GraphEngineDescriptor = {
  engineId: 'mastra',
  displayName: 'Mastra',
  local: false,
  pinnedEngineVersion: '0.4.2',
  capabilities: [
    { feature: 'workflowList', verdict: 'SUPPORTED' },
    { feature: 'workflowRun', verdict: 'SUPPORTED' },
  ],
};

const DAGSTER_ENGINE: GraphEngineDescriptor = {
  engineId: 'dagster',
  displayName: 'Dagster',
  local: false,
  pinnedEngineVersion: '1.7.0',
  capabilities: [
    { feature: 'workflowList', verdict: 'NOT_SUPPORTED' },
    { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
  ],
};

const READONLY_RUN_ENGINE: GraphEngineDescriptor = {
  engineId: 'local',
  displayName: 'Local',
  local: true,
  pinnedEngineVersion: '1.0.0',
  capabilities: [
    { feature: 'workflowList', verdict: 'SUPPORTED' },
    { feature: 'workflowRun', verdict: 'NOT_SUPPORTED' },
  ],
};

const MULTI_MANIFEST: GraphEngineCapabilityManifest = {
  engines: [LOCAL_ENGINE, MASTRA_ENGINE],
  defaultEngineId: 'local',
};

const SINGLE_MANIFEST: GraphEngineCapabilityManifest = {
  engines: [LOCAL_ENGINE],
  defaultEngineId: 'local',
};

const READONLY_RUN_MANIFEST: GraphEngineCapabilityManifest = {
  engines: [READONLY_RUN_ENGINE],
  defaultEngineId: 'local',
};

const DAGSTER_MANIFEST: GraphEngineCapabilityManifest = {
  engines: [DAGSTER_ENGINE],
  defaultEngineId: 'dagster',
};

const WORKFLOWS: GraphEngineWorkflowSummary[] = [
  { workflowId: 'text-pipeline-workflow', name: 'Text pipeline', updatedAt: '2026-10-14T10:00:00.000Z' },
  { workflowId: 'nightly-enrichment', name: 'Nightly enrichment', updatedAt: '2026-10-13T08:30:00.000Z' },
];

type Scenario =
  | 'populated'
  | 'empty'
  | 'loading'
  | 'failed'
  | 'degraded'
  | 'unsupported'
  | 'runBlocked'
  | 'multiEngine';

function manifestFor(scenario: Scenario): GraphEngineCapabilityManifest {
  switch (scenario) {
    case 'multiEngine':
      return MULTI_MANIFEST;
    case 'unsupported':
      return DAGSTER_MANIFEST;
    case 'runBlocked':
      return READONLY_RUN_MANIFEST;
    default:
      return SINGLE_MANIFEST;
  }
}

function fakeSource(scenario: Scenario): GraphEngineCapabilitySource {
  const manifest = manifestFor(scenario);
  return {
    fetchManifest: () => {
      if (scenario === 'loading') return new Promise<GraphEngineCapabilityManifest>(() => undefined);
      if (scenario === 'failed') return Promise.reject(new Error('graph engines backend unavailable'));
      return Promise.resolve(manifest);
    },
    fetchEngine: (engineId) =>
      Promise.resolve(manifest.engines.find((engine) => engine.engineId === engineId)),
    listWorkflows: () => {
      if (scenario === 'degraded') return Promise.reject(new Error('workflow catalogue malformed'));
      return Promise.resolve(WORKFLOWS);
    },
    getWorkflow: () => Promise.resolve(undefined),
  };
}

/**
 * Host wrapper rendering the engine/workflow picker with a fresh capability
 * store backed by a deterministic in-memory source, so every lifecycle state
 * (`loading`/`ready`/`degraded`/`failed`), the engine selector, the workflow
 * list, and the run gate can be captured without a backend.
 */
@Component({
  selector: 'story-graph-engine-picker-host',
  standalone: true,
  imports: [CommonModule, GraphEngineWorkflowPickerComponent],
  providers: [
    GraphEngineCapabilityStore,
    GraphEngineCapabilityService,
    {
      provide: GRAPH_ENGINE_CAPABILITY_SOURCE,
      useFactory: (): GraphEngineCapabilitySource => fakeSource(currentScenario),
    },
  ],
  template: `
    <div style="height: 420px; width: 100%; background: #0b1220">
      <app-graph-engine-workflow-picker [open]="open" />
    </div>
  `,
})
class GraphEnginePickerHostComponent implements OnInit {
  @Input() open = true;

  private readonly capabilities = inject(GraphEngineCapabilityService);

  ngOnInit(): void {
    void this.capabilities.load().catch(() => undefined);
    void this.capabilities.listWorkflows();
  }
}

let currentScenario: Scenario = 'populated';

const component = getComponentMeta<GraphEnginePickerHostComponent>([]);
const meta: Meta<GraphEnginePickerHostComponent> = {
  title: 'Graph/Panels/Engine Workflow Picker',
  component: GraphEnginePickerHostComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphEnginePickerHostComponent>;

function scenarioStory(scenario: Scenario): Story {
  return {
    args: { open: true },
    render: (args) => {
      currentScenario = scenario;
      return { props: args };
    },
  };
}

/** Ready: workflows listed for the single selected engine. */
export const populated: Story = scenarioStory('populated');

/** Ready but the selected engine catalogue is empty. */
export const empty: Story = scenarioStory('empty');

/** Manifest still loading (spinner). */
export const loading: Story = scenarioStory('loading');

/** Manifest load failed (backend-down notice). */
export const failed: Story = scenarioStory('failed');

/** Workflow listing degraded after a malformed response. */
export const degraded: Story = scenarioStory('degraded');

/** Selected engine does not support browsing workflows. */
export const unsupported: Story = scenarioStory('unsupported');

/** Workflows listed but the selected engine cannot run them (buttons disabled). */
export const runBlocked: Story = scenarioStory('runBlocked');

/** More than one engine advertised: the engine selector renders. */
export const multiEngine: Story = scenarioStory('multiEngine');
