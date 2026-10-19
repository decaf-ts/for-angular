/**
 * @module for-angular/stories/graph-node-inline-editor
 * @summary Storybook stories for the inline node editor.
 * @description Covers {@link GraphNodeInlineEditorComponent} in-canvas parameter editing for manifest-declared node kinds.
 */
import { PortDirection, type GraphNodeInstance, type GraphParameterDefinition } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphNodeInlineEditorComponent } from 'diagrams/src/lib/graph/components/graph-node-inspection/graph-node-inline-editor.component';
import type { GraphDemoNodeData } from 'diagrams/src/lib/graph/types';
import './setup';
import { getComponentMeta } from './utils';

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
  {
    property: 'result',
    name: 'result',
    label: 'Result',
    direction: PortDirection.OUTPUT,
    type: 'text',
    required: true,
    hidden: false,
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

const codeInstance: GraphNodeInstance = {
  id: 'code-1',
  kind: 'core.utility.code',
  parameters: {
    code: { mode: 'expression', expression: 'return $input.value * 2;', language: 'javascript' },
  },
  inputBindings: {},
};

const component = getComponentMeta<GraphNodeInlineEditorComponent>([]);
const meta: Meta<GraphNodeInlineEditorComponent> = {
  title: 'Graph/Modals/Node Inline Editor',
  component: GraphNodeInlineEditorComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    nodeData: { control: false, table: { disable: true } },
    nodeInstance: { control: false, table: { disable: true } },
    parameterDefs: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphNodeInlineEditorComponent>;

export const codeNode: Story = {
  args: {
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', CODE_PORTS),
    nodeInstance: codeInstance,
    parameterDefs: [],
  },
};

export const withParameters: Story = {
  args: {
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', CODE_PORTS),
    nodeInstance: codeInstance,
    parameterDefs: [
      { id: 'timeoutMs', label: 'Timeout (ms)', type: 'number', required: false },
      { id: 'strict', label: 'Strict mode', type: 'boolean', required: false },
    ] as GraphParameterDefinition[],
  },
};

export const valueProvidedPort: Story = {
  args: {
    nodeId: 'code-1',
    nodeData: buildNodeData('core.utility.code', 'Code', CODE_PORTS),
    nodeInstance: {
      id: 'code-1',
      kind: 'core.utility.code',
      parameters: {},
      inputBindings: { code: { mode: 'literal', value: 'return 1;' } },
    } as GraphNodeInstance,
    parameterDefs: [],
  },
};

export const emptyNode: Story = {
  args: {
    nodeId: 'log-1',
    nodeData: buildNodeData('core.flow.log', 'Log', []),
    nodeInstance: { id: 'log-1', kind: 'core.flow.log', parameters: {} },
    parameterDefs: [],
  },
};
