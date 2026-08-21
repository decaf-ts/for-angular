import type { Meta, StoryObj } from '@storybook/angular';
import { CronSelectorComponent } from 'src/lib/components/cron-selector/cron-selector.component';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<CronSelectorComponent>([]);
const meta: Meta<CronSelectorComponent> = {
  title: 'Components/Cron Selector',
  component: CronSelectorComponent,

  ...component,
  args: {
    value: '0 9 * * *',
    hideDaily: false,
    hideInterval: false,
    hideWeekly: false,
    describeCron: false,
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<CronSelectorComponent>;

export const Daily: Story = {};

export const DailyMultipleTimes: Story = {
  args: {
    value: '0 9,12,18 * * *',
  },
};

export const Hourly: Story = {
  args: {
    value: '0 */4 * * *',
  },
};

export const Weekly: Story = {
  args: {
    value: '0 9 * * 1,3,5',
  },
};

export const DescribeSchedule: Story = {
  args: {
    describeCron: true,
    value: '0 8,20 * * *',
  },
};

export const HourlyHidden: Story = {
  args: {
    value: '0 9 * * *',
    hideInterval: true,
  },
};

export const WeeklyHidden: Story = {
  args: {
    value: '0 9 * * *',
    hideWeekly: true,
  },
};

export const DailyHidden: Story = {
  args: {
    value: '0 */6 * * *',
    hideDaily: true,
  },
};

export const OnlyWeekly: Story = {
  args: {
    value: '0 9 * * 1,2,3,4,5',
    hideDaily: true,
    hideInterval: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: '0 9 * * *',
  },
};
