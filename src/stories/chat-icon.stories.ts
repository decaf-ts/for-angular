import type { Meta, StoryObj } from '@storybook/angular';
import {
  AGENT_CHAT_ICON_NAMES,
  ChatIconComponent,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatIconComponent>([ChatIconComponent]);

const meta: Meta<ChatIconComponent> = {
  title: 'Agent/Chat/Icon',
  component: ChatIconComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    name: {
      control: 'select',
      options: [...AGENT_CHAT_ICON_NAMES],
    },
    size: { control: { type: 'range', min: 12, max: 48, step: 2 } },
    strokeWidth: { control: { type: 'range', min: 1, max: 3, step: 0.25 } },
    title: { control: 'text' },
  },
  args: {
    name: 'bot',
    size: 20,
    strokeWidth: 1.75,
    title: null,
  },
};
export default meta;
type Story = StoryObj<ChatIconComponent>;

export const bot: Story = {};

export const user: Story = {
  args: { name: 'user' },
};

export const attachment: Story = {
  args: { name: 'attachment' },
};

export const loader: Story = {
  args: { name: 'loader', size: 28 },
};

export const labelled: Story = {
  args: { name: 'send', title: 'Send message', size: 24 },
};
