/**
 * @module for-angular/agent/services/AgentChatFakeTransport
 * @summary Deterministic, in-browser scripted {@link AgentChatTransport} used
 * by the demo chat page and Storybook integration stories.
 * @description Plays a fixed, timed conversation through the same envelope
 * contract as {@link GraphRunAgentChatTransport}: no network, no backend, no
 * randomness. Every streamed response exercises the full component families
 * produced by the chat suite — token-by-token text, a reasoning block, a code
 * block, tool calls with results (orders, tracker, weather), workflow status
 * transitions, progress events, an approval prompt, telemetry, and a streamed
 * structured object.
 *
 * Component families that are not part of the transcript are delivered through
 * {@link AgentChatFakeTransport.demoEvents$}, a demo-only side channel of
 * {@link AgentChatDemoEvent}s consumed by the demo page. The canonical graph
 * envelopes still travel through the normal
 * {@link AgentChatTransportHandlers} callbacks so `AgentChatService` folds them
 * exactly like a live run.
 *
 * The script respects cancellation: {@link cancel} clears every pending timer
 * and emits a single `WORKFLOW_CANCELLED` terminal envelope.
 */
import { Injectable } from "@angular/core";
import { Subject, type Observable } from "rxjs";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import type { GraphRunEventEnvelope } from "@decaf-ts/as-graph/shared";
import type {
  AgentChatDemoEvent,
  AgentChatDemoOptions,
  AgentChatDemoScenario,
  AgentChatOrder,
  AgentChatRunDescriptor,
  AgentChatSendRequest,
  AgentChatTransport,
  AgentChatTransportHandlers,
  AgentChatWeather,
  AgentChatWorkflowStep,
} from "../types";

/** Demo workflow id stamped on every scripted envelope. */
export const AGENT_CHAT_DEMO_WORKFLOW_ID = "wf-agent-chat-demo";

/** Node id of the scripted chat trigger node. */
const DEMO_INTAKE_NODE = "chat-intake";
/** Node id of the scripted agent node. */
const DEMO_AGENT_NODE = "chat-agent";
/** Node id of the scripted tool node. */
const DEMO_TOOL_NODE = "chat-tools";

/** One scripted step: an envelope plus an optional demo-only side event. */
interface AgentChatFakeStep {
  /** Delay from the previous step, in unscaled milliseconds. */
  readonly delayMs: number;
  /** Graph event carried by the envelope. */
  readonly type: GraphExecutionEventType;
  /** Optional `node.output`-style payload. */
  readonly payload?: Record<string, unknown>;
  /** Optional node id. */
  readonly nodeId?: string;
  /** Optional error payload for failure steps. */
  readonly error?: { name?: string; message: string };
  /** Demo-only side event delivered when the step fires. */
  readonly demo?: AgentChatDemoEvent;
}

/** Mutable per-run playback state. */
interface RunPlayback {
  readonly runId: string;
  readonly handlers: AgentChatTransportHandlers;
  readonly startedAt: number;
  sequence: number;
  scheduledMs: number;
  readonly timers: Set<ReturnType<typeof setTimeout>>;
  cancelled: boolean;
  finished: boolean;
}

/** Demo fixture: three order rows rendered by the orders tool card. */
const DEMO_ORDERS: AgentChatOrder[] = [
  {
    id: "ORD-1042",
    name: "Console seat",
    date: "2026-10-24",
    status: "Shipped",
    icon: "box",
  },
  {
    id: "ORD-1043",
    name: "Support plan",
    date: "2026-10-21",
    status: "Delivered",
    icon: "check",
  },
  {
    id: "ORD-1044",
    name: "Travel case",
    date: "2026-10-18",
    status: "Processing",
    icon: "loader",
  },
];

/** Demo fixture: weather payload rendered by the weather tool card. */
const DEMO_WEATHER: AgentChatWeather = {
  location: "Lisbon",
  condition: "Sunny",
  high: 24,
  low: 17,
  unit: "°C",
  state: "success",
};

