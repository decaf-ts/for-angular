import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactVersionFooterComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatArtifactVersionFooterComponent>([
  ChatArtifactVersionFooterComponent,
]);

const meta: Meta<ChatArtifactVersionFooterComponent> = {
  title: 'Agent/Chat/Artifact Version Footer',
  component: ChatArtifactVersionFooterComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    currentVersion: { control: { type: 'number', min: 1 } },
    totalVersions: { control: { type: 'number', min: 1 } },
    versions: { control: 'object' },
  },
  args: {
    currentVersion: 2,
    totalVersions: 4,
    versions: [],
  },
};
export default meta;
type Story = StoryObj<ChatArtifactVersionFooterComponent>;

export const middleVersion: Story = {};

export const firstVersion: Story = {
  args: {
    currentVersion: 1,
  },
};

export const latestVersion: Story = {
  args: {
    currentVersion: 4,
  },
};

export const singleVersion: Story = {
  args: {
    currentVersion: 1,
    totalVersions: 1,
  },
};

export const labelledVersions: Story = {
  args: {
    currentVersion: 2,
    totalVersions: 3,
    versions: [
      { id: 'v1', label: 'Initial draft' },
      { id: 'v2', label: 'Added totals' },
      { id: 'v3', label: 'Final review' },
    ],
  },
};
