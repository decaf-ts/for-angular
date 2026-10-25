/**
 * @module for-angular/stories/agent-chat
 * @summary Storybook stories for the agent chat surface (slice U3 of SAA-836).
 * @description Covers the composed {@link AgentChatComponent} surface driven
 * by a scripted transport: plain assistant replies with action chips,
 * structured object (use-object) payloads, knowledge-base selection, suggested
 * prompts, model/slash-command affordances, failed roundtrips,
 * backend-unavailable sends, replay of a recorded run, and slow streaming
 * (typing state). The stories mount the component through
 * {@link AgentChatHostComponent} with the `AGENT_CHAT_TRANSPORT` token
 * overridden by {@link ScriptedAgentChatTransport}, so no backend is needed.
 * See `agent-chat-fake.stories.ts` for the full composed integration story
 * driven by `AgentChatFakeTransport`.
 */
import {
  AfterViewInit,
  Component,
  Input,
  ViewChild,
  inject,
} from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import type { GraphJsonValue, GraphRunEventEnvelope } from '@decaf-ts/as-graph/shared';
import { GraphExecutionEventType } from '@decaf-ts/as-graph/shared';
import {
  AGENT_CHAT_TRANSPORT,
  AgentChatComponent,
  AgentChatRunDescriptor,
  AgentChatSendRequest,
  AgentChatTransport,
  AgentChatTransportHandlers,
} from '@decaf-ts/for-angular/agent';
import { GraphBackendUnavailableError } from '@decaf-ts/for-angular/diagrams';
import './setup';
import { getComponentMeta } from './utils';

/** One scripted run envelope: emitted `delayMs` after the previous step. */
interface ScriptedStep {
  /** Delay from the previous step (first step delays from mount). */
  delayMs: number;
  /** Run event type carried by the envelope. */
  type: GraphExecutionEventType;
  /** Optional `node.output`-style payload (e.g. `{ response, actions?, structuredOutput? }`). */
  payload?: Record<string, unknown>;
  /** Optional error payload for failure steps. */
  error?: { name: string; message: string };
  /** Optional node id attached to the envelope. */
  nodeId?: string;
}

/** A full scripted conversation: ordered steps plus an optional send failure. */
interface ScriptedScript {
  /** Envelopes emitted in order, each `delayMs` after the previous one. */
  steps: ScriptedStep[];
  /** When `true`, `send` rejects with a {@link GraphBackendUnavailableError} instead of streaming. */
  throwOnSend?: boolean;
}

/**
 * Deterministic {@link AgentChatTransport} for stories: replays a
 * {@link ScriptedScript} on a timeline with `setTimeout`, fakes cancellation
 * by injecting `WORKFLOW_CANCELLED` terminal envelopes for a cancelled run,
 * and emits the terminal event through both `onEvent`-style dispatch and
 * `onTerminal` exactly like the real transport contract.
 */
class ScriptedAgentChatTransport implements AgentChatTransport {
  private static sequence = 0;

  /** Script the transport currently streams; replaced by the host on `ngOnInit`. */
  script: ScriptedScript = { steps: [] };
  /** Run ids whose steps were cancelled and must be replaced by a terminal cancel envelope. */
  private readonly cancelled = new Set<string>();

  /**
   * Assigns a scripted run id, starts streaming the script, and resolves with
   * the run descriptor immediately (mirroring the real `send` contract).
   * Rejects up front when the script was configured with `throwOnSend`.
   */
  async send(
    request: AgentChatSendRequest,
    handlers: AgentChatTransportHandlers,
  ): Promise<AgentChatRunDescriptor> {
    if (this.script.throwOnSend) {
      throw new GraphBackendUnavailableError(
        'Agent backend is not running. Start it with `npm run start:backend`.',
      );
    }
    const runId = `scripted-run-${++ScriptedAgentChatTransport.sequence}`;
    this.stream(runId, this.script.steps, handlers);
    return { runId, eventsUrl: `/graph/runs/${runId}/events` };
  }

