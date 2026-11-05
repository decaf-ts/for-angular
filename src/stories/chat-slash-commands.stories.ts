import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatSlashCommandsComponent,
  type AgentChatSlashCommand,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const COMMANDS: AgentChatSlashCommand[] = [
  { name: 'summarise', description: 'Summarise the conversation' },
  { name: 'search', description: 'Search the knowledge base' },
  { name: 'draft', description: 'Draft an email from the thread' },
  { name: 'sum', aliases: ['total'], description: 'Sum a numeric column' },
];

@Component({
  selector: 'story-chat-slash-commands-host',
  standalone: true,
  imports: [ChatSlashCommandsComponent],
  template: `
    <div style="max-width: 24rem; padding: 1rem">
      <p style="margin: 0 0 0.4rem; font-size: 0.8rem; color: #334155">
        Composer draft: /{{ query }}
      </p>
      <ngx-decaf-chat-slash-commands
        [commands]="commands"
        [query]="query"
        [open]="open"
        (select)="record('select: ' + $event.name)"
        (close)="record('close')"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Last event: {{ last }}
      </p>
    </div>
  `,
})
class ChatSlashCommandsHostComponent {
  /** Slash commands offered by the popover. */
  @Input() commands = COMMANDS;
  /** Current slash query. */
  @Input() query = '';
  /** Whether the popover is open. */
  @Input() open = true;

  last = 'none';

  record(event: string): void {
    this.last = event;
  }
}

const component = getComponentMeta<ChatSlashCommandsHostComponent>(
  [ChatSlashCommandsComponent],
  'component',
  {},
);

const meta: Meta<ChatSlashCommandsHostComponent> = {
  title: 'Agent/Chat/Slash Commands',
  component: ChatSlashCommandsHostComponent,
  ...component,
  args: { commands: COMMANDS, query: '', open: true },
};
export default meta;
type Story = StoryObj<ChatSlashCommandsHostComponent>;

export const defaultState: Story = {};

export const filtered: Story = {
  args: { query: 's' },
};

export const emptyResults: Story = {
  args: { query: 'zzz' },
};

export const closed: Story = {
  args: { open: false },
};
