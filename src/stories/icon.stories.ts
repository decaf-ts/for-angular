import { IonButton, IonIcon } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { NgxSvgDirective } from 'src/lib/directives/svg.directive';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<IconComponent>([NgxSvgDirective, IonIcon, IonButton]);
const meta: Meta<IconComponent> = {
  title: 'Components/Icon',
  component: IconComponent,

  ...component,
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'light', 'medium', 'dark'],
    },
    size: {
      control: 'select',
      options: ['small', 'default', 'large'],
    },
  },
  args: {
    name: 'heart-outline',
    color: 'dark',
    size: 'default',
    slot: 'icon-only',
    button: false,
    inline: false,
  },
};
export default meta;
type Story = StoryObj<IconComponent>;

export const init: Story = {};

export const asButton: Story = {
  args: {
    button: true,
    name: 'trash-outline',
    color: 'danger',
  },
};

export const large: Story = {
  args: {
    size: 'large',
    name: 'star-outline',
  },
};

export const small: Story = {
  args: {
    size: 'small',
    name: 'star-outline',
  },
};
