/**
 * @module for-angular/stories/graph-condition-editor
 * @summary Storybook stories for the graph condition editor.
 * @description Covers {@link GraphConditionEditorComponent} expression editing across its supported field configurations.
 */
import type { SwitchCaseCondition } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphConditionEditorComponent } from 'src/diagrams/components/graph/components/graph-condition-editor/graph-condition-editor.component';
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

export const graphicalNotEquals: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'neq', left: { path: 'status' }, right: { const: 'error' } } as SwitchCaseCondition,
  },
};

export const graphicalGreaterOrEqual: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'gte', left: { path: 'count' }, right: { const: 10 } } as SwitchCaseCondition,
  },
};

export const graphicalLessThan: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'lt', left: { path: 'count' }, right: { const: 100 } } as SwitchCaseCondition,
  },
};

export const graphicalLessOrEqual: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'lte', left: { path: 'count' }, right: { const: 100 } } as SwitchCaseCondition,
  },
};

export const graphicalIncomplete: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: { op: 'eq', left: { path: '' }, right: { const: '' } } as SwitchCaseCondition,
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

export const codeModeInvalid: Story = {
  args: {
    inputProperties: INPUT_PROPERTIES,
    condition: {
      type: 'code',
      code: 'return ;',
      language: 'javascript',
    } as SwitchCaseCondition,
  },
};
