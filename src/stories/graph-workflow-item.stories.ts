/**
 * @module for-angular/stories/graph-workflow-item
 * @summary Storybook stories for the workflow catalog list item.
 * @description Covers {@link GraphWorkflowItemComponent} rows, including opening a served workflow through the engine catalogue (SAA-722).
 */
import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphWorkflowListModel } from 'src/app/models/GraphListModels';
import { GraphWorkflowItemComponent } from 'src/app/pages/graph/list/graph-workflow-item.component';
import { GraphEngineCapabilityService } from 'src/diagrams/components/graph/capabilities';
import './setup';
import { getComponentMeta } from './utils';

const CAN_RUN = signal(true);
const SELECTED_ENGINE = signal<string | undefined>('local');

const CAPABILITIES_MOCK = {
  canRunWorkflow: CAN_RUN,
  selectedEngineId: SELECTED_ENGINE,
  load: () => Promise.resolve(),
};

function withRunCapability(canRun: boolean, engineId: string): void {
  CAN_RUN.set(canRun);
  SELECTED_ENGINE.set(engineId);
}

const component = getComponentMeta<GraphWorkflowItemComponent>([], 'component', {}, [
  { provide: GraphEngineCapabilityService, useValue: CAPABILITIES_MOCK },
]);
const meta: Meta<GraphWorkflowItemComponent> = {
  title: 'Graph/Workflow List Item',
  component: GraphWorkflowItemComponent,
  ...component,
  args: {
    model: new GraphWorkflowListModel({
      workflowId: 'text-pipeline-workflow',
      name: 'Text Pipeline',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }),
  },
};
export default meta;
type Story = StoryObj<GraphWorkflowItemComponent>;

/** A named workflow row with the open and past-executions actions. */
export const named: Story = {
  render: (args) => {
    withRunCapability(true, 'local');
    return { props: args };
  },
};

/** A workflow row without a name, falling back to its id. */
export const unnamed: Story = {
  args: {
    model: new GraphWorkflowListModel({
      workflowId: 'untitled-workflow',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  },
  render: (args) => {
    withRunCapability(true, 'local');
    return { props: args };
  },
};

/** The selected engine declares run NOT_SUPPORTED: the run action is disabled. */
export const runBlocked: Story = {
  render: (args) => {
    withRunCapability(false, 'dagster');
    return { props: args };
  },
};
