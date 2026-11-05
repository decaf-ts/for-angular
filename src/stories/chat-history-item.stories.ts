import type { Meta, StoryObj } from '@storybook/angular';
import { ChatHistoryItemComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatHistoryEntry } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const ENTRY: AgentChatHistoryEntry = {
  id: 'chat-quarterly',
  title: 'Quarterly revenue review',
  preview: 'How did EMEA perform last quarter?',
  updatedAt: '2026-10-25T10:30:00.000Z',
  messageCount: 6,
  visibility: 'private',
};

const component = getComponentMeta<ChatHistoryItemComponent>([
  ChatHistoryItemComponent,
]);

const meta: Meta<ChatHistoryItemComponent> = {
  title: 'Agent/Chat/History/Item',
  component: ChatHistoryItemComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    entry: { control: false, table: { disable: true } },
  },
  args: {
    entry: ENTRY,
    active: false,
    confirmDelete: true,
    deleting: false,
  },
};
export default meta;
type Story = StoryObj<ChatHistoryItemComponent>;

export const conversation: Story = {};

export const activeConversation: Story = {
  args: { active: true },
};

export const sharedConversation: Story = {
  args: {
    entry: {
      ...ENTRY,
      visibility: 'shared',
      sharedWith: ['ada@example.com', 'linus@example.com'],
    },
  },
};

export const publicConversation: Story = {
  args: { entry: { ...ENTRY, visibility: 'public' } },
};

export const previewOnly: Story = {
  args: {
    entry: {
      id: 'chat-preview',
      title: '',
      preview: 'First user message becomes the conversation title.',
      messageCount: 1,
      visibility: 'private',
    },
  },
};

export const deleteWithoutConfirmation: Story = {
  args: { confirmDelete: false },
};

export const deleting: Story = {
  args: { deleting: true },
};
