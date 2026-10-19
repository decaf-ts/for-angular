/**
 * @module for-angular/stories/graph-toolbar
 * @summary Storybook stories for the graph toolbar.
 * @description Covers {@link GraphToolbarComponent} across capability-gated affordances (save/run/create), validation issues and auto-save state.
 */
import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphToolbarComponent } from 'diagrams/src/lib/graph/components/graph-toolbar/graph-toolbar.component';
import { GraphAutoSaveService } from 'diagrams/src/lib/graph/services/GraphAutoSaveService';
import { GraphSaveService } from 'diagrams/src/lib/graph/services/GraphSaveService';
import { GraphEngineCapabilityService } from 'diagrams/src/lib/graph/capabilities';
import type { GraphValidationIssue } from 'diagrams/src/lib/graph/validation';
import './setup';
import { getComponentMeta } from './utils';

const ISSUES: GraphValidationIssue[] = [
  { code: 'missing-input', path: 'nodes[0].inputs.value', message: 'Required input is not connected', nodeId: 'log-1' },
  { code: 'missing-parameter', path: 'nodes[1].parameters.code', message: 'Code node has no code', nodeId: 'code-1' },
];

const AUTO_SAVE_ENABLED = signal(false);
const SAVING = signal(false);
const CAN_UPDATE = signal(true);
const CAN_RUN = signal(true);
const ENGINE_LABEL = signal('Local');

const AUTO_SAVE_MOCK = {
  enabled: AUTO_SAVE_ENABLED,
  setEnabled: (value: boolean) => AUTO_SAVE_ENABLED.set(value),
};

const SAVE_MOCK = { saving: SAVING };

const CAPABILITIES_MOCK = {
  canUpdateWorkflow: CAN_UPDATE,
  canRunWorkflow: CAN_RUN,
  engineLabel: ENGINE_LABEL,
  load: () => Promise.resolve(),
};

function withToolbarState(state: {
  autoSave?: boolean;
  saving?: boolean;
  canUpdate?: boolean;
  canRun?: boolean;
  engineLabel?: string;
}): void {
  AUTO_SAVE_ENABLED.set(state.autoSave ?? false);
  SAVING.set(state.saving ?? false);
  CAN_UPDATE.set(state.canUpdate ?? true);
  CAN_RUN.set(state.canRun ?? true);
  ENGINE_LABEL.set(state.engineLabel ?? 'Local');
}

const component = getComponentMeta<GraphToolbarComponent>([], 'component', {}, [
  { provide: GraphAutoSaveService, useValue: AUTO_SAVE_MOCK },
  { provide: GraphSaveService, useValue: SAVE_MOCK },
  { provide: GraphEngineCapabilityService, useValue: CAPABILITIES_MOCK },
]);
const meta: Meta<GraphToolbarComponent> = {
  title: 'Graph/Panels/Toolbar',
  component: GraphToolbarComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    validationIssues: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphToolbarComponent>;

function toolbarStory(state: Parameters<typeof withToolbarState>[0]): Story {
  return {
    render: (args) => {
      withToolbarState(state);
      return { props: args };
    },
  };
}

export const readyToRun: Story = toolbarStory({});

export const running: Story = toolbarStory({});

export const invalidGraph: Story = toolbarStory({});

export const backendUnavailable: Story = toolbarStory({ canRun: false });

export const afterRun: Story = toolbarStory({});

export const autoSaveEnabled: Story = toolbarStory({ autoSave: true });

export const saving: Story = toolbarStory({ saving: true });

export const engineUnsupported: Story = toolbarStory({ canUpdate: false, canRun: false, engineLabel: 'Dagster' });

readyToRun.args = { workflowId: 'demo-workflow', canRun: true };
running.args = { workflowId: 'demo-workflow', canRun: true, isRunning: true };
invalidGraph.args = { workflowId: 'demo-workflow', canRun: true, invalid: true, validationIssues: ISSUES };
backendUnavailable.args = { workflowId: 'demo-workflow', canRun: false };
afterRun.args = { workflowId: 'demo-workflow', canRun: true, hasRun: true };
autoSaveEnabled.args = { workflowId: 'demo-workflow', canRun: true };
saving.args = { workflowId: 'demo-workflow', canRun: true };
engineUnsupported.args = { workflowId: 'demo-workflow', canRun: false };
