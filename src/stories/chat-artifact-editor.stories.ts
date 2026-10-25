import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactEditorComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatArtifactEditorComponent>([ChatArtifactEditorComponent]);

const meta: Meta<ChatArtifactEditorComponent> = {
  title: 'Agent/Chat/Artifact Editor',
  component: ChatArtifactEditorComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    kind: { control: 'select', options: ['text', 'code', 'image', 'sheet'] },
    content: { control: 'text' },
    language: { control: 'text' },
    editable: { control: 'boolean' },
    placeholder: { control: 'text' },
    ariaLabel: { control: 'text' },
  },
  args: {
    kind: 'code',
    content:
      'export async function delayedOrders(limit = 3) {\n  return orders.where({ status: "delayed" }).limit(limit);\n}',
    language: 'ts',
    editable: true,
    src: null,
    imageAlt: null,
    placeholder: null,
    ariaLabel: null,
  },
};
export default meta;
type Story = StoryObj<ChatArtifactEditorComponent>;

export const codeEditor: Story = {};

export const textEditor: Story = {
  args: {
    kind: 'text',
    content: 'Total submitted: EUR 12,480.00\nApproved claims: 18 of 21',
    language: null,
  },
};

export const sheetEditor: Story = {
  args: {
    kind: 'sheet',
    content: 'class,limit\nflights,600\nequipment,400',
    language: null,
  },
};

export const readOnly: Story = {
  args: {
    editable: false,
  },
};

export const imageEditor: Story = {
  args: {
    kind: 'image',
    content: '',
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="%230f172a"/><rect x="24" y="80" width="48" height="56" fill="%2314b8a6"/><rect x="96" y="48" width="48" height="88" fill="%2338bdf8"/></svg>',
    imageAlt: 'Spend by category',
  },
};

export const emptyImage: Story = {
  args: {
    kind: 'image',
    content: '',
    src: null,
  },
};
