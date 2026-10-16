/**
 * @module for-angular/stories/graph-run-item
 * @summary Storybook stories for the executions list run item.
 * @description Covers {@link GraphRunItemComponent} run rows across status, timing and workflow identity states.
 */
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

/** A run still in progress: no finished timestamp, no replay action. */
export const running: Story = {
  args: {
    model: new GraphRunListModel({
      runId: 'run-3',
      workflowId: 'text-pipeline-workflow',
      status: 'running',
      createdAt: '2026-01-02T02:00:00.000Z',
    }),
  },
};

/** A queued run that has not started yet. */
export const queued: Story = {
  args: {
    model: new GraphRunListModel({
      runId: 'run-4',
      workflowId: 'text-pipeline-workflow',
      status: 'queued',
      createdAt: '2026-01-02T03:00:00.000Z',
    }),
  },
};
