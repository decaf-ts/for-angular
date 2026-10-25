import type { Meta, StoryObj } from '@storybook/angular';
import { ChatReasoningComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const REASONING = `The user asked for delayed orders, so I filtered by status=delayed.
I sorted by creation date ascending to surface the oldest shipments first.
The result set is small enough to return in a single response.`;

const component = getComponentMeta<ChatReasoningComponent>([ChatReasoningComponent]);

const meta: Meta<ChatReasoningComponent> = {
  title: 'Agent/Chat/Reasoning',
  component: ChatReasoningComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    title: { control: 'text' },
    content: { control: 'text' },
    meta: { control: 'text' },
  },
  args: {
    title: null,
    content: REASONING,
    open: false,
    streaming: false,
    inline: false,
    meta: null,
  },
};
export default meta;
type Story = StoryObj<ChatReasoningComponent>;

export const collapsed: Story = {};

export const expanded: Story = {
  args: { open: true },
};

export const streaming: Story = {
  args: { streaming: true, meta: '0.8s' },
};

export const inline: Story = {
  args: {
    title: 'Why this query',
    inline: true,
    open: true,
    meta: '3 steps',
  },
};
