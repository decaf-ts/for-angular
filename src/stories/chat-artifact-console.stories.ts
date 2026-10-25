import type { Meta, StoryObj } from '@storybook/angular';
import { ChatArtifactConsoleComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatArtifactConsoleComponent>([ChatArtifactConsoleComponent]);

const ROWS = [
  { id: '1', level: 'log' as const, text: 'npm run build', timestamp: '10:14:02' },
  { id: '2', level: 'info' as const, text: 'Bundling artifact preview…', timestamp: '10:14:05' },
  { id: '3', level: 'warn' as const, text: 'Chunk size exceeds 500 kB after minification.', timestamp: '10:14:09' },
  { id: '4', level: 'error' as const, text: 'TypeError: cannot read properties of undefined (reading "rows")', timestamp: '10:14:10' },
];

const meta: Meta<ChatArtifactConsoleComponent> = {
  title: 'Agent/Chat/Artifact Console',
  component: ChatArtifactConsoleComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    rows: { control: 'object' },
    title: { control: 'text' },
    initialHeight: { control: { type: 'range', min: 96, max: 400, step: 8 } },
    minHeight: { control: { type: 'number' } },
    maxHeight: { control: { type: 'number' } },
    resizable: { control: 'boolean' },
    showClear: { control: 'boolean' },
  },
  args: {
    rows: ROWS,
    title: 'Build output',
    initialHeight: 200,
    minHeight: 120,
    maxHeight: 560,
    resizable: true,
    showClear: true,
  },
};
export default meta;
type Story = StoryObj<ChatArtifactConsoleComponent>;

export const output: Story = {};

export const empty: Story = {
  args: {
    rows: [],
  },
};

export const tallConsole: Story = {
  args: {
    initialHeight: 360,
  },
};

export const fixedHeight: Story = {
  args: {
    resizable: false,
    showClear: false,
  },
};

export const errorsOnly: Story = {
  args: {
    rows: ROWS.filter((row) => row.level === 'error'),
  },
};
