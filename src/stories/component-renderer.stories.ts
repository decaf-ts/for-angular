import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from 'src/lib/components/card/card.component';
import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ComponentRendererComponent>([CardComponent]);
const meta: Meta<ComponentRendererComponent> = {
  title: 'Components/Component Renderer',
  component: ComponentRendererComponent,

  ...component,
  args: {
    tag: 'ngx-decaf-card',
    globals: {
      props: {
        title: 'Rendered via tag',
        subtitle: 'Dynamically created by ComponentRendererComponent',
      },
    },
    children: [],
    projectable: true,
  },
};
export default meta;
type Story = StoryObj<ComponentRendererComponent>;

export const init: Story = {};
