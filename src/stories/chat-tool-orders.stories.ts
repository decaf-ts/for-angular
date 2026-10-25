import type { Meta, StoryObj } from '@storybook/angular';
import { ChatToolOrdersComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatOrder } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const ORDERS: AgentChatOrder[] = [
  {
    id: 'ORD-2026-0114',
    name: 'Studio Monitor Headphones',
    date: '2026-10-02',
    icon: 'invoice',
    status: 'delayed',
  },
  {
    id: 'ORD-2026-0117',
    name: 'Mechanical Keyboard — TKL',
    date: '2026-10-05',
    icon: 'box',
    status: 'in transit',
  },
  {
    id: 'ORD-2026-0121',
    name: 'USB-C Docking Station',
    date: '2026-10-09',
    icon: 'box',
    status: 'delivered',
  },
];

const component = getComponentMeta<ChatToolOrdersComponent>([ChatToolOrdersComponent]);

const meta: Meta<ChatToolOrdersComponent> = {
  title: 'Agent/Chat/Tool Orders',
  component: ChatToolOrdersComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    orders: { control: false, table: { disable: true } },
    title: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<ChatToolOrdersComponent>;

export const defaultState: Story = {
  name: 'Default',
  args: { orders: ORDERS, title: null },
};

export const customTitle: Story = {
  args: { orders: ORDERS.slice(0, 2), title: 'Delayed orders' },
};

export const empty: Story = {
  args: { orders: [], title: null },
};
