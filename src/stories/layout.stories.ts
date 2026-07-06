import { LayoutGridGaps } from '@decaf-ts/ui-decorators';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from 'src/lib/components/card/card.component';
import { ComponentRendererComponent } from 'src/lib/components/component-renderer/component-renderer.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { LayoutComponent } from 'src/lib/components/layout/layout.component';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<LayoutComponent>([
  TranslatePipe,
  CardComponent,
  IconComponent,
  ModelRendererComponent,
  ComponentRendererComponent,
]);
const meta: Meta<LayoutComponent> = {
  title: 'Components/Layout',
  component: LayoutComponent,

  ...component,
  args: {
    cols: 2,
    rows: 1,
    grid: true,
    gap: LayoutGridGaps.collapse,
    match: true,
    accordion: false,
    children: [
      { tag: 'ngx-decaf-card', props: { row: 1, col: 1, title: 'Card One', subtitle: 'First column' } },
      { tag: 'ngx-decaf-card', props: { row: 1, col: 2, title: 'Card Two', subtitle: 'Second column' } },
    ],
  },
};
export default meta;
type Story = StoryObj<LayoutComponent>;

export const init: Story = {};

export const threeColumns: Story = {
  args: {
    cols: 3,
    gap: LayoutGridGaps.medium,
    children: [
      { tag: 'ngx-decaf-card', props: { row: 1, col: 1, title: 'Card One', subtitle: 'First column' } },
      { tag: 'ngx-decaf-card', props: { row: 1, col: 2, title: 'Card Two', subtitle: 'Second column' } },
      { tag: 'ngx-decaf-card', props: { row: 1, col: 3, title: 'Card Three', subtitle: 'Third column' } },
    ],
  },
};

export const accordion: Story = {
  args: {
    accordion: true,
    children: [
      { tag: 'ngx-decaf-card', props: { row: 1, col: 1, title: 'Always visible' } },
      { tag: 'ngx-decaf-card', props: { row: 1, col: 2, title: 'Collapsible content' } },
    ],
  },
};
