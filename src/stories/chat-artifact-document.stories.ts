import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactDocumentComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const document = {
  id: 'doc-expense-q3',
  title: 'Q3 expense report',
  kind: 'text' as const,
  content:
    'Total submitted: EUR 12,480.00\nApproved claims: 18 of 21\nOutstanding: 3 claims awaiting review',
  version: 3,
};

const loader = async (): Promise<typeof document> => document;

const component = getComponentMeta<ChatArtifactDocumentComponent>([ChatArtifactDocumentComponent]);

const meta: Meta<ChatArtifactDocumentComponent> = {
  title: 'Agent/Chat/Artifact Document',
  component: ChatArtifactDocumentComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    status: {
      control: 'select',
      options: ['pending', 'loading', 'succeeded', 'failed'],
    },
    toolName: { control: 'text' },
    documentId: { control: 'text' },
    loader: { control: false, table: { disable: true } },
    document: { control: 'object' },
  },
  args: {
    status: 'pending',
    documentId: 'doc-expense-q3',
    document: null,
    loader,
    error: null,
    toolName: 'getDocument',
  },
};
export default meta;
type Story = StoryObj<ChatArtifactDocumentComponent>;

export const fetched: Story = {};

export const pendingToolCall: Story = {
  args: {
    loader: null,
  },
};

export const loading: Story = {
  args: {
    status: 'loading',
  },
};

export const resultPreview: Story = {
  args: {
    document,
    documentId: null,
    loader: null,
  },
};

export const failed: Story = {
  args: {
    status: 'failed',
    error: 'The document service timed out.',
    loader: null,
  },
};

export const imageDocument: Story = {
  args: {
    document: {
      id: 'img-spend',
      title: 'Spend by category',
      kind: 'image',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="%230f172a"/><rect x="24" y="80" width="48" height="56" fill="%2314b8a6"/><rect x="96" y="48" width="48" height="88" fill="%2338bdf8"/></svg>',
    },
    documentId: null,
    loader: null,
  },
};
