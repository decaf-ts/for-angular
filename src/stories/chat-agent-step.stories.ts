import type { Meta, StoryObj } from '@storybook/angular';
import { ChatAgentStepComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatAgentStepComponent>([ChatAgentStepComponent]);

const meta: Meta<ChatAgentStepComponent> = {
  title: 'Agent/Chat/Agent Step',
  component: ChatAgentStepComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    name: { control: 'text' },
    agentId: { control: 'text' },
    status: {
      control: 'select',
      options: ['running', 'success', 'failed', 'suspended', 'waiting'],
    },
    stepInput: { control: 'object' },
    stepOutput: { control: 'object' },
    error: { control: 'text' },
  },
  args: {
    name: 'Research agent',
    agentId: 'agent-research',
    status: 'success',
    stepInput: { question: 'Which orders are delayed?' },
    stepOutput: { answer: '3 orders are delayed by more than 5 days.' },
    error: null,
  },
};
export default meta;
type Story = StoryObj<ChatAgentStepComponent>;

export const succeeded: Story = {};

export const running: Story = {
  args: {
    status: 'running',
    stepOutput: undefined,
  },
};

export const failed: Story = {
  args: {
    status: 'failed',
    stepOutput: undefined,
    error: 'The research agent could not reach the orders service.',
  },
};

export const suspended: Story = {
  args: {
    status: 'suspended',
    stepOutput: undefined,
  },
};

export const waiting: Story = {
  args: {
    status: 'waiting',
    stepInput: undefined,
    stepOutput: undefined,
  },
};
