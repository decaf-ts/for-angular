/**
 * @module for-angular/stories/graph-switch-edit-modal
 * @summary Storybook stories for the switch-node edit modal.
 * @description Covers {@link GraphSwitchEditModalComponent} case/default routing configuration.
 */
import type { SwitchNodeMetadata } from '@decaf-ts/as-graph/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { GraphSwitchEditModalComponent } from 'diagrams/src/lib/graph/components/graph-switch-edit-modal/graph-switch-edit-modal.component';
import './setup';
import { getComponentMeta } from './utils';

const INPUT_PROPERTIES = ['value', 'status', 'count'];

const EMPTY_METADATA: SwitchNodeMetadata = { cases: [], defaultPort: 'default' };

const POPULATED_METADATA: SwitchNodeMetadata = {
  defaultPort: 'fallback',
  hasDefault: true,
  cases: [
    {
      id: 'case-ok',
      label: 'Approved',
      outputPort: 'approved',
      condition: { op: 'eq', left: { path: 'status' }, right: { const: 'ok' } },
    },
    {
      id: 'case-count',
      label: 'Many items',
      outputPort: 'many_items',
      condition: { op: 'gt', left: { path: 'count' }, right: { const: 10 } },
    },
    {
      id: 'case-code',
      label: 'Custom',
      outputPort: 'custom',
      condition: { type: 'code', code: 'return $input.value.length > 3;', language: 'javascript' },
    },
  ],
};

const component = getComponentMeta<GraphSwitchEditModalComponent>([]);
const meta: Meta<GraphSwitchEditModalComponent> = {
  title: 'Graph/Modals/Switch Edit',
  component: GraphSwitchEditModalComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    initialSwitchMetadata: { control: false, table: { disable: true } },
  },
};
export default meta;
type Story = StoryObj<GraphSwitchEditModalComponent>;

export const emptyCases: Story = {
  args: {
    nodeTitle: 'Switch',
    nodeId: 'switch-1',
    inputProperties: INPUT_PROPERTIES,
    initialSwitchMetadata: EMPTY_METADATA,
  },
};

export const populatedCases: Story = {
  args: {
    nodeTitle: 'Route by status',
    nodeId: 'switch-2',
    inputProperties: INPUT_PROPERTIES,
    initialSwitchMetadata: POPULATED_METADATA,
  },
};

export const noDefaultPort: Story = {
  args: {
    nodeTitle: 'Route by status',
    nodeId: 'switch-3',
    inputProperties: INPUT_PROPERTIES,
    initialSwitchMetadata: {
      defaultPort: 'default',
      hasDefault: false,
      cases: POPULATED_METADATA.cases,
    },
  },
};

export const singleCase: Story = {
  args: {
    nodeTitle: 'Switch',
    nodeId: 'switch-4',
    inputProperties: INPUT_PROPERTIES,
    initialSwitchMetadata: {
      defaultPort: 'default',
      hasDefault: false,
      cases: [
        {
          id: 'only',
          label: 'Only branch',
          outputPort: 'only',
          condition: { op: 'exists', value: { path: 'value' } },
        },
      ],
    },
  },
};

export const manyCases: Story = {
  args: {
    nodeTitle: 'Route by status',
    nodeId: 'switch-5',
    inputProperties: INPUT_PROPERTIES,
    initialSwitchMetadata: {
      defaultPort: 'default',
      hasDefault: true,
      cases: Array.from({ length: 8 }, (_, index) => ({
        id: `case-${index}`,
        label: `Branch ${index + 1}`,
        outputPort: `branch_${index + 1}`,
        condition: { op: 'eq', left: { path: 'status' }, right: { const: `s${index}` } },
      })),
    },
  },
};
