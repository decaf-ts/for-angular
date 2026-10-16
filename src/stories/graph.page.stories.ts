/**
 * @module for-angular/stories/graph.page
 * @summary Storybook stories for the graph editor page.
 * @description Covers {@link GraphPage} end-to-end: toolbar affordances, run-form inputs, run lifecycle wiring and the served-catalog load path.
 */
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphPage } from 'src/app/pages/graph/graph.page';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<GraphPage>([], 'page');
const meta: Meta<GraphPage> = {
  title: 'Graph/Pages/Graph Editor',
  component: GraphPage,
  ...component,
};
export default meta;
type Story = StoryObj<GraphPage>;

/** Demo operation: the canonical `TextPipelineWorkflow` editor. */
export const demo: Story = {
  args: { operation: 'demo', workflowId: 'text-pipeline-workflow' },
};

/** Create operation: empty canvas authoring surface. */
export const create: Story = {
  args: { operation: 'create' },
};

/** Read operation: read-only editor (rename hidden). */
export const read: Story = {
  args: { operation: 'read', workflowId: 'text-pipeline-workflow' },
};

/** Update operation: editable existing workflow. */
export const update: Story = {
  args: { operation: 'update', workflowId: 'text-pipeline-workflow' },
};
