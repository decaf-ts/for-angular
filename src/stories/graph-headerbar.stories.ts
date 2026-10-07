import type { Meta, StoryObj } from '@storybook/angular';
import { GraphHeaderbarComponent } from 'src/graph/components/graph-headerbar/graph-headerbar.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<GraphHeaderbarComponent>([]);
const meta: Meta<GraphHeaderbarComponent> = {
  title: 'Graph/Panels/Header Bar',
  component: GraphHeaderbarComponent,
  ...component,
};
export default meta;
type Story = StoryObj<GraphHeaderbarComponent>;

export const defaultNames: Story = {
  args: { projectName: 'Personal', workflowName: 'My workflow 2' },
};

export const customNames: Story = {
  args: { projectName: 'Acme Analytics', workflowName: 'Nightly enrichment' },
};
