import type { Meta, StoryObj } from '@storybook/angular';
import { ChatTelemetryComponent } from '@decaf-ts/for-angular/agent';
import type { AgentChatRoundtripTelemetry } from '@decaf-ts/for-angular/agent';
import './setup';
import { getComponentMeta } from './utils';

const ROUNDTRIPS: AgentChatRoundtripTelemetry[] = [
  {
    runId: 'run-2026-10-25-001',
    status: 'succeeded',
    startedAt: '2026-10-25T10:00:00.000Z',
    finishedAt: '2026-10-25T10:00:02.450Z',
    durationMs: 2450,
    nodeCount: 6,
    completedNodeCount: 6,
    logLines: 4,
    functionId: 'agent.chat.reply',
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    runtimeContext: {
      model: 'gpt-5-mini',
      sessionId: 'agent-chat-2026-10-25',
    },
    promptTokens: 1240,
    completionTokens: 320,
    totalTokens: 1560,
  },
  {
    runId: 'run-2026-10-25-002',
    status: 'failed',
    startedAt: '2026-10-25T10:01:00.000Z',
    finishedAt: '2026-10-25T10:01:00.840Z',
    nodeCount: 3,
    completedNodeCount: 1,
    functionId: 'agent.chat.orders',
    traceId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
    error: {
      name: 'ToolError',
      message: 'The orders backend timed out after 30 seconds.',
    },
  },
  {
    runId: 'run-2026-10-25-003',
    status: 'running',
    startedAt: '2026-10-25T10:02:00.000Z',
    nodeCount: 4,
    completedNodeCount: 2,
    replayed: true,
    functionId: 'agent.chat.reply',
    promptTokens: 640,
  },
];

const component = getComponentMeta<ChatTelemetryComponent>([ChatTelemetryComponent]);

const meta: Meta<ChatTelemetryComponent> = {
  title: 'Agent/Chat/Telemetry',
  component: ChatTelemetryComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    roundtrips: { control: false, table: { disable: true } },
    title: { control: 'text' },
  },
  args: {
    roundtrips: ROUNDTRIPS,
    open: false,
    title: null,
  },
};
export default meta;
type Story = StoryObj<ChatTelemetryComponent>;

export const collapsed: Story = {};

export const expanded: Story = {
  args: { open: true },
};

export const singleRun: Story = {
  args: { open: true, roundtrips: ROUNDTRIPS.slice(0, 1), title: 'Refund run' },
};

export const empty: Story = {
  args: { open: true, roundtrips: [] },
};
