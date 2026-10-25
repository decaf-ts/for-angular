import type { Meta, StoryObj } from '@storybook/angular';
import { ChatHistoryComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatHistoryEntry } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const HISTORY: AgentChatHistoryEntry[] = [
  {
    id: 'chat-quarterly',
    title: 'Quarterly revenue review',
    preview: 'How did EMEA perform last quarter?',
    updatedAt: '2026-10-25T10:30:00.000Z',
    messageCount: 6,
    visibility: 'private',
  },
  {
    id: 'chat-handbook',
    title: 'Employee handbook questions',
    preview: 'What is the remote work policy?',
    updatedAt: '2026-10-24T16:10:00.000Z',
    messageCount: 4,
    visibility: 'shared',
    sharedWith: ['ada@example.com', 'linus@example.com'],
  },
  {
    id: 'chat-invoices',
    title: 'Invoice extraction',
    preview: 'Extract the totals from these three invoices.',
    updatedAt: '2026-10-23T09:05:00.000Z',
    messageCount: 2,
    visibility: 'public',
  },
  {
    id: 'chat-onboarding',
    title: 'Onboarding checklist',
    preview: 'Draft the first-week checklist for the new designer.',
    updatedAt: '2026-10-22T13:45:00.000Z',
    messageCount: 8,
    visibility: 'private',
  },
  {
    id: 'chat-support',
    title: 'Support escalation playbook',
    preview: 'Summarize the escalation steps for P1 incidents.',
    updatedAt: '2026-10-21T08:20:00.000Z',
    messageCount: 5,
    visibility: 'shared',
    sharedWith: ['grace@example.com'],
  },
];

const component = getComponentMeta<ChatHistoryComponent>([ChatHistoryComponent]);

const meta: Meta<ChatHistoryComponent> = {
  title: 'Agent/Chat/History',
  component: ChatHistoryComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    entries: { control: false, table: { disable: true } },
    entries$: { control: false, table: { disable: true } },
    routes$: { control: false, table: { disable: true } },
    variant: { control: 'select', options: ['panel', 'drawer'] },
    pageSize: { control: { type: 'number', min: 1, max: 20 } },
    skeletonRows: { control: { type: 'number', min: 1, max: 10 } },
    activeId: { control: 'text' },
    title: { control: 'text' },
  },
  args: {
    entries: HISTORY,
    entries$: null,
    routes$: null,
    activeId: 'chat-quarterly',
    loading: false,
    variant: 'panel',
    open: true,
    pageSize: 6,
    skeletonRows: 4,
    title: null,
  },
};
export default meta;
type Story = StoryObj<ChatHistoryComponent>;

export const conversationList: Story = {};

export const activeConversation: Story = {
  args: { activeId: 'chat-handbook' },
};

export const paginated: Story = {
  args: { pageSize: 2 },
};

export const drawerOpen: Story = {
  args: { variant: 'drawer', open: true },
};

export const loading: Story = {
  args: { loading: true, skeletonRows: 4 },
};

export const empty: Story = {
  args: { entries: [], activeId: null },
};
