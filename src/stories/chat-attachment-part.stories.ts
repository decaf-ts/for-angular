import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatAttachmentPartComponent,
  type AgentChatAttachment,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const IMAGE: AgentChatAttachment = {
  id: 'att-img',
  name: 'dashboard.png',
  mime: 'image/png',
  size: 18432,
  url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="%230f766e"/><text x="18" y="52" fill="white" font-size="16">image</text></svg>',
};

const TEXT: AgentChatAttachment = {
  id: 'att-txt',
  name: 'notes.txt',
  mime: 'text/plain',
  size: 512,
  textPreview:
    'The quarterly revenue grew 12%, driven mostly by the EMEA segment.',
};

const FILE: AgentChatAttachment = {
  id: 'att-pdf',
  name: 'report.pdf',
  mime: 'application/pdf',
  size: 2097152,
};

@Component({
  selector: 'story-chat-attachment-part-host',
  standalone: true,
  imports: [ChatAttachmentPartComponent],
  template: `
    <div style="max-width: 36rem; padding: 1rem">
      <p style="margin: 0 0 0.5rem; font-size: 0.8rem; color: #334155">
        Here is the attachment you sent:
      </p>
      <ngx-decaf-chat-attachment-part [attachment]="attachment" />
    </div>
  `,
})
class ChatAttachmentPartHostComponent {
  /** Attachment rendered inside the message part. */
  @Input() attachment: AgentChatAttachment = IMAGE;
}

const component = getComponentMeta<ChatAttachmentPartHostComponent>(
  [ChatAttachmentPartComponent],
  'component',
  {},
);

const meta: Meta<ChatAttachmentPartHostComponent> = {
  title: 'Agent/Chat/Attachment Part',
  component: ChatAttachmentPartHostComponent,
  ...component,
  args: { attachment: IMAGE },
};
export default meta;
type Story = StoryObj<ChatAttachmentPartHostComponent>;

export const image: Story = {};

export const text: Story = {
  args: { attachment: TEXT },
};

export const fallbackFile: Story = {
  args: { attachment: FILE },
};

export const imageWithoutUrl: Story = {
  args: {
    attachment: {
      id: 'att-img-2',
      name: 'pending.png',
      mime: 'image/png',
      size: 1024,
    },
  },
};