/** Demo fixture: workflow steps shown by `ngx-decaf-chat-workflow-status`. */
function workflowSteps(
  intake: AgentChatWorkflowStep["status"],
  retrieve: AgentChatWorkflowStep["status"],
  respond: AgentChatWorkflowStep["status"],
): AgentChatWorkflowStep[] {
  return [
    { id: "intake", name: "Understand the request", status: intake },
    { id: "retrieve", name: "Retrieve context", status: retrieve },
    { id: "respond", name: "Compose the answer", status: respond },
  ];
}

/**
 * Deterministic scripted transport. Configure with {@link configure} before
 * mounting the chat; every {@link send} replays the selected scenario.
 */
@Injectable()
export class AgentChatFakeTransport implements AgentChatTransport {
  /** Demo-only side channel for non-transcript component families. */
  private readonly demoEvents = new Subject<AgentChatDemoEvent>();
  /** Observable view of {@link demoEvents}. */
  readonly demoEvents$: Observable<AgentChatDemoEvent> =
    this.demoEvents.asObservable();

  /** Currently selected scripted scenario. */
  private scenario: AgentChatDemoScenario = "conversation";
  /** Playback speed multiplier (higher is faster). */
  private speed = 1;
  /** Monotonic run counter backing deterministic run ids. */
  private runSequence = 0;
  /** Live playback states keyed by run id. */
  private readonly runs = new Map<string, RunPlayback>();

  /** Selects the scripted scenario and playback speed. */
  configure(options: AgentChatDemoOptions = {}): void {
    if (options.scenario) this.scenario = options.scenario;
    if (typeof options.speed === "number" && options.speed > 0) {
      this.speed = options.speed;
    }
  }

  /** Active scripted scenario. */
  get activeScenario(): AgentChatDemoScenario {
    return this.scenario;
  }

  /**
   * Creates a deterministic run and starts streaming its scripted timeline.
   * Resolves with the descriptor immediately, mirroring the real transport.
   */
  async send(
    request: AgentChatSendRequest,
    handlers: AgentChatTransportHandlers,
  ): Promise<AgentChatRunDescriptor> {
    const runId = `demo-run-${++this.runSequence}`;
    this.start(runId, request.message, handlers);
    return {
      runId,
      eventsUrl: `/demo/agent-chat/runs/${runId}/events`,
    };
  }

  /** Replays the current scenario under the recorded run id. */
  async replay(
    descriptor: AgentChatRunDescriptor,
    handlers: AgentChatTransportHandlers,
  ): Promise<void> {
    this.cancelRun(descriptor.runId, false);
    this.start(descriptor.runId, "", handlers);
  }

  /** Cancels a live run: pending steps are dropped and one terminal cancel envelope is emitted. */
  async cancel(runId: string): Promise<void> {
    this.cancelRun(runId, true);
  }

  /** True while `runId` is still streaming (timers pending, not finished). */
  isRunning(runId: string): boolean {
    const run = this.runs.get(runId);
    return !!run && !run.finished && !run.cancelled;
  }

  /** Starts (or restarts) playback for a run. */
  private start(
    runId: string,
    message: string,
    handlers: AgentChatTransportHandlers,
  ): void {
    this.cancelRun(runId, false);
    const run: RunPlayback = {
      runId,
      handlers,
      startedAt: Date.now(),
      sequence: 0,
      scheduledMs: 0,
      timers: new Set(),
      cancelled: false,
      finished: false,
    };
    this.runs.set(runId, run);
    this.demoEvents.next({ kind: "reset" });
    for (const step of this.script(message, runId)) this.schedule(run, step);
  }

