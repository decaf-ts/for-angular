import type { Meta, StoryObj } from '@storybook/angular';
import { DecafTooltipDirective } from 'src/lib/directives';
import './setup';
import { getComponentMeta } from './utils';

interface TooltipStoryArgs {
  content: string;
  text: string;
  truncate: boolean;
  limit: number;
  trail: string;
  position: 'top' | 'bottom' | 'over';
}

const component = getComponentMeta<DecafTooltipDirective>([DecafTooltipDirective]);
const meta: Meta<DecafTooltipDirective> = {
  title: 'Directives/Tooltip',
  component: DecafTooltipDirective,

  ...component,
  render: (args) => {
    const tooltipArgs = args as unknown as TooltipStoryArgs;
    return {
      template: `
        <div style="padding: 48px; font-family: var(--ion-font-family);">
          <span
            [ngx-decaf-tooltip]="{ text: text, truncate: truncate, limit: limit, trail: trail, position: position }"
            style="max-width: 320px; display: inline-block;">
            {{ content }}
          </span>
        </div>
      `,
      props: tooltipArgs,
    };
  },
  args: {
    content: 'Vegan options at West Coast Restaurant',
    text: 'Vegan options at West Coast Restaurant',
    truncate: false,
    limit: 30,
    trail: '...',
    position: 'top',
  } as unknown as Partial<DecafTooltipDirective>,
};
export default meta;
type Story = StoryObj<DecafTooltipDirective>;

export const Default: Story = {
  args: {
    content: 'This is a very long description that should exceed the default tooltip limit to show a tooltip.',
    text: 'This is a very long description that should exceed the default tooltip limit to show a tooltip.',
  } as unknown as Partial<DecafTooltipDirective>,
};

export const Truncated: Story = {
  args: {
    content: 'This is a very long description that should be visually truncated by the directive.',
    text: 'This is a very long description that should be visually truncated by the directive.',
    truncate: true,
    limit: 24,
    trail: '…',
  } as unknown as Partial<DecafTooltipDirective>,
};

export const ShortText: Story = {
  args: {
    content: 'Short label',
    text: 'Short label',
  } as unknown as Partial<DecafTooltipDirective>,
};

export const BottomPosition: Story = {
  args: {
    content: 'This long text demonstrates the tooltip below the host element.',
    text: 'This long text demonstrates the tooltip below the host element.',
    position: 'bottom',
  } as unknown as Partial<DecafTooltipDirective>,
};
