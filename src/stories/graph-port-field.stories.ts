import { PortDirection, type GraphPortDefinition } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphPortFieldComponent } from 'src/graph/components/graph-port-field/graph-port-field.component';
import './setup';
import { getComponentMeta } from './utils';

function buildPort(overrides: Partial<GraphPortDefinition> = {}): GraphPortDefinition {
  return {
    property: 'value',
    name: 'value',
    label: 'Value',
    direction: PortDirection.INPUT,
    type: 'string',
    required: false,
    hidden: false,
    ...overrides,
  };
}

function buildField(
  port: GraphPortDefinition,
  useAsPort = false,
  value = ''
): { port: GraphPortDefinition; label: string; type: string; value: string; useAsPort: boolean } {
  return {
    port,
    label: port.label || port.name,
    type: port.type || 'text',
    value,
    useAsPort,
  };
}

const component = getComponentMeta<GraphPortFieldComponent>([]);
const meta: Meta<GraphPortFieldComponent> = {
  title: 'Graph/Port Field',
  component: GraphPortFieldComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    field: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphPortFieldComponent>;

export const literalValue: Story = {
  args: {
    field: buildField(buildPort()),
  },
};

export const expressionModes: Story = {
  args: {
    field: {
      ...buildField(
        buildPort({
          property: 'code',
          name: 'code',
          label: 'Code',
          type: 'code',
          element: { tag: 'code-editor' },
          graph: { direction: PortDirection.INPUT, userControlled: true },
        })
      ),
      value: 'return $input.value * 2;',
      valueMode: 'expression',
    },
  },
};

export const delegatedToPort: Story = {
  args: {
    field: buildField(
      buildPort({ graph: { direction: PortDirection.INPUT, userControlled: true } }),
      true
    ),
  },
};

export const outputSplit: Story = {
  args: {
    field: buildField(
      buildPort({
        property: 'result',
        name: 'result',
        label: 'Result',
        direction: PortDirection.OUTPUT,
      })
    ),
  },
};
