import type { Meta, StoryObj } from '@storybook/angular';
import { ChatApprovalComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const SUSPEND_PAYLOAD = {
  tool: 'refundOrder',
  orderId: 'ORD-2026-0114',
  amount: '€149.00',
  reason: 'Item arrived damaged',
};

const component = getComponentMeta<ChatApprovalComponent>([ChatApprovalComponent]);

const meta: Meta<ChatApprovalComponent> = {
  title: 'Agent/Chat/Approval',
  component: ChatApprovalComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    runId: { control: 'text' },
    toolName: { control: 'text' },
    payload: { control: 'object' },
    resumeData: { control: 'object' },
    rejectReason: { control: 'text' },
    status: {
      control: 'select',
      options: ['pending', 'approved', 'rejected'],
    },
    disabled: { control: 'boolean' },
  },
  args: {
    runId: 'run-approval-7',
    toolName: 'refundOrder',
    payload: SUSPEND_PAYLOAD,
    resumeData: undefined,
    rejectReason: null,
    status: 'pending',
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<ChatApprovalComponent>;

export const pending: Story = {};

export const approved: Story = {
  args: { status: 'approved' },
};

export const rejected: Story = {
  args: { status: 'rejected', rejectReason: 'Refund exceeds the policy limit.' },
};

export const customResumeData: Story = {
  args: {
    resumeData: { approvedAmount: '€99.00', approvedBy: 'agent-chat' },
  },
};

export const disabled: Story = {
  args: { disabled: true },
};

export const withoutPayload: Story = {
  args: { payload: undefined },
};
