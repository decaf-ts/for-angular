import type { Meta, StoryObj } from '@storybook/angular';
import { ChatProgressComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatProgressEvent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const UPLOAD_EVENTS: AgentChatProgressEvent[] = [
  {
    id: 'event-1',
    label: 'Reading knowledge base…',
    value: 2,
    total: 10,
    message: '2 of 10 documents indexed.',
  },
  {
    id: 'event-2',
    label: 'Reading knowledge base…',
    value: 7,
    total: 10,
    message: '7 of 10 documents indexed.',
  },
];

const DONE_EVENTS: AgentChatProgressEvent[] = [
  ...UPLOAD_EVENTS,
  {
    id: 'event-3',
    label: 'Knowledge base ready',
    value: 10,
    total: 10,
    done: true,
    message: 'The assistant can now answer from all 10 documents.',
  },
];

const component = getComponentMeta<ChatProgressComponent>([ChatProgressComponent]);

const meta: Meta<ChatProgressComponent> = {
  title: 'Agent/Chat/Progress',
  component: ChatProgressComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    events: { control: false, table: { disable: true } },
  },
  args: { events: UPLOAD_EVENTS },
};
export default meta;
type Story = StoryObj<ChatProgressComponent>;

export const running: Story = {};

export const done: Story = {
  args: { events: DONE_EVENTS },
};

export const indeterminate: Story = {
  args: {
    events: [
      {
        id: 'event-spinner',
        label: 'Thinking…',
        message: 'The agent is still working on your request.',
      },
    ],
  },
};

export const empty: Story = {
  args: { events: [] },
};
