/**
 * @module for-angular/stories/graph-port-field
 * @summary Storybook stories for the graph port field editor.
 * @description Covers {@link GraphPortFieldComponent} value binding across the supported port types.
 */
import { PortDirection, type GraphPortDefinition } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphPortFieldComponent } from 'src/diagrams/components/graph/components/graph-port-field/graph-port-field.component';
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

export const templateMode: Story = {
  args: {
    field: {
      ...buildField(
        buildPort({
          property: 'message',
          name: 'message',
          label: 'Message',
          type: 'code',
          graph: { direction: PortDirection.INPUT, userControlled: true },
        })
      ),
      value: 'Hello {{ $input.name }}!',
      valueMode: 'template',
    },
  },
};

export const formulaMode: Story = {
  args: {
    field: {
      ...buildField(
        buildPort({
          property: 'total',
          name: 'total',
          label: 'Total',
          type: 'code',
          element: { tag: 'formula-editor' },
          graph: { direction: PortDirection.INPUT, userControlled: true },
        })
      ),
      value: 'SUM($input.rows)',
      valueMode: 'formula',
    },
  },
};

export const textareaField: Story = {
  args: {
    field: buildField(
      buildPort({
        property: 'notes',
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        graph: { direction: PortDirection.INPUT, userControlled: true },
      }),
      false,
      'A longer free-form value rendered in a textarea.'
    ),
  },
};

export const ballDisabledWithValue: Story = {
  args: {
    field: buildField(
      buildPort({
        property: 'value',
        name: 'value',
        label: 'Value',
        graph: { direction: PortDirection.INPUT, userControlled: true },
      }),
      false,
      'provided directly'
    ),
  },
};

export const exposedAsPort: Story = {
  args: {
    field: buildField(
      buildPort({
        property: 'result',
        name: 'result',
        label: 'Result',
        direction: PortDirection.OUTPUT,
      }),
      true
    ),
  },
};
