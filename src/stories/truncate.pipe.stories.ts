import type { Meta, StoryObj } from '@storybook/angular';
import { DecafTruncatePipe } from 'src/lib/pipes';
import './setup';
import { getComponentMeta } from './utils';

interface TruncateStoryArgs {
  value: string;
  limit: number;
  trail: string;
}

const component = getComponentMeta<DecafTruncatePipe>([DecafTruncatePipe]);
const meta: Meta<DecafTruncatePipe> = {
  title: 'Pipes/Truncate',
  component: DecafTruncatePipe,

  ...component,
  render: (args) => {
    const pipeArgs = args as unknown as TruncateStoryArgs;
    return {
      template: '<code>{{ value | truncate:limit:trail }}</code>',
      props: pipeArgs,
    };
  },
  args: {
    value: 'This is a fairly long text that will be cut off by the truncate pipe.',
    limit: 30,
    trail: '...',
  } as unknown as Partial<DecafTruncatePipe>,
};
export default meta;
type Story = StoryObj<DecafTruncatePipe>;

export const Default: Story = {
  args: {
    value: 'This is a fairly long text that will be cut off by the truncate pipe.',
  } as unknown as Partial<DecafTruncatePipe>,
};

export const CustomTrail: Story = {
  args: {
    value: 'This is a fairly long text that will end with a custom trail.',
    trail: '…',
  } as unknown as Partial<DecafTruncatePipe>,
};

export const ShortLimit: Story = {
  args: {
    value: 'This text gets truncated very aggressively.',
    limit: 10,
  } as unknown as Partial<DecafTruncatePipe>,
};

export const EmptyValue: Story = {
  args: {
    value: '',
  } as unknown as Partial<DecafTruncatePipe>,
};

export const NoTruncationNeeded: Story = {
  args: {
    value: 'Short label',
    limit: 30,
  } as unknown as Partial<DecafTruncatePipe>,
};

export const StripsMarkup: Story = {
  args: {
    value: '<strong>Rich</strong> <em>marked up</em> text that is long enough to be truncated by the pipe.',
    limit: 24,
  } as unknown as Partial<DecafTruncatePipe>,
};
