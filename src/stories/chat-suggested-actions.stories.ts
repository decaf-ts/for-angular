import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { ChatSuggestedActionsComponent } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const SUGGESTIONS = [
  'How many orders shipped last week?',
  'Summarise the open incidents.',
  'Draft a customer follow-up email.',
  'Which invoices are overdue?',
];

@Component({
  selector: 'story-chat-suggested-actions-host',
  standalone: true,
  imports: [ChatSuggestedActionsComponent],
  template: `
    <div style="max-width: 40rem; padding: 1rem">
      <ngx-decaf-chat-suggested-actions
        [suggestions]="suggestions"
        [empty]="empty"
        [title]="title"
        (select)="record($event)"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Last selected: {{ last }}
      </p>
    </div>
  `,
})
class ChatSuggestedActionsHostComponent {
  /** Starter prompts rendered as buttons. */
  @Input() suggestions = SUGGESTIONS;
  /** Whether the conversation is empty. */
  @Input() empty = true;
  /** Optional heading override. */
  @Input() title: string | null = null;

  last = 'none';

  record(prompt: string): void {
    this.last = prompt;
  }
}

const component = getComponentMeta<ChatSuggestedActionsHostComponent>(
  [ChatSuggestedActionsComponent],
  'component',
  {},
);

const meta: Meta<ChatSuggestedActionsHostComponent> = {
  title: 'Agent/Chat/Suggested Actions',
  component: ChatSuggestedActionsHostComponent,
  ...component,
  args: { suggestions: SUGGESTIONS, empty: true, title: null },
};
export default meta;
type Story = StoryObj<ChatSuggestedActionsHostComponent>;

export const defaultState: Story = {};

export const customTitle: Story = {
  args: { title: 'Start with one of these' },
};

export const conversationStarted: Story = {
  args: { empty: false },
};
