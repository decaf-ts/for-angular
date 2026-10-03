import type { Meta, StoryObj } from '@storybook/angular';
import { GraphWorkflowListModel } from 'src/app/models/GraphListModels';
import { GraphWorkflowItemComponent } from 'src/app/pages/graph/list/graph-workflow-item.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<GraphWorkflowItemComponent>([]);
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
export const named: Story = {};

/** A workflow row without a name, falling back to its id. */
export const unnamed: Story = {
  args: {
    model: new GraphWorkflowListModel({
      workflowId: 'untitled-workflow',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  },
};
