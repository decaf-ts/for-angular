import type { Meta, StoryObj } from '@storybook/angular';
import { ChatNestedAgentComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatNestedAgentComponent>([ChatNestedAgentComponent]);

const meta: Meta<ChatNestedAgentComponent> = {
  title: 'Agent/Chat/Nested Agent',
  component: ChatNestedAgentComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    name: { control: 'text' },
    runId: { control: 'text' },
    depth: { control: { type: 'range', min: 0, max: 8, step: 1 } },
    ancestry: { control: 'object' },
    text: { control: 'text' },
    streaming: { control: 'boolean' },
    status: {
      control: 'select',
      options: ['running', 'success', 'failed', 'suspended', 'waiting'],
    },
    toolErrors: { control: 'object' },
  },
  args: {
    name: 'Refund sub-agent',
    runId: 'run-nested-42',
    depth: 1,
    ancestry: ['supervisor', 'refunds'],
    text: 'I checked the refund policy and two orders qualify for an automatic refund.',
    streaming: false,
    status: 'success',
    toolErrors: [],
  },
};
export default meta;
type Story = StoryObj<ChatNestedAgentComponent>;

export const succeeded: Story = {};

export const streaming: Story = {
  args: {
    status: 'running',
    streaming: true,
    text: 'I checked the refund policy and two orders',
  },
};

export const withToolErrors: Story = {
  args: {
    status: 'failed',
    toolErrors: [
      {
        id: 'error-1',
        toolName: 'refundOrders',
        message: 'The payments service rejected the refund request.',
      },
      {
        id: 'error-2',
        toolName: 'notifyCustomer',
        message: 'The notification queue is unavailable.',
      },
    ],
  },
};

export const deeplyNested: Story = {
  args: {
    name: 'Policy verifier',
    runId: 'run-nested-57',
    depth: 4,
    ancestry: ['supervisor', 'refunds', 'policy', 'verify'],
    text: 'The refund falls inside the 30-day window.',
  },
};
