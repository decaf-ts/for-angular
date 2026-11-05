import type { Meta, StoryObj } from '@storybook/angular';
import { ChatToolWeatherComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatToolWeatherComponent>([ChatToolWeatherComponent]);

const meta: Meta<ChatToolWeatherComponent> = {
  title: 'Agent/Chat/Tool Weather',
  component: ChatToolWeatherComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    location: { control: 'text' },
    condition: { control: 'text' },
    high: { control: 'number' },
    low: { control: 'number' },
    unit: { control: 'text' },
    night: { control: 'boolean' },
    state: {
      control: 'select',
      options: ['loading', 'success', 'error'],
    },
    error: { control: 'text' },
  },
  args: {
    location: 'Lisbon',
    condition: null,
    high: 24,
    low: 16,
    unit: '°C',
    night: false,
    state: 'success',
    error: null,
  },
};
export default meta;
type Story = StoryObj<ChatToolWeatherComponent>;

export const day: Story = {
  args: { location: 'Lisbon', high: 24, low: 16 },
};

export const night: Story = {
  args: {
    location: 'Porto',
    condition: 'Clear night',
    high: 15,
    low: 9,
    night: true,
  },
};

export const fahrenheit: Story = {
  args: {
    location: 'New York',
    condition: 'Partly cloudy',
    high: 68,
    low: 51,
    unit: '°F',
  },
};

export const loading: Story = {
  args: { state: 'loading', location: 'Madrid' },
};

export const error: Story = {
  args: {
    state: 'error',
    location: 'Madrid',
    error: 'The weather provider did not respond.',
  },
};
