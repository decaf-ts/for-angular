import type { Meta, StoryObj } from '@storybook/angular';
import { DecafTranslatePipe } from 'src/lib/pipes';
import './setup';
import { getComponentMeta } from './utils';

interface TranslateStoryArgs {
  key: string;
}

const component = getComponentMeta<DecafTranslatePipe>([DecafTranslatePipe]);
const meta: Meta<DecafTranslatePipe> = {
  title: 'Pipes/Translate',
  component: DecafTranslatePipe,

  ...component,
  render: (args) => {
    const pipeArgs = args as unknown as TranslateStoryArgs;
    return {
      template: `
        <div style="padding: 24px;
                    display: flex; flex-direction: column; gap: 8px;
                    font-family: var(--ion-font-family);">
          <code>{{ key | translate }}</code>
        </div>
      `,
      props: pipeArgs,
    };
  },
  args: {
    key: 'component.cron_selector.modes.daily',
  } as unknown as Partial<DecafTranslatePipe>,
};
export default meta;
type Story = StoryObj<DecafTranslatePipe>;

export const ExistingKey: Story = {
  args: {
    key: 'component.cron_selector.modes.daily',
  } as unknown as Partial<DecafTranslatePipe>,
};

export const WeeklyKey: Story = {
  args: {
    key: 'component.cron_selector.modes.weekly',
  } as unknown as Partial<DecafTranslatePipe>,
};

export const MissingKey: Story = {
  args: {
    key: 'app.some.untranslated.key',
  } as unknown as Partial<DecafTranslatePipe>,
};
