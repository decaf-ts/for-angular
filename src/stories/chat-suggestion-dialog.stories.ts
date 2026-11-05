import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { ChatSuggestionDialogComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

@Component({
  selector: 'story-chat-suggestion-dialog-host',
  standalone: true,
  imports: [ChatSuggestionDialogComponent],
  template: `
    <div style="min-height: 20rem; padding: 1rem">
      <button type="button" (click)="open = true">Open suggestion</button>
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Last event: {{ last }}
      </p>
      <ngx-decaf-chat-suggestion-dialog
        [open]="open"
        [suggestion]="suggestion"
        [title]="title"
        (apply)="record('apply: ' + $event)"
        (ignore)="ignore()"
      />
    </div>
  `,
})
class ChatSuggestionDialogHostComponent {
  /** Whether the suggestion dialog is open. */
  @Input() open = true;
  /** Suggestion text offered to the user. */
  @Input() suggestion = 'Q4 revenue review and renewal risks';
  /** Optional title override. */
  @Input() title: string | null = null;

  last = 'none';

  record(event: string): void {
    this.last = event;
    this.open = false;
  }

  ignore(): void {
    this.last = 'ignore';
    this.open = false;
  }
}

const component = getComponentMeta<ChatSuggestionDialogHostComponent>(
  [ChatSuggestionDialogComponent],
  'component',
  {},
);

const meta: Meta<ChatSuggestionDialogHostComponent> = {
  title: 'Agent/Chat/Suggestion Dialog',
  component: ChatSuggestionDialogHostComponent,
  ...component,
  args: {
    open: true,
    suggestion: 'Q4 revenue review and renewal risks',
    title: null,
  },
};
export default meta;
type Story = StoryObj<ChatSuggestionDialogHostComponent>;

export const openSuggestion: Story = {};

export const customCopy: Story = {
  args: {
    title: 'Rewrite chat title?',
    suggestion: 'Quarterly revenue and EMEA renewals',
  },
};
