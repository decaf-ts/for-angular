import type { Meta, StoryObj } from '@storybook/angular';
import { ChatMessageComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatMessagePart } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const NESTED_PARTS: AgentChatMessagePart[] = [
  {
    kind: 'text',
    id: 'part-text',
    text: 'I checked the order pipeline and reproduced the delay.',
  },
  {
    kind: 'tool',
    id: 'part-tool',
    name: 'queryOrders',
    status: 'succeeded',
    input: { status: 'delayed', limit: 3 },
    output: { count: 3, oldest: 'ORD-2026-0114' },
  },
  {
    kind: 'reasoning',
    id: 'part-reasoning',
    title: 'Why this query',
    open: true,
    content:
      'The user asked about delayed orders, so I filtered by status=delayed and sorted by creation date.',
  },
  {
    kind: 'code',
    id: 'part-code',
    filename: 'query.ts',
    language: 'ts',
    code: 'const delayed = await orders.where({ status: "delayed" }).limit(3);',
  },
  {
    kind: 'attachment',
    id: 'part-attachment',
    attachment: {
      id: 'att-1',
      name: 'orders.csv',
      mime: 'text/csv',
      size: 2048,
    },
  },
];

const component = getComponentMeta<ChatMessageComponent>([ChatMessageComponent]);

const meta: Meta<ChatMessageComponent> = {
  title: 'Agent/Chat/Message',
  component: ChatMessageComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    parts: { control: false, table: { disable: true } },
    attachments: { control: false, table: { disable: true } },
    actions: { control: false, table: { disable: true } },
    createdAt: { control: 'text' },
    role: {
      control: 'select',
      options: ['user', 'assistant', 'system', 'error'],
    },
  },
  args: {
    role: 'assistant',
    content: 'The quarterly revenue grew 12%, driven mostly by the EMEA segment.',
    createdAt: '2026-10-25T10:00:04.000Z',
    attachments: [],
    parts: [],
    actions: [],
    streaming: false,
    pending: false,
    avatar: 'default',
    avatarIcon: null,
    roleLabel: null,
  },
};
export default meta;
type Story = StoryObj<ChatMessageComponent>;

export const assistant: Story = {};

export const user: Story = {
  args: {
    role: 'user',
    content: 'How many orders shipped this week?',
    createdAt: '2026-10-25T10:00:00.000Z',
  },
};

export const streaming: Story = {
  args: {
    content: 'The quarterly revenue grew 12%',
    streaming: true,
    createdAt: null,
  },
};

export const withNestedParts: Story = {
  args: {
    content: '',
    parts: NESTED_PARTS,
  },
};

export const withAttachments: Story = {
  args: {
    role: 'user',
    content: 'Please summarize the attached purchase orders.',
    attachments: [
      { id: 'att-1', name: 'orders.csv', mime: 'text/csv', size: 2048 },
      { id: 'att-2', name: 'invoice.pdf', mime: 'application/pdf', size: 120033 },
    ],
  },
};

export const system: Story = {
  args: {
    role: 'system',
    content: 'The conversation was restored from a previous session.',
    createdAt: null,
  },
};

export const error: Story = {
  args: {
    role: 'error',
    content: 'The agent backend is not reachable. Reconnect and try again.',
    createdAt: null,
  },
};

export const pending: Story = {
  args: {
    content: '',
    pending: true,
    createdAt: null,
  },
};
