import type { Meta, StoryObj } from '@storybook/angular';
import { MathInputComponent } from 'src/lib/components/math-input/math-input.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<MathInputComponent>([]);
const meta: Meta<MathInputComponent> = {
  title: 'Components/Math Input',
  component: MathInputComponent,

  ...component,
  args: {
    value: '\\frac{1}{2} x^{2}',
    placeholder: 'Type a formula',
    disabled: false,
    valueChange: fn(),
  },
};
export default meta;
type Story = StoryObj<MathInputComponent>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    value: '',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
