import type { Meta, StoryObj } from '@storybook/angular';
import {
  ChatArtifactToolbarComponent,
  DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<ChatArtifactToolbarComponent>([ChatArtifactToolbarComponent]);

const meta: Meta<ChatArtifactToolbarComponent> = {
  title: 'Agent/Chat/Artifact Toolbar',
  component: ChatArtifactToolbarComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    tools: { control: 'object' },
    selected: { control: 'select', options: ['text', 'code', 'image', 'sheet', null] },
    disabled: { control: 'boolean' },
  },
  args: {
    tools: DEFAULT_AGENT_CHAT_ARTIFACT_TOOLS,
    selected: 'text',
    disabled: false,
  },
};
export default meta;
type Story = StoryObj<ChatArtifactToolbarComponent>;

export const allTools: Story = {};

export const codeSelected: Story = {
  args: {
    selected: 'code',
  },
};

export const imageSelected: Story = {
  args: {
    selected: 'image',
  },
};

export const disabled: Story = {
  args: {
    disabled: true,
  },
};

export const customTools: Story = {
  args: {
    tools: [
      { kind: 'text', labelKey: 'agent.chat.artifact.toolbar.text' },
      { kind: 'code', labelKey: 'agent.chat.artifact.toolbar.code', disabled: true },
      { kind: 'sheet', labelKey: 'agent.chat.artifact.toolbar.sheet' },
    ],
    selected: null,
  },
};
