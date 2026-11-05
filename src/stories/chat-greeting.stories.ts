import type { Meta, StoryObj } from '@storybook/angular';
import { ChatGreetingComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatGreetingComponent>([ChatGreetingComponent]);

const meta: Meta<ChatGreetingComponent> = {
  title: 'Agent/Chat/Greeting',
  component: ChatGreetingComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    variant: { control: 'select', options: ['greeting', 'info'] },
    icon: { control: 'text' },
    iconSize: { control: { type: 'range', min: 16, max: 48, step: 2 } },
    linkHref: { control: 'text' },
    linkLabel: { control: 'text' },
    title: { control: 'text' },
    message: { control: 'text' },
  },
  args: {
    variant: 'greeting',
    title: null,
    message: null,
    icon: 'sparkles',
    iconSize: 28,
    linkHref: null,
    linkLabel: null,
    animated: true,
  },
};
export default meta;
type Story = StoryObj<ChatGreetingComponent>;

export const greeting: Story = {};

export const infoCard: Story = {
  args: {
    variant: 'info',
    title: 'Ask about your shipments',
    message:
      'Attach an order export or paste a tracking number to get a status summary.',
    icon: 'box',
  },
};

export const infoCardWithLink: Story = {
  args: {
    variant: 'info',
    title: 'Use the knowledge base',
    message: 'Answers are grounded in the documents you select in the composer.',
    icon: 'file',
    linkHref: 'https://example.com/knowledge-base',
    linkLabel: 'Open the knowledge base',
  },
};

export const staticCard: Story = {
  args: {
    variant: 'info',
    title: 'No animation',
    animated: false,
  },
};
