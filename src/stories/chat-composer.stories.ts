import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { ChatComposerComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

@Component({
  selector: 'story-chat-composer-host',
  standalone: true,
  imports: [ChatComposerComponent],
  template: `
    <div style="max-width: 40rem; padding: 1rem">
      <ngx-decaf-chat-composer
        [value]="value"
        [running]="running"
        [disabled]="disabled"
        [clearOnSend]="clearOnSend"
        [placeholder]="placeholder"
        (valueChange)="value = $event"
        (send)="record('send: ' + $event)"
        (stop)="record('stop')"
        (slashQuery)="record('slash: ' + ($event ?? 'none'))"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Last event: {{ last }}
      </p>
    </div>
  `,
})
class ChatComposerHostComponent {
  /** Controlled composer draft. */
  @Input() value = '';
  /** Whether an agent roundtrip is in flight. */
  @Input() running = false;
  /** Whether the composer is disabled. */
  @Input() disabled = false;
  /** Whether the composer clears after sending. */
  @Input() clearOnSend = true;
  /** Optional placeholder override. */
  @Input() placeholder: string | null = null;

  last = 'none';

  record(event: string): void {
    this.last = event;
  }
}

const component = getComponentMeta<ChatComposerHostComponent>(
  [ChatComposerComponent],
  'component',
  {},
);

const meta: Meta<ChatComposerHostComponent> = {
  title: 'Agent/Chat/Composer',
  component: ChatComposerHostComponent,
  ...component,
  args: {
    value: '',
    running: false,
    disabled: false,
    clearOnSend: true,
    placeholder: null,
  },
};
export default meta;
type Story = StoryObj<ChatComposerHostComponent>;

export const defaultState: Story = {};

export const withDraft: Story = {
  args: { value: 'Summarise the last three incidents' },
};

export const running: Story = {
  args: { value: 'Waiting for the agent…', running: true },
};

export const disabled: Story = {
  args: { value: '', disabled: true },
};

export const keepsDraft: Story = {
  args: { value: 'Keep this after send', clearOnSend: false },
};
