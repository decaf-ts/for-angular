/**
 * @module for-angular/stories/graph-workflow-input-editor
 * @summary Storybook stories for the workflow input editor.
 * @description Covers {@link GraphWorkflowInputEditorComponent} declared input-port editing, including the port-instance fields used by the fixture catalog documents (G1/SAA-783).
 */
import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphWorkflowInputEditorComponent } from 'src/diagrams/components/graph/components/graph-node-inspection/graph-workflow-input-editor.component';
import type { WorkflowInputFieldDefinition } from 'src/diagrams/components/graph/workflow-inputs';
import './setup';
import { getComponentMeta } from './utils';

function fieldOf(
  controlName: string,
  label: string,
  controlType: WorkflowInputFieldDefinition['controlType'],
  value: unknown
): WorkflowInputFieldDefinition {
  return {
    property: controlName,
    path: controlName,
    controlName,
    label,
    controlType,
    value,
    validators: [Validators.required],
    required: true,
  };
}

const component = getComponentMeta<GraphWorkflowInputEditorComponent>([]);
const meta: Meta<GraphWorkflowInputEditorComponent> = {
  title: 'Graph/Modals/Workflow Input Editor',
  component: GraphWorkflowInputEditorComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    field: { control: false, table: { disable: true } },
    form: { control: false, table: { disable: true } },
    value: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphWorkflowInputEditorComponent>;

export const inputText: Story = {
  args: {
    role: 'input',
    field: fieldOf('text', 'Text', 'text', 'hello world'),
    form: new FormGroup({ text: new FormControl('hello world') }),
  },
};

export const inputTextarea: Story = {
  args: {
    role: 'input',
    field: fieldOf('body', 'Body', 'textarea', 'line one\nline two'),
    form: new FormGroup({ body: new FormControl('line one\nline two') }),
  },
};

export const inputNumber: Story = {
  args: {
    role: 'input',
    field: fieldOf('count', 'Count', 'number', 3),
    form: new FormGroup({ count: new FormControl(3) }),
  },
};

export const inputCheckbox: Story = {
  args: {
    role: 'input',
    field: fieldOf('enabled', 'Enabled', 'checkbox', true),
    form: new FormGroup({ enabled: new FormControl(true) }),
  },
};

export const outputReadOnlyObject: Story = {
  args: {
    role: 'output',
    value: { result: 42, ok: true },
  },
};

export const outputReadOnlyEmpty: Story = {
  args: {
    role: 'output',
    value: null,
  },
};
