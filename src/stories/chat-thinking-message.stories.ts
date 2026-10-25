import type { Meta, StoryObj } from '@storybook/angular';
import { ChatThinkingMessageComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatThinkingMessageComponent>([
  ChatThinkingMessageComponent,
]);

const meta: Meta<ChatThinkingMessageComponent> = {
  title: 'Agent/Chat/Thinking Message',
  component: ChatThinkingMessageComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    lines: { control: { type: 'range', min: 1, max: 6, step: 1 } },
    label: { control: 'text' },
    avatarIcon: { control: 'text' },
  },
  args: {
    label: null,
    lines: 2,
    animated: true,
    showAvatar: true,
    avatarIcon: 'bot',
  },
};
export default meta;
type Story = StoryObj<ChatThinkingMessageComponent>;

export const typing: Story = {};

export const singleLine: Story = {
  args: { lines: 1 },
};

export const labelled: Story = {
  args: { label: 'Searching the knowledge base…', lines: 3 },
};

export const reducedMotion: Story = {
  args: { animated: false, avatarIcon: 'loader' },
};
