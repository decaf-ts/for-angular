import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { ChatAttachmentInputComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

@Component({
  selector: 'story-chat-attachment-input-host',
  standalone: true,
  imports: [ChatAttachmentInputComponent],
  template: `
    <div style="max-width: 36rem; padding: 1rem">
      <ngx-decaf-chat-attachment-input
        [accept]="accept"
        [multiple]="multiple"
        [disabled]="disabled"
        (filesSelected)="recordFiles($event)"
        (rejected)="recordRejected($event.length)"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Last event: {{ last }}
      </p>
    </div>
  `,
})
class ChatAttachmentInputHostComponent {
  /** Accepted MIME patterns passed to the attachment input. */
  @Input() accept: string[] = ['image/*', 'text/*'];
  /** Whether the input accepts multiple files. */
  @Input() multiple = true;
  /** Whether the attachment input is disabled. */
  @Input() disabled = false;

  last = 'none';

  recordFiles(files: File[]): void {
    this.last = `files: ${files.map((file) => file.name).join(', ') || 'none'}`;
  }

  recordRejected(count: number): void {
    this.last = `rejected: ${count}`;
  }
}

const component = getComponentMeta<ChatAttachmentInputHostComponent>(
  [ChatAttachmentInputComponent],
  'component',
  {},
);

const meta: Meta<ChatAttachmentInputHostComponent> = {
  title: 'Agent/Chat/Attachment Input',
  component: ChatAttachmentInputHostComponent,
  ...component,
  args: {
    accept: ['image/*', 'text/*'],
    multiple: true,
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<ChatAttachmentInputHostComponent>;

export const defaultState: Story = {};

export const imagesOnly: Story = {
  args: { accept: ['image/*'] },
};

export const singleFile: Story = {
  args: { multiple: false },
};

export const disabled: Story = {
  args: { disabled: true },
};
