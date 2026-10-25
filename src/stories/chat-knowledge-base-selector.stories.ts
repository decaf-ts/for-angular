import type { Meta, StoryObj } from '@storybook/angular';
import { ChatKnowledgeBaseSelectorComponent } from '@decaf-ts/for-angular/agent';
import type {
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeSource,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const ENTRIES: AgentChatKnowledgeBaseEntry[] = [
  {
    id: 'kb-handbook',
    label: 'Employee handbook',
    fileName: 'employee-handbook.pdf',
    mime: 'application/pdf',
    size: 248320,
    fileCount: 3,
    status: 'ready',
    updatedAt: '2026-10-24T16:10:00.000Z',
  },
  {
    id: 'kb-price-list',
    label: 'Price list 2026',
    fileName: 'price-list-2026.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 84211,
    status: 'ready',
    updatedAt: '2026-10-22T09:00:00.000Z',
  },
  {
    id: 'kb-policies',
    label: 'Security policies',
    fileName: 'security-policies.md',
    mime: 'text/markdown',
    size: 12288,
    status: 'ready',
    updatedAt: '2026-10-20T11:30:00.000Z',
  },
];

const SOURCES: AgentChatKnowledgeSource[] = [
  { id: 'kb-handbook', label: 'Employee handbook' },
  { id: 'kb-price-list', label: 'Price list 2026' },
];

const component = getComponentMeta<ChatKnowledgeBaseSelectorComponent>([
  ChatKnowledgeBaseSelectorComponent,
]);

const meta: Meta<ChatKnowledgeBaseSelectorComponent> = {
  title: 'Agent/Chat/KnowledgeBase',
  component: ChatKnowledgeBaseSelectorComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    entries: { control: false, table: { disable: true } },
    sources: { control: false, table: { disable: true } },
    selectedIds: { control: false, table: { disable: true } },
    skeletonRows: { control: { type: 'number', min: 1, max: 10 } },
    title: { control: 'text' },
  },
  args: {
    open: true,
    entries: ENTRIES,
    sources: null,
    selectedIds: [],
    loading: false,
    uploadEnabled: true,
    deleteEnabled: true,
    skeletonRows: 3,
    title: null,
  },
};
export default meta;
type Story = StoryObj<ChatKnowledgeBaseSelectorComponent>;

export const documents: Story = {};

export const preselected: Story = {
  args: { selectedIds: ['kb-handbook', 'kb-policies'] },
};

export const loading: Story = {
  args: { loading: true, skeletonRows: 3 },
};

export const empty: Story = {
  args: { entries: [], selectedIds: [] },
};

export const sourcesCompatibility: Story = {
  args: { entries: null, sources: SOURCES },
};

export const readOnly: Story = {
  args: { uploadEnabled: false, deleteEnabled: false },
};

export const closed: Story = {
  args: { open: false },
};
