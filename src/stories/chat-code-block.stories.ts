import type { Meta, StoryObj } from '@storybook/angular';
import { ChatCodeBlockComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const TYPESCRIPT = `import { orders } from "./data";

export async function delayedOrders(status: string, limit = 3) {
  // Only surface the oldest delayed orders
  return orders
    .where({ status })
    .orderBy("createdAt", "asc")
    .limit(limit);
}`;

const PYTHON = `def delayed_orders(status: str, limit: int = 3):
    # Oldest first
    return (
        orders.where(status=status)
        .order_by("created_at")
        .limit(limit)
    )`;

const component = getComponentMeta<ChatCodeBlockComponent>([ChatCodeBlockComponent]);

const meta: Meta<ChatCodeBlockComponent> = {
  title: 'Agent/Chat/Code Block',
  component: ChatCodeBlockComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    code: { control: 'text' },
    language: { control: 'text' },
    filename: { control: 'text' },
    title: { control: 'text' },
  },
  args: {
    code: TYPESCRIPT,
    language: 'ts',
    filename: 'delayed-orders.ts',
    title: null,
    copyable: true,
    highlight: true,
    showHeader: true,
  },
};
export default meta;
type Story = StoryObj<ChatCodeBlockComponent>;

export const typescript: Story = {};

export const python: Story = {
  args: {
    code: PYTHON,
    language: 'python',
    filename: 'delayed_orders.py',
  },
};

export const languageOnly: Story = {
  args: {
    code: 'npm run start:backend',
    language: 'bash',
    filename: null,
  },
};

export const plainText: Story = {
  args: {
    code: TYPESCRIPT,
    language: null,
    filename: null,
    highlight: false,
  },
};

export const readOnly: Story = {
  args: {
    copyable: false,
  },
};
