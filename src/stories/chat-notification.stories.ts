import type { Meta, StoryObj } from '@storybook/angular';
import { ChatNotificationComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatNotificationComponent>([ChatNotificationComponent]);

const meta: Meta<ChatNotificationComponent> = {
  title: 'Agent/Chat/Notification',
  component: ChatNotificationComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    notifications: { control: 'object' },
    autoDismissMs: { control: 'number' },
    dismissible: { control: 'boolean' },
  },
  args: {
    autoDismissMs: 0,
    dismissible: true,
    notifications: [
      {
        id: 'rate-limit',
        severity: 'warning',
        title: 'Slow down',
        message: 'You have reached the rate limit. Retry in a few seconds.',
        autoDismissMs: 0,
      },
      {
        id: 'stream-error',
        severity: 'error',
        message: 'The response stream ended unexpectedly.',
        autoDismissMs: 0,
        actionLabel: 'Retry',
      },
    ],
  },
};
export default meta;
type Story = StoryObj<ChatNotificationComponent>;

export const stacked: Story = {};

export const singleInfo: Story = {
  args: {
    notifications: [
      {
        id: 'info',
        severity: 'info',
        message: 'Structured output mode is active.',
        autoDismissMs: 0,
      },
    ],
  },
};

export const success: Story = {
  args: {
    notifications: [
      {
        id: 'saved',
        severity: 'success',
        title: 'Artifact saved',
        message: 'Version 4 is now available in the artifact panel.',
        autoDismissMs: 0,
      },
    ],
  },
};

export const autoDismiss: Story = {
  args: {
    autoDismissMs: 4000,
    notifications: [
      {
        id: 'auto',
        severity: 'info',
        message: 'This notification dismisses after four seconds.',
      },
    ],
  },
};

export const nonDismissible: Story = {
  args: {
    dismissible: false,
    notifications: [
      {
        id: 'fixed',
        severity: 'warning',
        message: 'Streaming is temporarily unavailable.',
        autoDismissMs: 0,
      },
    ],
  },
};