  /** Re-streams the current script under the recorded run id (replay story path). */
  async replay(
    descriptor: AgentChatRunDescriptor,
    handlers: AgentChatTransportHandlers,
  ): Promise<void> {
    this.stream(descriptor.runId, this.script.steps, handlers);
  }

  /** Marks the run cancelled; pending steps are replaced by terminal cancel envelopes. */
  async cancel(runId: string): Promise<void> {
    this.cancelled.add(runId);
  }

  /**
   * Emits each scripted step on its timeline slot. Non-terminal steps for a
   * cancelled run are replaced by a `WORKFLOW_CANCELLED` event + terminal
   * pair; terminal steps also invoke `onTerminal` in addition to `onEvent`.
   */
  private stream(
    runId: string,
    steps: ScriptedStep[],
    handlers: AgentChatTransportHandlers,
  ): void {
    let sequence = 0;
    let elapsed = 0;
    for (const step of steps) {
      elapsed += step.delayMs;
      const envelopeRunId = runId;
      const envelopeSequence = ++sequence;
      const envelope: GraphRunEventEnvelope = {
        runId: envelopeRunId,
        workflowId: 'wf-agent-demo',
        sequence: envelopeSequence,
        type: step.type,
        timestamp: new Date(Date.now() + elapsed).toISOString(),
        ...(step.nodeId ? { nodeId: step.nodeId } : {}),
        ...(step.payload ? { payload: step.payload as GraphJsonValue } : {}),
        ...(step.error ? { error: step.error } : {}),
      };
      const isTerminal =
        step.type === GraphExecutionEventType.WORKFLOW_COMPLETED ||
        step.type === GraphExecutionEventType.WORKFLOW_FAILED ||
        step.type === GraphExecutionEventType.WORKFLOW_CANCELLED;
      setTimeout(() => {
        if (this.cancelled.has(runId) && !isTerminal) {
          handlers.onEvent({
            ...envelope,
            sequence: ++sequence,
            type: GraphExecutionEventType.WORKFLOW_CANCELLED,
            timestamp: new Date().toISOString(),
          });
          handlers.onTerminal({
            ...envelope,
            sequence: ++sequence,
            type: GraphExecutionEventType.WORKFLOW_CANCELLED,
            timestamp: new Date().toISOString(),
          });
          return;
        }
        handlers.onEvent(envelope);
        if (isTerminal) handlers.onTerminal(envelope);
      }, elapsed);
    }
  }
}

/** Node id of the scripted chat trigger node (telemetry only). */
const CHAT_TRIGGER_NODE = 'chat-1';
/** Node id of the scripted agent node that produces the reply. */
const AGENT_NODE = 'agent-1';

/**
 * Builds the canonical scripted agent conversation: chat-trigger node
 * queued/completed, agent node queued/started, then either a
 * `NODE_FAILED` + `WORKFLOW_FAILED` pair (`fail`), or a `NODE_OUTPUT` with the
 * reply/actions/structured payload followed by node completion, a run log
 * line, and `WORKFLOW_COMPLETED`. `cancel` is accepted for signature
 * compatibility but the cancel path is driven by the transport instead.
 */
