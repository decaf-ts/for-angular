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

export const nonFlexColumnSpan: Story = {
  args: {
    cols: 3,
    rows: 2,
    children: [
      { tag: 'ngx-decaf-card', props: { row: 1, col: 1, title: 'Span 1 of 3' } },
      { tag: 'ngx-decaf-card', props: { row: 1, col: 2, title: 'Span 2 of 3' } },
      { tag: 'ngx-decaf-card', props: { row: 2, col: 3, title: 'Span 3 of 3 (full width)' } },
    ],
  },
};

export const nonFlexOverflowFallback: Story = {
  args: {
    cols: 2,
    rows: 1,
    children: [
      { tag: 'ngx-decaf-card', props: { row: 1, col: 1, title: 'Half width (1 of 2)' } },
      { tag: 'ngx-decaf-card', props: { row: 1, col: 3, title: 'Requests 3 of 2 (fallback full width)' } },
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
