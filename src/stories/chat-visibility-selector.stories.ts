import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatVisibilitySelectorComponent,
  type AgentChatVisibility,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

@Component({
  selector: 'story-chat-visibility-selector-host',
  standalone: true,
  imports: [ChatVisibilitySelectorComponent],
  template: `
    <div style="min-height: 12rem; padding: 1rem">
      <ngx-decaf-chat-visibility-selector
        [visibility]="visibility"
        [disabled]="disabled"
        (visibilityChange)="change($event)"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Visibility: {{ visibility }}
      </p>
    </div>
  `,
})
class ChatVisibilitySelectorHostComponent {
  /** Current conversation visibility. */
  @Input() visibility: AgentChatVisibility = 'private';
  /** Whether the selector is disabled. */
  @Input() disabled = false;

  change(visibility: AgentChatVisibility): void {
    this.visibility = visibility;
  }
}

const component = getComponentMeta<ChatVisibilitySelectorHostComponent>(
  [ChatVisibilitySelectorComponent],
  'component',
  {},
);

const meta: Meta<ChatVisibilitySelectorHostComponent> = {
  title: 'Agent/Chat/Visibility Selector',
  component: ChatVisibilitySelectorHostComponent,
  ...component,
  args: { visibility: 'private', disabled: false },
};
export default meta;
type Story = StoryObj<ChatVisibilitySelectorHostComponent>;

export const privateConversation: Story = {};

export const sharedConversation: Story = {
  args: { visibility: 'shared' },
};

export const disabled: Story = {
  args: { visibility: 'private', disabled: true },
};
