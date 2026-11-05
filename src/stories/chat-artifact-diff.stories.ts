import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactDiffComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const PREVIOUS = 'Total submitted: EUR 11,940.00\nApproved claims: 16 of 21\nOutstanding: 5 claims';
const CURRENT =
  'Total submitted: EUR 12,480.00\nApproved claims: 18 of 21\nOutstanding: 3 claims\nEscalated: 1 claim';

const component = getComponentMeta<ChatArtifactDiffComponent>([ChatArtifactDiffComponent]);

const meta: Meta<ChatArtifactDiffComponent> = {
  title: 'Agent/Chat/Artifact Diff',
  component: ChatArtifactDiffComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    previous: { control: 'text' },
    current: { control: 'text' },
    mode: { control: 'select', options: ['side-by-side', 'inline', null] },
    showToggle: { control: 'boolean' },
  },
  args: {
    previous: PREVIOUS,
    current: CURRENT,
    mode: null,
    showToggle: true,
  },
};
export default meta;
type Story = StoryObj<ChatArtifactDiffComponent>;

export const sideBySide: Story = {};

export const inline: Story = {
  args: {
    mode: 'inline',
  },
};

export const unchanged: Story = {
  args: {
    current: PREVIOUS,
  },
};

export const longDocument: Story = {
  args: {
    previous: Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n'),
    current: Array.from(
      { length: 12 },
      (_, index) => (index === 5 ? 'line 6 (edited)' : `line ${index + 1}`),
    ).join('\n'),
  },
};

export const withoutToggle: Story = {
  args: {
    showToggle: false,
  },
};