  /** Stops a run's timers, optionally emitting the terminal cancellation envelope. */
  private cancelRun(runId: string, announce: boolean): void {
    const run = this.runs.get(runId);
    if (!run) return;
    run.cancelled = true;
    for (const timer of run.timers) clearTimeout(timer);
    run.timers.clear();
    if (announce && !run.finished) {
      run.finished = true;
      const envelope = this.envelope(
        run,
        GraphExecutionEventType.WORKFLOW_CANCELLED,
        undefined,
      );
      run.handlers.onEvent(envelope);
      run.handlers.onTerminal(envelope);
      this.demoEvents.next({
        kind: "notification",
        notification: {
          id: `${runId}-cancelled`,
          severity: "warning",
          message: "The scripted response was cancelled.",
          autoDismissMs: 4000,
        },
      });
    }
    this.runs.delete(runId);
  }

  /** Schedules one step relative to the run start. */
  private schedule(run: RunPlayback, step: AgentChatFakeStep): void {
    run.scheduledMs += step.delayMs;
    const elapsed = Math.max(1, Math.round(run.scheduledMs / this.speed));
    const timer = setTimeout(() => this.fire(run, step), elapsed);
    run.timers.add(timer);
  }

  /** Emits one step's envelope and demo event, settling the run on terminal types. */
  private fire(run: RunPlayback, step: AgentChatFakeStep): void {
    if (run.cancelled || run.finished) return;
    const envelope = this.envelope(run, step.type, step);
    run.handlers.onEvent(envelope);
    if (step.demo) this.demoEvents.next(step.demo);
    if (isTerminalType(step.type)) {
      run.finished = true;
      run.handlers.onTerminal(envelope);
      this.runs.delete(run.runId);
    }
  }

  /** Builds one envelope with the run's next sequence and a deterministic-relative timestamp. */
  private envelope(
    run: RunPlayback,
    type: GraphExecutionEventType,
    step: AgentChatFakeStep | undefined,
  ): GraphRunEventEnvelope {
    const sequence = ++run.sequence;
    return {
      runId: run.runId,
      workflowId: AGENT_CHAT_DEMO_WORKFLOW_ID,
      sequence,
      type,
      timestamp: new Date(run.startedAt + sequence * 10).toISOString(),
      ...(step?.nodeId ? { nodeId: step.nodeId } : {}),
      ...(step?.payload ? { payload: step.payload as never } : {}),
      ...(step?.error ? { error: step.error } : {}),
    } as GraphRunEventEnvelope;
  }

  /** Builds the scripted timeline for the selected scenario. */
  private script(message: string, runId: string): AgentChatFakeStep[] {
    return this.scenario === "structured-object"
      ? structuredScript(message, runId)
      : conversationScript(message, runId);
  }
}

/** True for the three terminal graph event types. */
function isTerminalType(type: GraphExecutionEventType): boolean {
  return (
    type === GraphExecutionEventType.WORKFLOW_COMPLETED ||
    type === GraphExecutionEventType.WORKFLOW_FAILED ||
    type === GraphExecutionEventType.WORKFLOW_CANCELLED
  );
}

/** Splits the demo answer into word-sized streaming chunks. */
function tokenize(text: string): string[] {
  const chunks: string[] = [];
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue;
    chunks.push(word);
  }
  return chunks;
}

/** Builds a text part carrying the cumulative streamed text. */
function textPart(text: string, streaming: boolean): Record<string, unknown> {
  return { id: "answer", kind: "text", text, streaming };
}

/** Reasoning part shown while the scripted "model" plans its answer. */
function reasoningPart(content: string, streaming: boolean): Record<string, unknown> {
  return {
    id: "reasoning",
    kind: "reasoning",
    title: "Plan the answer",
    content,
    streaming,
    open: true,
  };
}

/** Code part demonstrating the code-block component. */
function codePart(): Record<string, unknown> {
  return {
    id: "code",
    kind: "code",
    language: "typescript",
    filename: "forecast.ts",
    code: [
      "export function describeForecast(location: string, high: number) {",
      "  return `${location}: ${high}°C, clear skies`;",
      "}",
    ].join("\n"),
  };
}