function agentAnswerScript(options: {
  reply: string;
  actions?: string[];
  structured?: unknown;
  fail?: boolean;
  cancel?: boolean;
  delayMs: number;
}): ScriptedStep[] {
  const steps: ScriptedStep[] = [
    { delayMs: options.delayMs, type: GraphExecutionEventType.WORKFLOW_STARTED },
    { delayMs: options.delayMs, type: GraphExecutionEventType.NODE_QUEUED, nodeId: CHAT_TRIGGER_NODE },
    { delayMs: options.delayMs, type: GraphExecutionEventType.NODE_COMPLETED, nodeId: CHAT_TRIGGER_NODE },
    { delayMs: options.delayMs, type: GraphExecutionEventType.NODE_QUEUED, nodeId: AGENT_NODE },
    { delayMs: options.delayMs, type: GraphExecutionEventType.NODE_STARTED, nodeId: AGENT_NODE },
  ];
  if (options.fail) {
    steps.push({
      delayMs: options.delayMs,
      type: GraphExecutionEventType.NODE_FAILED,
      nodeId: AGENT_NODE,
      error: { name: 'MastraAgentError', message: 'The agent run failed: model adapter rejected the prompt.' },
    });
    steps.push({
      delayMs: options.delayMs,
      type: GraphExecutionEventType.WORKFLOW_FAILED,
      error: { name: 'MastraAgentError', message: 'The agent run failed: model adapter rejected the prompt.' },
    });
    return steps;
  }
  steps.push({
    delayMs: options.delayMs,
    type: GraphExecutionEventType.NODE_OUTPUT,
    nodeId: AGENT_NODE,
    payload: {
      response: options.reply,
      ...(options.actions?.length ? { actions: options.actions } : {}),
      ...(options.structured !== undefined ? { structuredOutput: options.structured } : {}),
    },
  });
  steps.push({
    delayMs: options.delayMs,
    type: GraphExecutionEventType.NODE_COMPLETED,
    nodeId: AGENT_NODE,
  });
  steps.push({ delayMs: options.delayMs, type: GraphExecutionEventType.GRAPH_RUN_LOG });
  steps.push({ delayMs: options.delayMs, type: GraphExecutionEventType.WORKFLOW_COMPLETED });
  return steps;
}

/**
 * Story host wrapping {@link AgentChatComponent} and feeding its inputs as
 * storybook args; programs the shared {@link ScriptedAgentChatTransport}
 * script on `ngOnInit` and optionally starts a replay on view init when
 * `replayRunId` is set.
 */
@Component({
  selector: 'story-agent-chat-host',
  standalone: true,
  imports: [AgentChatComponent],
  template: `
    <div style="height: 620px">
      <ngx-decaf-agent-chat
        [workflowId]="workflowId"
        [sessionId]="sessionId"
        [headerTitleFallback]="headerTitleFallback"
        [knowledgeSources]="knowledgeSources"
        [suggestions]="suggestions"
        [slashCommands]="slashCommands"
        [models]="models"
      />
    </div>
  `,
})
class AgentChatHostComponent implements AfterViewInit {
  /** Shared scripted transport injected into the story providers. */
  private readonly transport = inject(ScriptedAgentChatTransport);

  /** Backend workflow id passed to the chat component. */
  @Input() workflowId = 'wf-agent-demo';
  /** Session id passed to the chat component. */
  @Input() sessionId = 'agent-chat-story';
  /** Header title fallback text. */
  @Input() headerTitleFallback = 'Agent chat';
  /** Knowledge-base entries offered by the composer. */
  @Input() knowledgeSources: { id: string; label: string }[] = [];
  /** Suggested prompts shown before the first message. */
  @Input() suggestions: string[] = [];
  /** Slash commands offered by the composer. */
  @Input() slashCommands: { name: string; description?: string }[] = [];
  /** Models offered by the model selector. */
  @Input() models: { id: string; name: string; description?: string; provider?: string }[] = [];
  /** Assistant reply text produced by the scripted run. */
  @Input() reply = 'The quarterly revenue grew 12% driven by the EMEA segment.';
  /** Action names attached to the assistant reply. */
  @Input() actions: string[] = [];
  /** Structured object carried by the agent node's output payload. */
  @Input() structured: unknown = undefined;
  /** When `true`, the scripted run fails (`NODE_FAILED` + `WORKFLOW_FAILED`). */
  @Input() fail = false;
  /** When `true`, `send` rejects with a backend-unavailable error. */
  @Input() throwOnSend = false;
  /** Per-step delay of the scripted timeline (ms). */
  @Input() delayMs = 350;
  /** When set, the host replays this run id on view init instead of a live send. */
  @Input() replayRunId = '';

  /** Chat component reference used to start the replay path. */
  @ViewChild(AgentChatComponent) chat?: AgentChatComponent;

  /** Programs the scripted transport with the current args before the chat mounts. */
  ngOnInit(): void {
    this.transport.script = {
      throwOnSend: this.throwOnSend,
      steps: agentAnswerScript({
        reply: this.reply,
        actions: this.actions,
        structured: this.structured,
        fail: this.fail,
        delayMs: this.delayMs,
      }),
    };
  }

