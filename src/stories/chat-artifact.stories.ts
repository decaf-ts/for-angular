import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatArtifactComponent>([ChatArtifactComponent]);

const meta: Meta<ChatArtifactComponent> = {
  title: 'Agent/Chat/Artifact',
  component: ChatArtifactComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    kind: { control: 'select', options: ['text', 'code', 'image', 'sheet'] },
    visibility: { control: 'select', options: ['private', 'shared', 'public'] },
    streaming: { control: 'boolean' },
    content: { control: 'text' },
    closable: { control: 'boolean' },
  },
  args: {
    title: 'Q3 expense summary',
    kind: 'text',
    visibility: 'private',
    streaming: false,
    content:
      'Total submitted: EUR 12,480.00\nApproved: 18 of 21 claims\nOutstanding: 3 claims awaiting review',
    closable: true,
  },
};
export default meta;
type Story = StoryObj<ChatArtifactComponent>;

export const textArtifact: Story = {};

export const codeArtifact: Story = {
  args: {
    title: 'delayed-orders.ts',
    kind: 'code',
    content:
      'export async function delayedOrders(limit = 3) {\n  return orders.where({ status: "delayed" }).limit(limit);\n}',
  },
};

export const streamingArtifact: Story = {
  args: {
    title: 'Quarterly report',
    streaming: true,
    content: 'Drafting the executive summary…',
  },
};

export const sharedImageArtifact: Story = {
  args: {
    title: 'Spend by category',
    kind: 'image',
    visibility: 'shared',
    content:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="%230f172a"/><rect x="24" y="80" width="48" height="56" fill="%2314b8a6"/><rect x="96" y="48" width="48" height="88" fill="%2338bdf8"/><rect x="168" y="64" width="48" height="72" fill="%23a78bfa"/><rect x="240" y="32" width="48" height="104" fill="%23f59e0b"/></svg>',
    imageAlt: 'Bar chart of spend by category',
  },
};

export const publicSheet: Story = {
  args: {
    title: 'Travel policy',
    kind: 'sheet',
    visibility: 'public',
    content: 'class,limit\nflights,600\nequipment,400',
  },
};