/** Generic tool part used by the message transcript. */
function toolPart(
  id: string,
  name: string,
  status: "queued" | "running" | "succeeded" | "failed",
  input?: unknown,
  output?: unknown,
): Record<string, unknown> {
  return {
    id,
    kind: "tool",
    name,
    status,
    ...(input !== undefined ? { input } : {}),
    ...(output !== undefined ? { output } : {}),
  };
}

/** Prefixes the demo answer with an echo of the user's message. */
function answerPrefix(message: string): string {
  const trimmed = message.trim();
  return trimmed
    ? `You asked: "${trimmed}". `
    : "";
}

/**
 * Conversation scenario: streamed reasoning + text, code, orders, tracker,
 * weather, workflow status, progress, approval, nested agent, and telemetry.
 */
function conversationScript(message: string, runId: string): AgentChatFakeStep[] {
  const steps: AgentChatFakeStep[] = [];
  const messageId = `${runId}:assistant`;
  const step = (
    delayMs: number,
    type: GraphExecutionEventType,
    extra: Partial<AgentChatFakeStep> = {},
  ): void => {
    steps.push({ delayMs, type, ...extra });
  };

  const answer = `${answerPrefix(message)}I checked the storefront, shipment tracking, and the local forecast. Here is the complete roundtrip, rendered entirely from deterministic fixtures.`;
  const tokens = tokenize(answer);
  const parts: Record<string, unknown>[] = [
    reasoningPart("Read the request, then call the orders, tracker, and weather tools.", true),
  ];

  step(80, GraphExecutionEventType.WORKFLOW_STARTED, {
    demo: {
      kind: "workflow-steps",
      steps: workflowSteps("running", "waiting", "waiting"),
    },
  });
  step(80, GraphExecutionEventType.NODE_QUEUED, { nodeId: DEMO_INTAKE_NODE });
  step(80, GraphExecutionEventType.NODE_COMPLETED, { nodeId: DEMO_INTAKE_NODE });
  step(60, GraphExecutionEventType.NODE_QUEUED, { nodeId: DEMO_AGENT_NODE });
  step(60, GraphExecutionEventType.NODE_STARTED, { nodeId: DEMO_AGENT_NODE });
  step(40, GraphExecutionEventType.GRAPH_RUN_LOG, {
    payload: { message: "Scripted demo run started" },
  });
  step(40, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      response: "",
      streaming: true,
      parts,
    },
    demo: {
      kind: "progress",
      event: {
        id: "thinking",
        label: "Preparing the answer",
        value: 12,
        total: 100,
      },
    },
  });
  step(160, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      response: "",
      streaming: true,
      parts: [
        reasoningPart(
          "Read the request, then call the orders, tracker, and weather tools. Once the three results are available, compose the answer and request approval before finishing.",
          false,
        ),
      ],
    },
    demo: {
      kind: "workflow-steps",
      steps: workflowSteps("success", "running", "waiting"),
    },
  });
  step(40, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      response: "",
      streaming: true,
      parts: [
        reasoningPart(
          "Read the request, then call the orders, tracker, and weather tools. Once the three results are available, compose the answer and request approval before finishing.",
          false,
        ),
        textPart("", true),
      ],
    },
    demo: {
      kind: "progress",
      event: {
        id: "drafting",
        label: "Drafting the answer",
        value: 28,
        total: 100,
      },
    },
  });

  let streamed = "";
  tokens.forEach((token, index) => {
    streamed += token;
    const visibleParts = [
      reasoningPart(
        "Read the request, then call the orders, tracker, and weather tools. Once the three results are available, compose the answer and request approval before finishing.",
        false,
      ),
      textPart(streamed, true),
    ];
    step(index === 0 ? 60 : 18, GraphExecutionEventType.NODE_OUTPUT, {
      nodeId: DEMO_AGENT_NODE,
      payload: { messageId, response: streamed, streaming: true, parts: visibleParts },
      ...(index === Math.floor(tokens.length / 2)
        ? {
            demo: {
              kind: "progress",
              event: {
                id: "drafting",
                label: "Drafting the answer",
                value: 48,
                total: 100,
              },
            } satisfies AgentChatDemoEvent,
          }
        : {}),
    });
  });

  const withCode = [
    reasoningPart(
      "Read the request, then call the orders, tracker, and weather tools. Once the three results are available, compose the answer and request approval before finishing.",
      false,
    ),
    textPart(streamed, false),
    codePart(),
  ];

  step(60, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: { messageId, response: streamed, parts: withCode },
    demo: {
      kind: "progress",
      event: {
        id: "tools",
        label: "Calling tools",
        value: 62,
        total: 100,
      },
    },
  });

  step(40, GraphExecutionEventType.NODE_QUEUED, { nodeId: DEMO_TOOL_NODE });
  step(40, GraphExecutionEventType.NODE_STARTED, { nodeId: DEMO_TOOL_NODE });
  step(80, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_TOOL_NODE,
    payload: {
      messageId,
      response: streamed,
      parts: [
        ...withCode,
        toolPart("tool-orders", "orders", "running", { status: "shipped" }),
      ],
    },
    demo: { kind: "orders", orders: DEMO_ORDERS },
  });
  step(90, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_TOOL_NODE,
    payload: {
      messageId,
      response: streamed,
      parts: [
        ...withCode,
        toolPart("tool-orders", "orders", "succeeded", { status: "shipped" }, {
          count: DEMO_ORDERS.length,
        }),
        toolPart("tool-tracker", "tracker", "running"),
      ],
    },
    demo: {
      kind: "tracker",
      status: "shipped",
      progress: 66,
      label: "Parcel on the way",
      description: "Lisbon → Porto, expected tomorrow.",
    },
  });
  step(90, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_TOOL_NODE,
    payload: {
      messageId,
      response: streamed,
      parts: [
        ...withCode,
        toolPart("tool-orders", "orders", "succeeded", { status: "shipped" }, {
          count: DEMO_ORDERS.length,
        }),
        toolPart("tool-tracker", "tracker", "succeeded", undefined, {
          status: "shipped",
        }),
        toolPart("tool-weather", "weather", "succeeded", { location: "Lisbon" }, DEMO_WEATHER),
      ],
    },
    demo: { kind: "weather", weather: DEMO_WEATHER },
  });
  step(40, GraphExecutionEventType.NODE_COMPLETED, { nodeId: DEMO_TOOL_NODE });
  step(40, GraphExecutionEventType.NODE_QUEUED, { nodeId: "research-agent" });
  step(40, GraphExecutionEventType.NODE_STARTED, { nodeId: "research-agent" });
  step(60, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: { messageId, response: streamed, parts: withCode },
    demo: {
      kind: "agent-step",
      step: {
        id: "research",
        name: "Research agent",
        status: "running",
        input: { topics: ["orders", "shipment", "weather"] },
      },
    },
  });
  step(80, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: { messageId, response: streamed, parts: withCode },
    demo: {
      kind: "nested-agent",
      snapshot: {
        runId: "demo-nested-research",
        depth: 1,
        ancestry: ["orchestrator"],
        status: "running",
        streaming: true,
        text: "Cross-checking the shipment status against the order date…",
      },
    },
  });
  step(80, GraphExecutionEventType.NODE_COMPLETED, { nodeId: "research-agent" });
  step(40, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: { messageId, response: streamed, parts: withCode },
    demo: {
      kind: "agent-step",
      step: {
        id: "research",
        name: "Research agent",
        status: "success",
        output: { orders: 3, inTransit: 1, forecast: "24°C sunny" },
      },
    },
  });
  step(40, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: { messageId, response: streamed, parts: withCode },
    demo: {
      kind: "nested-agent",
      snapshot: {
        runId: "demo-nested-research",
        depth: 1,
        ancestry: ["orchestrator"],
        status: "success",
        streaming: false,
        text: "Shipment and order dates agree; the forecast is confirmed.",
      },
    },
  });
  step(60, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      response:
        `${streamed} Three orders are on file, the shipment is in transit, and Lisbon is 24°C and sunny.`,
      parts: [
        reasoningPart(
          "Read the request, then call the orders, tracker, and weather tools. Once the three results are available, compose the answer and request approval before finishing.",
          false,
        ),
        textPart(
          `${streamed} Three orders are on file, the shipment is in transit, and Lisbon is 24°C and sunny.`,
          false,
        ),
        codePart(),
        toolPart("tool-orders", "orders", "succeeded", undefined, {
          count: DEMO_ORDERS.length,
        }),
        toolPart("tool-tracker", "tracker", "succeeded"),
        toolPart("tool-weather", "weather", "succeeded", undefined, DEMO_WEATHER),
      ],
    },
    demo: {
      kind: "workflow-steps",
      steps: workflowSteps("success", "success", "running"),
    },
  });
  step(60, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      response: "Approve sending this summary to the customer?",
      parts: [
        reasoningPart(
          "Read the request, then call the orders, tracker, and weather tools. Once the three results are available, compose the answer and request approval before finishing.",
          false,
        ),
        textPart(
          `${streamed} Three orders are on file, the shipment is in transit, and Lisbon is 24°C and sunny.`,
          false,
        ),
        codePart(),
        toolPart("tool-orders", "orders", "succeeded", undefined, {
          count: DEMO_ORDERS.length,
        }),
        toolPart("tool-tracker", "tracker", "succeeded"),
        toolPart("tool-weather", "weather", "succeeded", undefined, DEMO_WEATHER),
      ],
      structuredOutput: {
        orders: DEMO_ORDERS.length,
        inTransit: 1,
        forecast: { location: "Lisbon", high: 24, low: 17 },
      },
    },
    demo: {
      kind: "approval",
      status: "pending",
      runId: "demo-run-approval",
      toolName: "sendSummary",
      payload: {
        to: "customer@example.com",
        summary: "Three orders, one shipment in transit, sunny in Lisbon.",
      },
    },
  });
  step(40, GraphExecutionEventType.WORKFLOW_SUSPENDED, {
    demo: {
      kind: "progress",
      event: {
        id: "done",
        label: "Roundtrip complete",
        value: 100,
        total: 100,
        done: true,
      },
    },
  });
  step(30, GraphExecutionEventType.GRAPH_RUN_LOG, {
    payload: { message: "Scripted demo run finished" },
    demo: {
      kind: "workflow-steps",
      steps: workflowSteps("success", "success", "success"),
    },
  });
  step(40, GraphExecutionEventType.WORKFLOW_COMPLETED, {
    demo: {
      kind: "notification",
      notification: {
        id: "demo-complete",
        severity: "success",
        message: "Scripted roundtrip complete — every response was generated locally.",
        autoDismissMs: 6000,
      },
    },
  });
  return steps;
}

