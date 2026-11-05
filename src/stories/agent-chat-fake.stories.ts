/**
 * @module for-angular/stories/agent-chat-fake
 * @summary Storybook integration story for the composed agent chat driven by
 * {@link AgentChatFakeTransport} — no backend, no network, deterministic.
 * @description Demonstrates every transcript component family the fake
 * transport emits (streamed text, reasoning, code, tool parts, approval,
 * structured object, telemetry) exactly as the demo chat page mounts it.
 */
import { Component, Input, OnInit, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  AGENT_CHAT_TRANSPORT,
  AgentChatComponent,
  AgentChatDemoScenario,
  AgentChatFakeTransport,
} from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

/**
 * Story host that mounts the composed chat against the deterministic fake
 * transport and exposes the scenario/speed knobs as story args.
 */
@Component({
  selector: 'story-agent-chat-fake-host',
  standalone: true,
  imports: [AgentChatComponent],
  template: `
    <div style="height: 640px">
      <ngx-decaf-agent-chat
        workflowId="wf-agent-chat-demo"
        sessionId="agent-chat-fake-story"
        [headerTitleFallback]="headerTitleFallback"
        [suggestions]="suggestions"
        [slashCommands]="slashCommands"
        [models]="models"
      />
    </div>
  `,
})
class FakeAgentChatHostComponent implements OnInit {
  private readonly transport = inject(AgentChatFakeTransport);

  /** Chat header fallback text. */
  @Input() headerTitleFallback = 'Agent chat — fake transport';
  /** Scripted scenario to play. */
  @Input() scenario: AgentChatDemoScenario = 'conversation';
  /** Playback speed multiplier. */
  @Input() speed = 1.8;

  /** Suggested prompts rendered before the first message. */
  readonly suggestions = [
    'Show me the full roundtrip',
    'Where is my order?',
    'Extract invoice INV-2026-0142',
  ];
  /** Slash commands offered by the composer. */
  readonly slashCommands = [
    { name: 'summarize', description: 'Summarize the conversation' },
    { name: 'extract', description: 'Extract a structured object' },
  ];
  /** Models offered by the selector. */
  readonly models = [
    { id: 'demo-fast', name: 'Demo Fast', provider: 'local' },
    { id: 'demo-reasoning', name: 'Demo Reasoning', provider: 'local' },
  ];

  /** Programs the fake transport with the story args. */
  ngOnInit(): void {
    this.transport.configure({ scenario: this.scenario, speed: this.speed });
  }
}

/** Story-scoped fake transport shared by the host and the token override. */
const fakeTransport = new AgentChatFakeTransport();
/** Provider pair installing the fake transport as both its class and the transport token. */
const fakeTransportProviders = [
  { provide: AgentChatFakeTransport, useValue: fakeTransport },
  { provide: AGENT_CHAT_TRANSPORT, useValue: fakeTransport },
];

const component = getComponentMeta<FakeAgentChatHostComponent>(
  [AgentChatComponent],
  'component',
  {},
  fakeTransportProviders,
);

const meta: Meta<FakeAgentChatHostComponent> = {
  title: 'Agent/Chat (fake transport)',
  component: FakeAgentChatHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    scenario: {
      control: 'select',
      options: ['conversation', 'structured-object'],
    },
    speed: { control: { type: 'range', min: 0.5, max: 4, step: 0.1 } },
  },
};
export default meta;
type Story = StoryObj<FakeAgentChatHostComponent>;

/** Full deterministic roundtrip: every transcript component family in one run. */
export const fakeTransportRoundtrip: Story = {
  args: {
    scenario: 'conversation',
    speed: 1.8,
  },
};

/** Structured-object scenario: the DeepPartial payload fills field by field. */
export const fakeStructuredObject: Story = {
  args: {
    scenario: 'structured-object',
    speed: 1.8,
  },
};
