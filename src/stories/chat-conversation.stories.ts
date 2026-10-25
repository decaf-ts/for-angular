import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatConversationComponent,
  ChatMessageComponent,
} from '@decaf-ts/for-angular/agent';
import type {
  AgentChatMessageView,
  AgentChatTranscriptDownload,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

function chatMessage(
  id: string,
  role: AgentChatMessageView['role'],
  content: string,
  createdAt = '2026-10-25T10:00:00.000Z',
): AgentChatMessageView {
  return {
    id,
    role,
    content,
    attachments: [],
    knowledgeSourceIds: [],
    createdAt,
  };
}

const CONVERSATION: AgentChatMessageView[] = [
  chatMessage('m-1', 'user', 'How many orders shipped this week?', '2026-10-25T10:00:00.000Z'),
  chatMessage(
    'm-2',
    'assistant',
    '128 orders shipped this week, up 12% from last week. The EMEA region accounts for most of the growth.',
    '2026-10-25T10:00:04.000Z',
  ),
  chatMessage('m-3', 'user', 'Which carrier was used the most?', '2026-10-25T10:01:10.000Z'),
  chatMessage(
    'm-4',
    'assistant',
    'DHL handled 61 of the 128 shipments, followed by UPS with 39.',
    '2026-10-25T10:01:14.000Z',
  ),
];

@Component({
  selector: 'story-chat-conversation-host',
  standalone: true,
  imports: [ChatConversationComponent, ChatMessageComponent],
  template: `
    <div style="height: 460px">
      <ngx-decaf-chat-conversation
        [messages]="messages"
        [running]="running"
        [downloadFilename]="downloadFilename"
        (download)="onDownload($event)"
      >
        <p chatConversationEmpty style="color: #64748b">
          No messages yet — this slot is replaced by the projected transcript.
        </p>
        @for (message of messages; track message.id) {
          <ngx-decaf-chat-message
            [role]="message.role"
            [content]="message.content"
            [createdAt]="message.createdAt"
            [attachments]="message.attachments"
            [parts]="message.parts ?? []"
            [actions]="message.actions ?? []"
          />
        }
      </ngx-decaf-chat-conversation>
    </div>
    <p style="font-size: 0.75rem; color: #64748b">
      Last download: {{ lastDownload ? lastDownload + ' (' + lastDownload.length + ' chars)' : 'none' }}
    </p>
  `,
})
class ChatConversationHostComponent {
  /** Messages rendered in the transcript. */
  @Input() messages: AgentChatMessageView[] = CONVERSATION;
  /** Whether a response is streaming. */
  @Input() running = false;
  /** Filename used by the transcript download. */
  @Input() downloadFilename = 'conversation.md';

  lastDownload = '';

  onDownload(event: AgentChatTranscriptDownload): void {
    this.lastDownload = event.markdown;
  }
}

const component = getComponentMeta<ChatConversationHostComponent>(
  [ChatConversationComponent, ChatMessageComponent],
  'component',
  {},
);

const meta: Meta<ChatConversationHostComponent> = {
  title: 'Agent/Chat/Conversation',
  component: ChatConversationHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    messages: { control: false, table: { disable: true } },
  },
  args: {
    messages: CONVERSATION,
    running: false,
    downloadFilename: 'conversation.md',
  },
};
export default meta;
type Story = StoryObj<ChatConversationHostComponent>;

export const conversation: Story = {};

export const empty: Story = {
  args: { messages: [] },
};

export const running: Story = {
  args: { messages: CONVERSATION, running: true },
};
