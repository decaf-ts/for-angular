import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatAttachmentPreviewComponent,
  type AgentChatStagedAttachment,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const IMAGE_ATTACHMENT: AgentChatStagedAttachment = {
  id: 'img-1',
  name: 'dashboard.png',
  mime: 'image/png',
  size: 18432,
  url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="%230f766e"/><text x="18" y="52" fill="white" font-size="16">image</text></svg>',
};

const TEXT_ATTACHMENT: AgentChatStagedAttachment = {
  id: 'txt-1',
  name: 'notes.txt',
  mime: 'text/plain',
  size: 512,
  textPreview:
    'The quarterly revenue grew 12%, driven mostly by the EMEA segment. Two customers renewed early.',
};

const FILE_ATTACHMENT: AgentChatStagedAttachment = {
  id: 'pdf-1',
  name: 'report.pdf',
  mime: 'application/pdf',
  size: 2097152,
};

@Component({
  selector: 'story-chat-attachment-preview-host',
  standalone: true,
  imports: [ChatAttachmentPreviewComponent],
  template: `
    <div style="max-width: 36rem; padding: 1rem">
      <ngx-decaf-chat-attachment-preview
        [attachments]="attachments"
        (remove)="remove($event)"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Last removed: {{ last }}
      </p>
    </div>
  `,
})
class ChatAttachmentPreviewHostComponent {
  /** Staged attachments rendered by the preview strip. */
  @Input() attachments: AgentChatStagedAttachment[] = [
    IMAGE_ATTACHMENT,
    TEXT_ATTACHMENT,
    FILE_ATTACHMENT,
  ];

  last = 'none';

  remove(id: string): void {
    this.last = id;
    this.attachments = this.attachments.filter((item) => item.id !== id);
  }
}

const component = getComponentMeta<ChatAttachmentPreviewHostComponent>(
  [ChatAttachmentPreviewComponent],
  'component',
  {},
);

const meta: Meta<ChatAttachmentPreviewHostComponent> = {
  title: 'Agent/Chat/Attachment Preview',
  component: ChatAttachmentPreviewHostComponent,
  ...component,
  args: {
    attachments: [IMAGE_ATTACHMENT, TEXT_ATTACHMENT, FILE_ATTACHMENT],
  },
};
export default meta;
type Story = StoryObj<ChatAttachmentPreviewHostComponent>;

export const defaultState: Story = {};

export const imagesOnly: Story = {
  args: { attachments: [IMAGE_ATTACHMENT] },
};

export const textOnly: Story = {
  args: { attachments: [TEXT_ATTACHMENT] },
};

export const empty: Story = {
  args: { attachments: [] },
};
