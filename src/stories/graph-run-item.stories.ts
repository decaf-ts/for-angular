import type { Meta, StoryObj } from '@storybook/angular';
import { GraphRunListModel } from 'src/app/models/GraphListModels';
import { GraphRunItemComponent } from 'src/app/pages/graph/executions/graph-run-item.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<GraphRunItemComponent>([]);
const meta: Meta<GraphRunItemComponent> = {
  title: 'Graph/Run List Item',
  component: GraphRunItemComponent,
  ...component,
  args: {
    model: new GraphRunListModel({
      runId: 'run-1',
      workflowId: 'text-pipeline-workflow',
      status: 'completed',
      createdAt: '2026-01-02T00:00:00.000Z',
      finishedAt: '2026-01-02T00:00:12.000Z',
    }),
  },
};
export default meta;
type Story = StoryObj<GraphRunItemComponent>;

/** A completed run row with the replay action. */
export const completed: Story = {};

/** A failed run row. */
export const failed: Story = {
  args: {
    model: new GraphRunListModel({
      runId: 'run-2',
      workflowId: 'text-pipeline-workflow',
      status: 'failed',
      createdAt: '2026-01-02T01:00:00.000Z',
    }),
  },
};
