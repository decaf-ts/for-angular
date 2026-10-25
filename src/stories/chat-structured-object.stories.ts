import type { Meta, StoryObj } from '@storybook/angular';
import { ChatStructuredObjectComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const PARTIAL = {
  expense: { vendor: 'Acme Freight', total: 128.4 },
  category: 'logistics',
  approved: false,
};

const FINAL = {
  expense: { vendor: 'Acme Freight', total: 128.4, currency: 'EUR' },
  category: 'logistics',
  approved: true,
  submittedAt: '2026-10-25T10:12:00.000Z',
};

const component = getComponentMeta<ChatStructuredObjectComponent>([ChatStructuredObjectComponent]);

const meta: Meta<ChatStructuredObjectComponent> = {
  title: 'Agent/Chat/Structured Object',
  component: ChatStructuredObjectComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    value: { control: 'object' },
    rawMode: { control: 'boolean' },
    streaming: { control: 'boolean' },
    partial: { control: 'boolean' },
    showHistory: { control: 'boolean' },
    emptyVariant: { control: 'boolean' },
  },
  args: {
    value: FINAL,
    partial: false,
    streaming: false,
    runId: 'run-expense-42',
    history: [],
    rawMode: false,
    title: null,
    showHistory: true,
    emptyVariant: true,
  },
};
export default meta;
type Story = StoryObj<ChatStructuredObjectComponent>;

export const committed: Story = {};

export const streamingGhost: Story = {
  args: {
    value: PARTIAL,
    streaming: true,
  },
};

export const withHistory: Story = {
  args: {
    value: FINAL,
    history: [
      {
        runId: 'run-expense-41',
        value: { expense: { vendor: 'Northwind', total: 88 }, category: 'supplies' },
        committedAt: '2026-10-24T16:05:00.000Z',
      },
      {
        runId: 'run-expense-40',
        value: { expense: { vendor: 'Contoso', total: 42 }, category: 'travel' },
        committedAt: '2026-10-24T09:41:00.000Z',
      },
    ],
  },
};

export const rawJson: Story = {
  args: {
    rawMode: true,
  },
};

export const empty: Story = {
  args: {
    value: null,
  },
};

export const compactEmpty: Story = {
  args: {
    value: null,
    emptyVariant: false,
  },
};
