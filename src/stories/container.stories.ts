import type { Meta, StoryObj } from '@storybook/angular';
import { ContainerComponent } from 'src/lib/components/container/container.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ContainerComponent>([]);

const meta: Meta<ContainerComponent> = {
  title: 'Components/Container',
  component: ContainerComponent,
  ...component,
  render: (args) => ({
    props: args,
    template: `
      <ngx-decaf-container
        [flex]="flex"
        [position]="position"
        [fullscreen]="fullscreen"
        [size]="size">
        <div slot="content" style="padding: 16px; border: 1px dashed #999;">
          Container content ({{ size }} / {{ position }})
        </div>
      </ngx-decaf-container>
    `,
  }),
  args: {
    flex: true,
    position: 'center',
    fullscreen: false,
    size: 'expand',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    size: {
      control: 'select',
      options: ['block', 'small', 'medium', 'large', 'expand'],
    },
  },
};
export default meta;
type Story = StoryObj<ContainerComponent>;

export const init: Story = {};

export const fixedMedium: Story = {
  args: {
    size: 'medium',
  },
};

export const noFlex: Story = {
  args: {
    flex: false,
  },
};

export const fullscreenCentered: Story = {
  args: {
    fullscreen: true,
    position: 'center',
  },
};
