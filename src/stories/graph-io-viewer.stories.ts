import type { Meta, StoryObj } from '@storybook/angular';
import { GraphIoViewerComponent } from 'src/graph/components/graph-io-viewer/graph-io-viewer.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<GraphIoViewerComponent>([]);
const meta: Meta<GraphIoViewerComponent> = {
  title: 'Graph/Panels/IO Viewer',
  component: GraphIoViewerComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    value: { control: false, table: { disable: true } },
    error: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphIoViewerComponent>;

export const objectValue: Story = {
  args: {
    title: 'Run inputs',
    value: { text: 'hello world', count: 3, nested: { ok: true } },
  },
};

export const arrayValue: Story = {
  args: {
    title: 'Run outputs',
    value: ['alpha', 'beta', 'gamma'],
  },
};

export const primitiveValue: Story = {
  args: {
    title: 'Run outputs',
    value: 'plain text result',
  },
};

export const errorValue: Story = {
  args: {
    title: 'Run outputs',
    value: null,
    error: {
      name: 'GraphNodeError',
      message: 'Code node failed: reference $input.value is not defined',
      stack: 'Error: reference $input.value is not defined\n    at CodeGraphNodeExecutor.run (code.executor.ts:42)',
    },
  },
};

export const empty: Story = {
  args: {
    title: 'Run outputs',
    value: null,
  },
};
