import type { Meta, StoryObj } from '@storybook/angular';
import { ChatWorkflowStatusComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatWorkflowStep } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const STEPS: AgentChatWorkflowStep[] = [
  {
    id: 'step-fetch',
    name: 'Fetch open orders',
    status: 'success',
    output: { count: 12, source: 'orders-api' },
  },
  {
    id: 'step-classify',
    name: 'Classify delays',
    status: 'success',
    output: { delayed: 3, onTime: 9 },
  },
  {
    id: 'step-notify',
    name: 'Notify customers',
    status: 'running',
    output: { queued: 3 },
  },
  {
    id: 'step-approve',
    name: 'Approve refunds',
    status: 'suspended',
  },
  {
    id: 'step-report',
    name: 'Write summary',
    status: 'waiting',
  },
];

const FAILED_STEPS: AgentChatWorkflowStep[] = [
  {
    id: 'step-fetch',
    name: 'Fetch open orders',
    status: 'success',
    output: { count: 12 },
  },
  {
    id: 'step-classify',
    name: 'Classify delays',
    status: 'failed',
    error: 'The classification model returned malformed JSON.',
  },
];

const component = getComponentMeta<ChatWorkflowStatusComponent>([ChatWorkflowStatusComponent]);

const meta: Meta<ChatWorkflowStatusComponent> = {
  title: 'Agent/Chat/Workflow Status',
  component: ChatWorkflowStatusComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    steps: { control: false, table: { disable: true } },
    title: { control: 'text' },
  },
  args: { steps: STEPS, title: null },
};
export default meta;
type Story = StoryObj<ChatWorkflowStatusComponent>;

export const defaultState: Story = {
  name: 'Default',
};

export const failed: Story = {
  args: { steps: FAILED_STEPS, title: 'Delayed order triage' },
};

export const empty: Story = {
  args: { steps: [], title: null },
};
