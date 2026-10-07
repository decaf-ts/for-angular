import type { Meta, StoryObj } from '@storybook/angular';
import { CodeEditorComponent } from 'src/graph/components/code-editor/code-editor.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<CodeEditorComponent>([]);
const meta: Meta<CodeEditorComponent> = {
  title: 'Graph/Inputs/Code Editor',
  component: CodeEditorComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    codeChange: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<CodeEditorComponent>;

export const code: Story = {
  args: {
    mode: 'code',
    placeholder: 'return $input.value * 2;',
    code: 'const value = $input.value;\nif (typeof value !== "number") {\n  throw new Error("value must be a number");\n}\nreturn value * 2;',
  },
};

export const codeWithSyntaxError: Story = {
  args: {
    mode: 'code',
    placeholder: 'return ...',
    code: 'return $input.value * ;',
  },
};

export const formula: Story = {
  args: {
    mode: 'formula',
    placeholder: '$input.value > 0',
    code: '$input.value > 0',
  },
};

export const empty: Story = {
  args: { mode: 'code', placeholder: 'Write your code here', code: '' },
};
