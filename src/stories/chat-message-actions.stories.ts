import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { ChatMessageActionsComponent } from '@decaf-ts/for-angular/agent';
import type {
  AgentChatMessageVoteChange,
  AgentChatRole,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

@Component({
  selector: 'story-chat-message-actions-host',
  standalone: true,
  imports: [ChatMessageActionsComponent],
  template: `
    <div
      style="max-width: 34rem; padding: 0.75rem 1rem; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc"
    >
      <p style="margin: 0 0 0.5rem; font-size: 0.84rem; color: #0f172a">
        The quarterly revenue grew 12%, driven mostly by the EMEA segment.
      </p>
      <ngx-decaf-chat-message-actions
        [messageId]="messageId"
        [role]="role"
        [copyText]="copyText"
        [running]="running"
        [persistent]="persistent"
        (copy)="recordCopy()"
        (voteChange)="recordVote($event)"
        (edit)="record('edit')"
        (deleteMessage)="record('delete')"
      />
      <p style="margin: 0.5rem 0 0; font-size: 0.72rem; color: #64748b">
        Last event: {{ last }}
      </p>
    </div>
  `,
})
class ChatMessageActionsHostComponent {
  /** Id of the message the actions apply to. */
  @Input() messageId = 'message-1';
  /** Author role driving the available actions. */
  @Input() role: AgentChatRole = 'assistant';
  /** Text written to the clipboard by the copy action. */
  @Input() copyText = 'The quarterly revenue grew 12%.';
  /** Whether a response is streaming (disables actions). */
  @Input() running = false;
  /** Whether the actions stay visible without hover. */
  @Input() persistent = true;

  last = 'none';

  recordCopy(): void {
    this.last = 'copy';
  }

  recordVote(event: AgentChatMessageVoteChange): void {
    this.last = `vote: ${event.vote ?? 'cleared'}`;
  }

  record(action: string): void {
    this.last = action;
  }
}

const component = getComponentMeta<ChatMessageActionsHostComponent>(
  [ChatMessageActionsComponent],
  'component',
  {},
);

const meta: Meta<ChatMessageActionsHostComponent> = {
  title: 'Agent/Chat/Message Actions',
  component: ChatMessageActionsHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    role: {
      control: 'select',
      options: ['user', 'assistant', 'system', 'error'],
    },
  },
  args: {
    messageId: 'message-1',
    role: 'assistant',
    copyText: 'The quarterly revenue grew 12%.',
    running: false,
    persistent: true,
  },
};
export default meta;
type Story = StoryObj<ChatMessageActionsHostComponent>;

export const assistant: Story = {};

export const user: Story = {
  args: { role: 'user' },
};

export const disabledWhileRunning: Story = {
  args: { running: true },
};

export const hoverOnly: Story = {
  args: { persistent: false },
};
