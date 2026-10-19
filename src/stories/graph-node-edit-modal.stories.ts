/**
 * @module for-angular/stories/graph-node-edit-modal
 * @summary Storybook stories for the graph node edit modal.
 * @description Covers {@link GraphNodeEditModalComponent} parameter editing for manifest-declared node kinds.
 */
import { PortDirection, type GraphNodeInstance, type GraphParameterDefinition } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphNodeEditModalComponent } from 'diagrams/src/lib/graph/components/graph-node-edit-modal/graph-node-edit-modal.component';
import type { GraphDemoNodeData } from 'diagrams/src/lib/graph/types';
import './setup';
import { getComponentMeta } from './utils';

const CONDITION_PORTS = [
  {
    property: 'condition',
    name: 'condition',
    label: 'Condition',
    direction: PortDirection.INPUT,
    type: 'code',
    required: true,
    hidden: false,
    element: { tag: 'code-editor' },
    graph: { direction: PortDirection.INPUT, userControlled: true },
  },
];

const CODE_PORTS = [
  {
    property: 'code',
    name: 'code',
    label: 'Code',
    direction: PortDirection.INPUT,
    type: 'code',
    required: true,
    hidden: false,
    element: { tag: 'code-editor' },
    graph: { direction: PortDirection.INPUT, userControlled: true },
  },
];

function buildNodeData(kind: string, title: string, ports: unknown[]): GraphDemoNodeData {
  return {
    title,
    description: title,
    kind,
    labels: [],
    ports: ports as GraphDemoNodeData['ports'],
    sourceClass: kind,
  };
}

const conditionParameter: GraphParameterDefinition = {
  id: 'condition',
  label: 'Condition',
  type: 'code',
  language: 'javascript',
  required: true,
};

const conditionInstance: GraphNodeInstance = {
  id: 'if-1',
  kind: 'core.flow.if',
  parameters: {
    condition: { type: 'code', code: 'return $input.value > 0;', language: 'javascript' },
  },
  inputBindings: {},
};

const codeInstance: GraphNodeInstance = {
  id: 'code-1',
  kind: 'core.utility.code',
  parameters: {
    code: { mode: 'expression', expression: 'return $input.value * 2;', language: 'javascript' },
  },
  inputBindings: {},
};

const component = getComponentMeta<GraphNodeEditModalComponent>([]);
const meta: Meta<GraphNodeEditModalComponent> = {
  title: 'Graph/Node Edit Modal',
  component: GraphNodeEditModalComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    nodeData: { control: false, table: { disable: true } },
    nodeInstance: { control: false, table: { disable: true } },
    parameterDefs: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphNodeEditModalComponent>;

export const conditionNode: Story = {
  args: {
    nodeTitle: 'If',
    nodeId: 'if-1',
    nodeData: buildNodeData('core.flow.if', 'If', CONDITION_PORTS),
    nodeInstance: conditionInstance,
    parameterDefs: [conditionParameter],
  },
};

export const codeNodeValueModes: Story = {
  args: {
    nodeTitle: 'Code',
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', CODE_PORTS),
    nodeInstance: codeInstance,
    parameterDefs: [],
  },
};

export const genericNode: Story = {
  args: {
    nodeTitle: 'Log',
    nodeId: 'log-1',
    nodeData: buildNodeData('core.flow.log', 'Log', []),
    nodeInstance: { id: 'log-1', kind: 'core.flow.log', parameters: {} },
    parameterDefs: [],
  },
};

export const degradedCatalogue: Story = {
  args: {
    nodeTitle: 'Code',
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', CODE_PORTS),
    nodeInstance: codeInstance,
    parameterDefs: [],
    degraded: true,
    degradedReason:
      'The node catalogue backend is unavailable; dynamic parameter options may be incomplete.',
  },
};

export const booleanAndTextParameters: Story = {
  args: {
    nodeTitle: 'Log',
    nodeId: 'log-1',
    nodeData: buildNodeData('core.flow.log', 'Log', []),
    nodeInstance: { id: 'log-1', kind: 'core.flow.log', parameters: {} },
    parameterDefs: [
      { id: 'level', label: 'Level', type: 'textinput', required: true },
      { id: 'strict', label: 'Strict mode', type: 'boolean', required: false },
      { id: 'timeoutMs', label: 'Timeout (ms)', type: 'number', required: false },
    ] as GraphParameterDefinition[],
  },
};

export const withOutputPorts: Story = {
  args: {
    nodeTitle: 'Code',
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', [
      ...CODE_PORTS,
      {
        property: 'result',
        name: 'result',
        label: 'Result',
        direction: PortDirection.OUTPUT,
        type: 'text',
        required: true,
        hidden: false,
      },
      {
        property: 'error',
        name: 'error',
        label: 'Error',
        direction: PortDirection.OUTPUT,
        type: 'text',
        required: false,
        hidden: false,
      },
    ]),
    nodeInstance: codeInstance,
    parameterDefs: [],
  },
};

export const literalValueMode: Story = {
  args: {
    nodeTitle: 'Code',
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', CODE_PORTS),
    nodeInstance: {
      id: 'code-1',
      kind: 'core.utility.code',
      parameters: {
        code: { mode: 'literal', value: 'return 42;' },
      },
      inputBindings: {},
    } as GraphNodeInstance,
    parameterDefs: [],
  },
};