/** Structured-object scenario: text plus a DeepPartial payload filling field by field. */
function structuredScript(message: string, runId: string): AgentChatFakeStep[] {
  const steps: AgentChatFakeStep[] = [];
  const messageId = `${runId}:assistant`;
  const step = (
    delayMs: number,
    type: GraphExecutionEventType,
    extra: Partial<AgentChatFakeStep> = {},
  ): void => {
    steps.push({ delayMs, type, ...extra });
  };

  const answer = `${answerPrefix(message)}I extracted the invoice fields; watch the structured object fill in as each field arrives.`;
  const tokens = tokenize(answer);
  let streamed = "";

  step(80, GraphExecutionEventType.WORKFLOW_STARTED, {
    demo: {
      kind: "workflow-steps",
      steps: workflowSteps("success", "running", "waiting"),
    },
  });
  step(60, GraphExecutionEventType.NODE_QUEUED, { nodeId: DEMO_AGENT_NODE });
  step(60, GraphExecutionEventType.NODE_STARTED, { nodeId: DEMO_AGENT_NODE });
  step(60, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      streaming: true,
      parts: [textPart("", true)],
    },
    demo: {
      kind: "progress",
      event: {
        id: "extract",
        label: "Extracting invoice fields",
        value: 15,
        total: 100,
      },
    },
  });

  tokens.forEach((token, index) => {
    streamed += token;
    step(index === 0 ? 40 : 16, GraphExecutionEventType.NODE_OUTPUT, {
      nodeId: DEMO_AGENT_NODE,
      payload: {
        messageId,
        response: streamed,
        streaming: true,
        parts: [textPart(streamed, true)],
      },
    });
  });

  const partials: Record<string, unknown>[] = [
    { invoiceNumber: "INV-2026-0142" },
    { invoiceNumber: "INV-2026-0142", vendor: "Northwind Supply" },
    { invoiceNumber: "INV-2026-0142", vendor: "Northwind Supply", total: 1480 },
    {
      invoiceNumber: "INV-2026-0142",
      vendor: "Northwind Supply",
      total: 1480,
      currency: "EUR",
    },
    {
      invoiceNumber: "INV-2026-0142",
      vendor: "Northwind Supply",
      total: 1480,
      currency: "EUR",
      dueDate: "2026-11-30",
    },
    {
      invoiceNumber: "INV-2026-0142",
      vendor: "Northwind Supply",
      total: 1480,
      currency: "EUR",
      dueDate: "2026-11-30",
      lines: [{ item: "Console seat", quantity: 2 }],
    },
    {
      invoiceNumber: "INV-2026-0142",
      vendor: "Northwind Supply",
      total: 1480,
      currency: "EUR",
      dueDate: "2026-11-30",
      lines: [
        { item: "Console seat", quantity: 2, unitPrice: 640 },
        { item: "Support plan", quantity: 1, unitPrice: 200 },
      ],
    },
  ];

  partials.forEach((value, index) => {
    step(70, GraphExecutionEventType.NODE_OUTPUT, {
      nodeId: DEMO_AGENT_NODE,
      payload: {
        messageId,
        response: streamed,
        streaming: true,
        parts: [textPart(streamed, !isLast(index, partials.length))],
        structuredOutput: value,
      },
      demo: {
        kind: "progress",
        event: {
          id: "extract",
          label: "Extracting invoice fields",
          value: 20 + Math.round(((index + 1) / partials.length) * 70),
          total: 100,
        },
      },
    });
  });

  step(50, GraphExecutionEventType.NODE_OUTPUT, {
    nodeId: DEMO_AGENT_NODE,
    payload: {
      messageId,
      response: streamed,
      parts: [textPart(streamed, false)],
      structuredOutput: partials[partials.length - 1],
    },
  });
  step(50, GraphExecutionEventType.NODE_COMPLETED, { nodeId: DEMO_AGENT_NODE });
  step(30, GraphExecutionEventType.GRAPH_RUN_LOG, {
    payload: { message: "Structured object committed" },
    demo: {
      kind: "workflow-steps",
      steps: workflowSteps("success", "success", "success"),
    },
  });
  step(50, GraphExecutionEventType.WORKFLOW_COMPLETED, {
    demo: {
      kind: "progress",
      event: {
        id: "done",
        label: "Structured object committed",
        value: 100,
        total: 100,
        done: true,
      },
    },
  });
  return steps;
}

/** True when `index` is the last entry of a list of `length` items. */
function isLast(index: number, length: number): boolean {
  return index === length - 1;
}
