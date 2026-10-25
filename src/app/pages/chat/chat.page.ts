import {
  Component,
  computed,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { IonContent } from "@ionic/angular/standalone";
import {
  AGENT_CHAT_HISTORY_SOURCE,
  AGENT_CHAT_KNOWLEDGE_BASE_SOURCE,
  AGENT_CHAT_TRANSPORT,
  AgentChatApprovalDenial,
  AgentChatApprovalResume,
  AgentChatApprovalStatus,
  AgentChatComponent,
  AgentChatDemoEvent,
  AgentChatDemoScenario,
  AgentChatFakeTransport,
  AgentChatHistoryEntry,
  AgentChatKnowledgeBaseEntry,
  AgentChatNotification,
  AgentChatNestedAgentSnapshot,
  AgentChatOrder,
  AgentChatProgressEvent,
  AgentChatTrackerStatus,
  AgentChatWeather,
  AgentChatWorkflowStep,
  AgentChatAgentStep,
  AgentTranslateFallbackPipe,
  ChatAgentStepComponent,
  ChatApprovalComponent,
  ChatNestedAgentComponent,
  ChatNotificationComponent,
  ChatProgressComponent,
  ChatToolOrdersComponent,
  ChatToolTrackerComponent,
  ChatToolWeatherComponent,
  ChatWorkflowStatusComponent,
  InMemoryAgentChatHistorySource,
  InMemoryAgentKnowledgeBaseSource,
} from "@decaf-ts/for-angular/agent";
import { Subscription } from "rxjs";

/** Seed history entries used by the demo's in-memory history source. */
const DEMO_HISTORY: AgentChatHistoryEntry[] = [
  {
    id: "demo-history-1",
    title: "Weekly revenue review",
    preview: "Quarterly revenue grew 12% driven by EMEA.",
    updatedAt: "2026-10-24T09:12:00.000Z",
    messageCount: 8,
    visibility: "private",
  },
  {
    id: "demo-history-2",
    title: "Shipment follow-up",
    preview: "Where is order ORD-1042?",
    updatedAt: "2026-10-23T16:48:00.000Z",
    messageCount: 5,
    visibility: "shared",
    sharedWith: ["support@example.com"],
  },
  {
    id: "demo-history-3",
    title: "Invoice extraction",
    preview: "Extract the fields from invoice INV-2026-0142.",
    updatedAt: "2026-10-22T11:03:00.000Z",
    messageCount: 12,
    visibility: "public",
  },
];

/** Seed knowledge-base entries used by the demo's in-memory source. */
const DEMO_KNOWLEDGE_BASE: AgentChatKnowledgeBaseEntry[] = [
  {
    id: "kb-handbook",
    label: "Employee handbook",
    fileName: "employee-handbook.md",
    mime: "text/markdown",
    size: 18_420,
    updatedAt: "2026-10-20T08:00:00.000Z",
    fileCount: 1,
    status: "ready",
  },
  {
    id: "kb-price-list",
    label: "Price list 2026",
    fileName: "price-list-2026.csv",
    mime: "text/csv",
    size: 42_100,
    updatedAt: "2026-10-18T14:30:00.000Z",
    fileCount: 1,
    status: "ready",
  },
  {
    id: "kb-shipping",
    label: "Shipping playbook",
    fileName: "shipping-playbook.pdf",
    mime: "application/pdf",
    size: 320_000,
    updatedAt: "2026-10-12T10:10:00.000Z",
    fileCount: 1,
    status: "ready",
  },
];

/**
 * Demo chat page: hosts the refactored `ngx-decaf-agent-chat` in fake mode and
 * renders the component families that live outside the transcript, driven by
 * the fake transport's demo side channel.
 */
@Component({
  selector: "app-chat",
  standalone: true,
  imports: [
    IonContent,
    AgentChatComponent,
    AgentTranslateFallbackPipe,
    ChatWorkflowStatusComponent,
    ChatProgressComponent,
    ChatAgentStepComponent,
    ChatNestedAgentComponent,
    ChatApprovalComponent,
    ChatNotificationComponent,
    ChatToolOrdersComponent,
    ChatToolTrackerComponent,
    ChatToolWeatherComponent,
  ],
  providers: [
    AgentChatFakeTransport,
    { provide: AGENT_CHAT_TRANSPORT, useExisting: AgentChatFakeTransport },
    {
      provide: AGENT_CHAT_HISTORY_SOURCE,
      useFactory: () => new InMemoryAgentChatHistorySource(DEMO_HISTORY),
    },
    {
      provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE,
      useFactory: () => new InMemoryAgentKnowledgeBaseSource(DEMO_KNOWLEDGE_BASE),
    },
  ],
  templateUrl: "./chat.page.html",
  styleUrls: ["./chat.page.scss"],
})
export class ChatPage implements OnInit, OnDestroy {
  /** Fake transport shared by the hosted chat and this page's demo panels. */
  readonly transport = inject(AgentChatFakeTransport);
  private readonly destroyRef = inject(DestroyRef);
  private readonly subscription = new Subscription();

  /** Hosted chat component, used to reset the transcript on a scenario switch. */
  readonly chat = viewChild(AgentChatComponent);

  /** Selected demo scenario. */
  readonly scenario = signal<AgentChatDemoScenario>("conversation");
  /** Scripted workflow step snapshot. */
  readonly workflowSteps = signal<AgentChatWorkflowStep[]>([]);
  /** Latest progress event. */
  readonly progress = signal<AgentChatProgressEvent | null>(null);
  /** Latest agent-network step snapshot. */
  readonly agentStep = signal<AgentChatAgentStep | null>(null);
  /** Latest nested-agent snapshot. */
  readonly nestedAgent = signal<AgentChatNestedAgentSnapshot | null>(null);
  /** Approval status currently shown. */
  readonly approvalStatus = signal<AgentChatApprovalStatus>("pending");
  /** Approval payload currently shown. */
  readonly approvalPayload = signal<unknown>(undefined);
  /** Approval run id currently shown. */
  readonly approvalRunId = signal<string>("demo-run-approval");
  /** Approval tool name currently shown. */
  readonly approvalToolName = signal<string | null>(null);
  /** Orders tool result. */
  readonly orders = signal<AgentChatOrder[]>([]);
  /** Tracker status. */
  readonly trackerStatus = signal<AgentChatTrackerStatus>("ordered");
  /** Tracker progress percentage. */
  readonly trackerProgress = signal<number>(0);
  /** Tracker label. */
  readonly trackerLabel = signal<string | null>(null);
  /** Tracker description. */
  readonly trackerDescription = signal<string | null>(null);
  /** Weather tool result. */
  readonly weather = signal<AgentChatWeather | null>(null);
  /** Toast notifications. */
  readonly notifications = signal<AgentChatNotification[]>([]);

  /** Progress events array consumed by `ngx-decaf-chat-progress`. */
  readonly progressEvents = computed(() => {
    const event = this.progress();
    return event ? [event] : [];
  });

  /** Model choices exposed to the composer's selector. */
  readonly models = [
    { id: "demo-fast", name: "Demo Fast", provider: "local", description: "Scripted fast responses" },
    { id: "demo-reasoning", name: "Demo Reasoning", provider: "local", description: "Scripted reasoning blocks" },
  ];
  /** Suggested prompts offered before the first message. */
  readonly suggestions = [
    "Show me the full roundtrip",
    "Where is my order?",
    "Extract invoice INV-2026-0142",
  ];
  /** Slash commands offered by the composer. */
  readonly slashCommands = [
    { name: "summarize", description: "Summarize the conversation" },
    { name: "extract", description: "Extract a structured object" },
    { name: "clear", description: "Clear the conversation" },
  ];

  /** Subscribes to the fake transport's demo side channel. */
  ngOnInit(): void {
    this.transport.configure({ scenario: this.scenario(), speed: 1.6 });
    this.subscription.add(
      this.transport.demoEvents$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => this.applyDemoEvent(event)),
    );
  }

  /** Releases the demo subscriptions. */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** Switches the scripted scenario and clears the transcript and panels. */
  selectScenario(scenario: AgentChatDemoScenario): void {
    if (this.scenario() === scenario) return;
    this.scenario.set(scenario);
    const runId = this.chat()?.service.activeRunId();
    if (runId) void this.transport.cancel(runId);
    this.transport.configure({ scenario, speed: 1.6 });
    this.chat()?.service.reset();
    this.resetPanels();
  }

  /** Applies one demo side-channel event to the matching panel signal. */
  private applyDemoEvent(event: AgentChatDemoEvent): void {
    switch (event.kind) {
      case "reset":
        this.resetPanels();
        break;
      case "workflow-steps":
        this.workflowSteps.set(event.steps);
        break;
      case "agent-step":
        this.agentStep.set(event.step);
        break;
      case "nested-agent":
        this.nestedAgent.set(event.snapshot);
        break;
      case "progress":
        this.progress.set(event.event);
        break;
      case "approval":
        this.approvalStatus.set(event.status);
        this.approvalRunId.set(event.runId);
        this.approvalPayload.set(event.payload);
        this.approvalToolName.set(event.toolName ?? null);
        break;
      case "orders":
        this.orders.set(event.orders);
        break;
      case "tracker":
        this.trackerStatus.set(event.status);
        this.trackerProgress.set(event.progress);
        this.trackerLabel.set(event.label ?? null);
        this.trackerDescription.set(event.description ?? null);
        break;
      case "weather":
        this.weather.set(event.weather);
        break;
      case "notification":
        this.notifications.update((current) => [
          ...current.filter((entry) => entry.id !== event.notification.id),
          event.notification,
        ].slice(-4));
        break;
    }
  }

  /** Marks the approval as approved (demo only, no backend resume). */
  onApprove(_event: AgentChatApprovalResume): void {
    this.approvalStatus.set("approved");
    this.notifications.update((current) => [
      ...current,
      {
        id: `approval-approved-${Date.now()}`,
        severity: "success",
        message: "Approval recorded locally — no backend was called.",
        autoDismissMs: 5000,
      },
    ]);
  }

  /** Marks the approval as rejected (demo only, no backend resume). */
  onReject(_event: AgentChatApprovalDenial): void {
    this.approvalStatus.set("rejected");
    this.notifications.update((current) => [
      ...current,
      {
        id: `approval-rejected-${Date.now()}`,
        severity: "warning",
        message: "Rejection recorded locally — the scripted run is unchanged.",
        autoDismissMs: 5000,
      },
    ]);
  }

  /** Dismisses one notification. */
  dismissNotification(id: string): void {
    this.notifications.update((current) =>
      current.filter((entry) => entry.id !== id),
    );
  }

  /** Clears every demo-only panel. */
  private resetPanels(): void {
    this.workflowSteps.set([]);
    this.progress.set(null);
    this.agentStep.set(null);
    this.nestedAgent.set(null);
    this.approvalStatus.set("pending");
    this.approvalPayload.set(undefined);
    this.approvalRunId.set("demo-run-approval");
    this.approvalToolName.set(null);
    this.orders.set([]);
    this.trackerStatus.set("ordered");
    this.trackerProgress.set(0);
    this.trackerLabel.set(null);
    this.trackerDescription.set(null);
    this.weather.set(null);
    this.notifications.set([]);
  }
}
