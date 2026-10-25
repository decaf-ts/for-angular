import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { ChatMessageEditorComponent } from '@decaf-ts/for-angular/agent';
import type {
  AgentChatMessageEdit,
  AgentChatMessageView,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const USER_MESSAGE: AgentChatMessageView = {
  id: 'message-1',
  role: 'user',
  content: 'How many orders shipped this week?',
  attachments: [],
  knowledgeSourceIds: [],
  createdAt: '2026-10-25T10:00:00.000Z',
};

@Component({
  selector: 'story-chat-message-editor-host',
  standalone: true,
  imports: [ChatMessageEditorComponent],
  template: `
    <div style="max-width: 40rem">
      <ngx-decaf-chat-message-editor
        [message]="message"
        [initialText]="initialText"
        [running]="running"
        [autoFocus]="false"
        (save)="onSave($event)"
        (cancel)="onCancel($event)"
      />
      <p style="font-size: 0.75rem; color: #64748b">
        Last event: {{ last }}
      </p>
    </div>
  `,
})
class ChatMessageEditorHostComponent {
  /** Message being edited. */
  @Input() message: AgentChatMessageView | null = USER_MESSAGE;
  /** Draft text used when no message is supplied. */
  @Input() initialText = '';
  /** Whether a response is streaming (blocks saving). */
  @Input() running = false;

  last = 'none';

  onSave(event: AgentChatMessageEdit): void {
    this.last = `save (${event.messageId}): ${event.text}`;
  }

  onCancel(messageId: string): void {
    this.last = `cancel: ${messageId}`;
  }
}

const component = getComponentMeta<ChatMessageEditorHostComponent>(
  [ChatMessageEditorComponent],
  'component',
  {},
);

const meta: Meta<ChatMessageEditorHostComponent> = {
  title: 'Agent/Chat/Message Editor',
  component: ChatMessageEditorHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    message: { control: false, table: { disable: true } },
  },
  args: {
    message: USER_MESSAGE,
    initialText: '',
    running: false,
  },
};
export default meta;
type Story = StoryObj<ChatMessageEditorHostComponent>;

export const editingUserMessage: Story = {};

export const withoutMessage: Story = {
  args: { message: null, initialText: 'Draft text supplied through the initialText input.' },
};

export const disabledWhileRunning: Story = {
  args: { running: true },
};
