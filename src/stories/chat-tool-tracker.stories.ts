import type { Meta, StoryObj } from '@storybook/angular';
import { ChatToolTrackerComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatToolTrackerComponent>([ChatToolTrackerComponent]);

const meta: Meta<ChatToolTrackerComponent> = {
  title: 'Agent/Chat/Tool Tracker',
  component: ChatToolTrackerComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    status: {
      control: 'select',
      options: ['ordered', 'shipped', 'delivered', 'cancelled'],
    },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    label: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    status: 'shipped',
    progress: null,
    label: null,
    description: null,
  },
};
export default meta;
type Story = StoryObj<ChatToolTrackerComponent>;

export const ordered: Story = {
  args: { status: 'ordered' },
};

export const shipped: Story = {
  args: { status: 'shipped' },
};

export const delivered: Story = {
  args: { status: 'delivered' },
};

export const cancelled: Story = {
  args: { status: 'cancelled' },
};

export const customProgress: Story = {
  args: {
    status: 'shipped',
    progress: 88,
    label: '88% · Arriving tomorrow',
    description: 'The parcel reached the local distribution centre.',
  },
};