  /** Starts the replay story path when `replayRunId` is set. */
  ngAfterViewInit(): void {
    if (!this.replayRunId || !this.chat) return;
    void this.chat.replay({ runId: this.replayRunId, eventsUrl: `/graph/runs/${this.replayRunId}/events` });
  }
}

/** Story-scoped scripted transport shared by the host component and the token override. */
const scriptedTransport = new ScriptedAgentChatTransport();
/** Provider pair installing the scripted transport as both its class and the `AGENT_CHAT_TRANSPORT` override. */
const scriptedTransportProviders = [
  { provide: ScriptedAgentChatTransport, useValue: scriptedTransport },
  { provide: AGENT_CHAT_TRANSPORT, useValue: scriptedTransport },
];

const component = getComponentMeta<AgentChatHostComponent>(
  [AgentChatComponent],
  'component',
  {},
  scriptedTransportProviders,
);

const meta: Meta<AgentChatHostComponent> = {
  title: 'Agent/Chat',
  component: AgentChatHostComponent,
  ...component,
  argTypes: {
    ...component.argTypes,
    structured: { control: false, table: { disable: true } },
    knowledgeSources: { control: false, table: { disable: true } },
    suggestions: { control: false, table: { disable: true } },
    slashCommands: { control: false, table: { disable: true } },
    models: { control: false, table: { disable: true } },
    replayRunId: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<AgentChatHostComponent>;

/** Plain conversation: assistant reply with a `queryRevenue` action chip. */
export const conversationThroughTime: Story = {
  args: {
    reply: 'The quarterly revenue grew 12%, driven mostly by the EMEA segment.',
    actions: ['queryRevenue'],
  },
};

/** Structured-object story: the reply carries a `structuredOutput` invoice payload. */
export const structuredObject: Story = {
  args: {
    reply: 'Extracted the invoice fields from the attachment.',
    structured: {
      invoiceNumber: 'INV-2026-0142',
      total: '1.480,00 EUR',
      dueDate: '2026-11-30',
      lines: [
        { item: 'Console seat', quantity: 2 },
        { item: 'Support plan', quantity: 1 },
      ],
    },
  },
};

/** Knowledge-base story: two selectable sources feed the composer's selector. */
export const knowledgeBase: Story = {
  args: {
    knowledgeSources: [
      { id: 'kb-handbook', label: 'Employee handbook' },
      { id: 'kb-price-list', label: 'Price list 2026' },
    ],
    reply: 'Per the employee handbook, remote work requires manager approval.',
  },
};

/** Failed roundtrip: node failure message plus failed telemetry row. */
export const errorRoundtrip: Story = {
  args: {
    fail: true,
  },
};

/** Backend-unavailable story: `send` rejects and the error banner renders. */
export const backendUnavailable: Story = {
  args: {
    throwOnSend: true,
  },
};

/** Replay story: the host replays a recorded run id on view init. */
export const replayConversation: Story = {
  args: {
    replayRunId: 'scripted-run-replay',
    reply: 'Replayed answer from the recorded run.',
    delayMs: 120,
  },
};

/** Composed surface: suggestions, slash commands, and the model selector wired to the scripted reply. */
export const composedSurface: Story = {
  args: {
    reply: 'Pick a suggestion, type a slash command, or switch the model — all of it is composed from the chat suite.',
    suggestions: [
      'Summarize the last quarter',
      'Show me the full roundtrip',
      'Extract invoice INV-2026-0142',
    ],
    slashCommands: [
      { name: 'summarize', description: 'Summarize the conversation' },
      { name: 'extract', description: 'Extract a structured object' },
    ],
    models: [
      { id: 'demo-fast', name: 'Demo Fast', provider: 'local' },
      { id: 'demo-reasoning', name: 'Demo Reasoning', provider: 'local' },
    ],
  },
};

/** Slow roundtrip: long per-step delay keeps the typing indicator observable. */
export const slowRoundtrip: Story = {
  args: {
    reply: 'This roundtrip streams slowly so the typing state is observable.',
    delayMs: 1200,
  },
};
