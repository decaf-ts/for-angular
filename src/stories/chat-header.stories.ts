import type { Meta, StoryObj } from '@storybook/angular';
import { ChatHeaderComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatHeaderComponent>([ChatHeaderComponent]);

const meta: Meta<ChatHeaderComponent> = {
  title: 'Agent/Chat/Header',
  component: ChatHeaderComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    namespaces: { control: false, table: { disable: true } },
    titleKey: { control: 'text' },
    titleFallback: { control: 'text' },
  },
  args: {
    titleKey: 'agent.chat.title',
    titleFallback: 'Agent chat',
    namespaces: [],
    showHistory: true,
    showKnowledgeBase: true,
    historyOpen: true,
    knowledgeOpen: false,
    telemetryOpen: false,
    selectedKnowledgeCount: 0,
  },
};
export default meta;
type Story = StoryObj<ChatHeaderComponent>;

export const defaultState: Story = {
  name: 'Default',
};

export const namespaces: Story = {
  args: {
    namespaces: ['tenant:acme', 'project:chat-demo', 'role:analyst'],
    historyOpen: false,
    selectedKnowledgeCount: 2,
  },
};

export const telemetryOpen: Story = {
  args: {
    namespaces: ['tenant:acme'],
    telemetryOpen: true,
  },
};

export const noActions: Story = {
  args: {
    showHistory: false,
    showKnowledgeBase: false,
    telemetryOpen: true,
  },
};
