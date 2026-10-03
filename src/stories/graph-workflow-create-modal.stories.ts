import type { Meta, StoryObj } from '@storybook/angular';
import { fn } from 'storybook/test';
import { GraphWorkflowCreateModalComponent } from 'src/app/pages/graph/graph-workflow-create.modal';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<GraphWorkflowCreateModalComponent>([]);
const meta: Meta<GraphWorkflowCreateModalComponent> = {
  title: 'Graph/Workflow Create Modal',
  component: GraphWorkflowCreateModalComponent,
  ...component,
  args: {
    open: true,
    name: 'Text Pipeline',
    defaultNamespace: 'private',
    submitted: fn(),
    cancelled: fn(),
  },
};
export default meta;
type Story = StoryObj<GraphWorkflowCreateModalComponent>;

/** The first-save create modal with the private namespace default. */
export const firstSave: Story = {};

/** The create modal opened with an explicit namespace default. */
export const explicitNamespace: Story = {
  args: {
    name: '',
    defaultNamespace: 'company',
  },
};
