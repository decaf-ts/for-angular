import { Component, Input } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatModelSelectorComponent,
  type AgentChatModel,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const MODELS: AgentChatModel[] = [
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', description: 'General purpose' },
  {
    id: 'claude-4',
    name: 'Claude 4',
    provider: 'Anthropic',
    description: 'Long context',
  },
  { id: 'local', name: 'Local model', provider: 'Decaf', description: 'Offline' },
];

@Component({
  selector: 'story-chat-model-selector-host',
  standalone: true,
  imports: [ChatModelSelectorComponent],
  template: `
    <div style="min-height: 16rem; padding: 1rem">
      <ngx-decaf-chat-model-selector
        [models]="models"
        [model]="model"
        (modelChange)="select($event)"
      />
      <p style="margin: 0.75rem 0 0; font-size: 0.75rem; color: #64748b">
        Selected: {{ last }}
      </p>
    </div>
  `,
})
class ChatModelSelectorHostComponent {
  /** Models offered by the selector. */
  @Input() models = MODELS;
  /** Current model id or model object. */
  @Input() model: AgentChatModel | string | null = 'gpt-5';

  last = 'gpt-5';

  select(model: AgentChatModel): void {
    this.model = model;
    this.last = model.name;
  }
}

const component = getComponentMeta<ChatModelSelectorHostComponent>(
  [ChatModelSelectorComponent],
  'component',
  {},
);

const meta: Meta<ChatModelSelectorHostComponent> = {
  title: 'Agent/Chat/Model Selector',
  component: ChatModelSelectorHostComponent,
  ...component,
  args: { models: MODELS, model: 'gpt-5' },
};
export default meta;
type Story = StoryObj<ChatModelSelectorHostComponent>;

export const defaultState: Story = {};

export const noSelection: Story = {
  args: { model: null },
};

export const noModels: Story = {
  args: { models: [], model: null },
};
