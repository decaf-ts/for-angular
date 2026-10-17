import { TestBed } from "@angular/core/testing";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";

import { GraphBackendUnavailableError } from "../graph/execution/GraphExecutionService";
import { AGENT_CHAT_TRANSPORT } from "../agent";
import type {
  AgentChatSendRequest,
  AgentChatTransport,
  AgentChatTransportHandlers,
} from "../agent/types";
import stories, {
  backendUnavailable,
  conversationThroughTime,
  errorRoundtrip,
  knowledgeBase,
  replayConversation,
  slowRoundtrip,
  structuredObject,
} from "./agent-chat.stories";

type TransportStub = AgentChatTransport & {
  script: {
    steps: {
      delayMs: number;
      type: GraphExecutionEventType;
      payload?: Record<string, unknown>;
      error?: { name: string; message: string };
      nodeId?: string;
    }[];
    throwOnSend?: boolean;
  };
};

function sendRequest(): AgentChatSendRequest {
  return {
    message: "hello",
    attachments: [],
    knowledgeSourceIds: [],
    sessionId: "session-1",
    userId: "user-1",
  };
}

function recordingHandlers(): AgentChatTransportHandlers & {
  events: GraphRunEventEnvelope[];
  terminals: GraphRunEventEnvelope[];
} {
  const events: GraphRunEventEnvelope[] = [];
  const terminals: GraphRunEventEnvelope[] = [];
  return {
    events,
    terminals,
    onEvent: (e) => events.push(e),
    onTerminal: (e) => terminals.push(e),
    onError: () => undefined,
  };
}

function storyMetadataProviders(): unknown[] {
  let accumulated: Record<string, unknown> = {};
  const decorators = (stories.decorators ?? []) as unknown as Array<
    (s: () => Record<string, unknown>) => Record<string, unknown>
  >;
  for (const decorator of decorators) {
    accumulated = {
      ...accumulated,
      ...decorator(() => accumulated),
    };
  }
  const rendered = accumulated as { moduleMetadata?: { providers?: unknown[] } };
  return rendered.moduleMetadata?.providers ?? [];
}

function scriptedTransportFromStories(): TransportStub {
  const provider = storyMetadataProviders().find(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as { provide?: unknown }).provide === AGENT_CHAT_TRANSPORT,
  ) as { provide: unknown; useValue: TransportStub } | undefined;

  expect(provider).toBeDefined();
  expect(provider?.useValue).toBeDefined();
  expect(typeof provider?.useValue.send).toBe("function");
  expect(typeof provider?.useValue.replay).toBe("function");
  expect(typeof provider?.useValue.cancel).toBe("function");
  return provider!.useValue;
}

const ANSWER_SCRIPT: TransportStub["script"]["steps"] = [
  { delayMs: 5, type: GraphExecutionEventType.WORKFLOW_STARTED },
  { delayMs: 5, type: GraphExecutionEventType.NODE_QUEUED, nodeId: "chat-1" },
  { delayMs: 5, type: GraphExecutionEventType.NODE_COMPLETED, nodeId: "chat-1" },
  {
    delayMs: 5,
    type: GraphExecutionEventType.NODE_OUTPUT,
    nodeId: "agent-1",
    payload: { response: "the scripted answer" },
  },
  { delayMs: 5, type: GraphExecutionEventType.GRAPH_RUN_LOG },
  { delayMs: 5, type: GraphExecutionEventType.WORKFLOW_COMPLETED },
];

describe("agent-chat.stories — smoke contract", () => {
  it("exposes the Agent/Chat story file with its stories", () => {
    expect(stories.title).toBe("Agent/Chat");
    expect(stories.component).toBeDefined();
    expect(conversationThroughTime).toBeDefined();
    expect(structuredObject).toBeDefined();
    expect(knowledgeBase).toBeDefined();
    expect(errorRoundtrip).toBeDefined();
    expect(backendUnavailable).toBeDefined();
    expect(replayConversation).toBeDefined();
    expect(slowRoundtrip).toBeDefined();
  });

  it("wires the scripted transport into the story metadata", () => {
    expect(scriptedTransportFromStories()).toBeDefined();
  });

  describe("ScriptedAgentChatTransport", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    function mount(): TransportStub {
      TestBed.resetTestingModule();
      return scriptedTransportFromStories();
    }

    it("streams a full script (started → … → completed) with per-step delays", async () => {
      jest.useFakeTimers();
      const transport = mount();
      transport.script = { steps: ANSWER_SCRIPT.map((step) => ({ ...step })) };

      const handlers = recordingHandlers();
      const descriptor = await transport.send(sendRequest(), handlers);

      expect(descriptor.runId).toMatch(/^scripted-run-/);
      expect(descriptor.eventsUrl).toContain(descriptor.runId);
      expect(handlers.events).toHaveLength(0);

      await jest.advanceTimersByTimeAsync(5);
      expect(handlers.events.map((e) => e.type)).toEqual([
        GraphExecutionEventType.WORKFLOW_STARTED,
      ]);

      await jest.advanceTimersByTimeAsync(24);
      expect(handlers.events.map((e) => e.type)).toEqual([
        GraphExecutionEventType.WORKFLOW_STARTED,
        GraphExecutionEventType.NODE_QUEUED,
        GraphExecutionEventType.NODE_COMPLETED,
        GraphExecutionEventType.NODE_OUTPUT,
        GraphExecutionEventType.GRAPH_RUN_LOG,
      ]);
      expect(handlers.terminals).toHaveLength(0);

      await jest.advanceTimersByTimeAsync(5);
      expect(handlers.events.map((e) => e.type)).toEqual([
        GraphExecutionEventType.WORKFLOW_STARTED,
        GraphExecutionEventType.NODE_QUEUED,
        GraphExecutionEventType.NODE_COMPLETED,
        GraphExecutionEventType.NODE_OUTPUT,
        GraphExecutionEventType.GRAPH_RUN_LOG,
        GraphExecutionEventType.WORKFLOW_COMPLETED,
      ]);
      expect(handlers.terminals).toHaveLength(1);
      expect(handlers.terminals[0].type).toBe(GraphExecutionEventType.WORKFLOW_COMPLETED);
    });

    it("honours cancel: pending steps are replaced by a cancelled terminal", async () => {
      jest.useFakeTimers();
      const transport = mount();
      transport.script = { steps: ANSWER_SCRIPT.map((step) => ({ ...step })) };

      const handlers = recordingHandlers();
      const { runId } = await transport.send(sendRequest(), handlers);
      await transport.cancel(runId);

      await jest.advanceTimersByTimeAsync(40);

      const types = handlers.events.map((e) => e.type);
      expect(types).not.toContain(GraphExecutionEventType.WORKFLOW_STARTED);
      expect(types).not.toContain(GraphExecutionEventType.NODE_OUTPUT);
      expect(types).not.toContain(GraphExecutionEventType.NODE_QUEUED);
      expect(types).toContain(GraphExecutionEventType.WORKFLOW_CANCELLED);
      expect(handlers.terminals.map((e) => e.type)).toContain(
        GraphExecutionEventType.WORKFLOW_CANCELLED,
      );
      expect(handlers.terminals[0].type).toBe(GraphExecutionEventType.WORKFLOW_CANCELLED);
    });

    it("rejects the send with GraphBackendUnavailableError when the script throws", async () => {
      const transport = mount();
      transport.script = { steps: [], throwOnSend: true };

      await expect(transport.send(sendRequest(), recordingHandlers())).rejects.toThrow(
        GraphBackendUnavailableError,
      );
    });
  });
});
