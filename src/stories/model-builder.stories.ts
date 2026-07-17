import type { Meta, StoryObj } from '@storybook/angular';
import { ModelBuilderComponent } from 'src/lib/components/model-builder/model-builder.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ModelBuilderComponent>([]);

const meta: Meta<ModelBuilderComponent> = {
  title: 'Components/ModelBuilder',
  component: ModelBuilderComponent,
  ...component,
  args: {
    preview: false,
  },
};
export default meta;
type Story = StoryObj<ModelBuilderComponent>;

export const init: Story = {};

export const withPreview: Story = {
  args: {
    preview: true,
  },
};
