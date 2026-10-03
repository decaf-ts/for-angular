import type { SwitchCaseCondition } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphConditionEditorComponent } from 'src/graph/components/graph-condition-editor/graph-condition-editor.component';
import './setup';
import { getComponentMeta } from './utils';

const INPUT_PROPERTIES = ['value', 'status', 'count'];

const component = getComponentMeta<GraphConditionEditorComponent>([]);
const meta: Meta<GraphConditionEditorComponent> = {
  title: 'Graph/Inputs/Condition Editor',
  component: GraphConditionEditorComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    condition: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphConditionEditorComponent>;

export const graphicalEmpty: Story = {
  args: { inputProperties: INPUT_PROPERTIES, condition: null },
};

export const graphicalEquals: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'eq', left: { path: 'status' }, right: { const: 'ok' } } as SwitchCaseCondition,
  },
};

export const graphicalGreaterThan: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'gt', left: { path: 'count' }, right: { const: 10 } } as SwitchCaseCondition,
  },
};

export const graphicalExists: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'exists', value: { path: 'value' } } as SwitchCaseCondition,
  },
};

export const codeMode: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: {
      type: 'code',
      code: 'return $input.value.length > 3;',
      language: 'javascript',
    } as SwitchCaseCondition,
  },
};
