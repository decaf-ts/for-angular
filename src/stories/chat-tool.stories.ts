import type { Meta, StoryObj } from '@storybook/angular';
import { ChatToolComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const QUERY_INPUT = { status: 'delayed', limit: 3 };
const QUERY_OUTPUT = {
  count: 3,
  orders: ['ORD-2026-0114', 'ORD-2026-0117', 'ORD-2026-0121'],
};

const component = getComponentMeta<ChatToolComponent>([ChatToolComponent]);

const meta: Meta<ChatToolComponent> = {
  title: 'Agent/Chat/Tool',
  component: ChatToolComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    name: { control: 'text' },
    title: { control: 'text' },
    state: {
      control: 'select',
      options: [
        'input-streaming',
        'input-available',
        'output-available',
        'output-error',
        'output-denied',
      ],
    },
    toolInput: { control: 'object' },
    toolOutput: { control: 'object' },
    error: { control: 'text' },
  },
  args: {
    name: 'queryOrders',
    title: null,
    state: 'output-available',
    toolInput: QUERY_INPUT,
    toolOutput: QUERY_OUTPUT,
    error: null,
    open: false,
  },
};
export default meta;
type Story = StoryObj<ChatToolComponent>;

export const collapsed: Story = {};

export const expanded: Story = {
  args: { open: true },
};

export const inputStreaming: Story = {
  args: { state: 'input-streaming', toolOutput: undefined, open: true },
};

export const inputAvailable: Story = {
  args: { state: 'input-available', toolOutput: undefined, open: true },
};

export const outputError: Story = {
  args: {
    state: 'output-error',
    toolOutput: undefined,
    error: 'The orders backend timed out after 30 seconds.',
    open: true,
  },
};

export const outputDenied: Story = {
  args: {
    state: 'output-denied',
    toolOutput: undefined,
    error: 'The user denied access to the orders backend.',
    open: true,
  },
};
