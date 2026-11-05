/**
 * @module for-angular/stories/workflow-list
 * @summary Storybook stories for the `/workflows` catalog page.
 * @description Covers {@link WorkflowListPage} capability-aware listing of the served engine catalog (A2: `/workflows` is the catalog), including read-only engines and the authoring-gated create action.
 */
import type { Meta, StoryObj } from '@storybook/angular';
import { WorkflowListPage } from 'src/app/pages/graph/list/workflow-list.page';
import { GraphListService } from 'src/app/services/graph-list/graph-list.service';
import {
  GRAPH_ENGINE_CAPABILITY_SOURCE,
  GraphEngineCapabilityService,
  GraphEngineCapabilityStore,
  type GraphEngineCapabilityManifest,
  type GraphEngineCapabilitySource,
  type GraphEngineDescriptor,
  type GraphEngineWorkflowSummary,
} from 'src/diagrams/components/graph/capabilities';
import './setup';
import { getComponentMeta } from './utils';

const LOCAL_ENGINE: GraphEngineDescriptor = {
  engineId: 'local',
  displayName: 'Local',
  local: true,
  pinnedEngineVersion: '1.0.0',
  capabilities: [
    { feature: 'workflowList', verdict: 'SUPPORTED' },
    { feature: 'workflowCreate', verdict: 'SUPPORTED' },
    { feature: 'workflowRun', verdict: 'SUPPORTED' },
  ],
};

const READONLY_ENGINE: GraphEngineDescriptor = {
  engineId: 'dagster',
  displayName: 'Dagster',
  local: false,
  pinnedEngineVersion: '1.7.0',
  capabilities: [
    { feature: 'workflowList', verdict: 'NOT_SUPPORTED' },
    { feature: 'workflowCreate', verdict: 'NOT_SUPPORTED' },
  ],
};

const MASTRA_ENGINE: GraphEngineDescriptor = {
  engineId: 'mastra',
  displayName: 'Mastra',
  local: false,
  pinnedEngineVersion: '0.4.2',
  capabilities: [{ feature: 'workflowList', verdict: 'SUPPORTED' }],
};

const WORKFLOW_ROWS: GraphEngineWorkflowSummary[] = [
  { workflowId: 'text-pipeline-workflow', name: 'Text pipeline', updatedAt: '2026-10-14T10:00:00.000Z' },
  { workflowId: 'nightly-enrichment', name: 'Nightly enrichment', updatedAt: '2026-10-13T08:30:00.000Z' },
];

type Scenario = 'catalogue' | 'legacy' | 'failed' | 'multiEngine' | 'createBlocked' | 'empty';

const scenarios: Record<Scenario, GraphEngineCapabilityManifest> = {
  catalogue: { engines: [LOCAL_ENGINE], defaultEngineId: 'local' },
  legacy: { engines: [READONLY_ENGINE], defaultEngineId: 'dagster' },
  failed: { engines: [LOCAL_ENGINE], defaultEngineId: 'local' },
  multiEngine: { engines: [LOCAL_ENGINE, MASTRA_ENGINE], defaultEngineId: 'local' },
  createBlocked: { engines: [READONLY_ENGINE], defaultEngineId: 'dagster' },
  empty: { engines: [LOCAL_ENGINE], defaultEngineId: 'local' },
};

let currentScenario: Scenario = 'catalogue';

function fakeSource(scenario: Scenario): GraphEngineCapabilitySource {
  const manifest = scenarios[scenario];
  return {
    fetchManifest: () =>
      scenario === 'failed'
        ? Promise.reject(new Error('graph engines backend unavailable'))
        : Promise.resolve(manifest),
    fetchEngine: (engineId) =>
      Promise.resolve(manifest.engines.find((engine) => engine.engineId === engineId)),
    listWorkflows: () => Promise.resolve(scenario === 'empty' ? [] : WORKFLOW_ROWS),
    getWorkflow: () => Promise.resolve(undefined),
  };
}

const LIST_SERVICE = {
  listWorkflows: async () => [
    { workflowId: 'legacy-workflow', name: 'Legacy workflow', updatedAt: '2026-10-10T09:00:00.000Z' },
  ],
  listRuns: async () => [],
};

const component = getComponentMeta<WorkflowListPage>([], 'page', {}, [
  { provide: GraphListService, useValue: LIST_SERVICE },
  GraphEngineCapabilityStore,
  GraphEngineCapabilityService,
  {
    provide: GRAPH_ENGINE_CAPABILITY_SOURCE,
    useFactory: (): GraphEngineCapabilitySource => fakeSource(currentScenario),
  },
]);

const meta: Meta<WorkflowListPage> = {
  title: 'Graph/Pages/Workflow List',
  component: WorkflowListPage,
  ...component,
};
export default meta;
type Story = StoryObj<WorkflowListPage>;

function scenarioStory(scenario: Scenario): Story {
  return {
    render: (args) => {
      currentScenario = scenario;
      return { props: args };
    },
  };
}

/** Rows loaded from the selected engine's workflow catalogue. */
export const catalogue: Story = scenarioStory('catalogue');

/** Rows loaded from the legacy endpoint when the engine cannot list workflows. */
export const legacyFallback: Story = scenarioStory('legacy');

/** Manifest load failed: the backend-down banner with a retry affordance. */
export const failureBanner: Story = scenarioStory('failed');

/** More than one engine advertised: the engine selector renders. */
export const multiEngine: Story = scenarioStory('multiEngine');

/** Read-only engine: the create action is hidden. */
export const createBlocked: Story = scenarioStory('createBlocked');

/** Empty catalogue: the list renders its empty state. */
export const empty: Story = scenarioStory('empty');
