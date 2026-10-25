import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactSkeletonComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatArtifactSkeletonComponent>([ChatArtifactSkeletonComponent]);

const meta: Meta<ChatArtifactSkeletonComponent> = {
  title: 'Agent/Chat/Artifact Skeleton',
  component: ChatArtifactSkeletonComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    variant: { control: 'select', options: ['full', 'inline'] },
    lines: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    label: { control: 'text' },
  },
  args: {
    variant: 'full',
    lines: 4,
    label: null,
  },
};
export default meta;
type Story = StoryObj<ChatArtifactSkeletonComponent>;

export const fullPanel: Story = {};

export const inline: Story = {
  args: {
    variant: 'inline',
  },
};

export const longDocument: Story = {
  args: {
    lines: 9,
  },
};

export const customLabel: Story = {
  args: {
    variant: 'inline',
    label: 'Fetching document…',
  },
};
