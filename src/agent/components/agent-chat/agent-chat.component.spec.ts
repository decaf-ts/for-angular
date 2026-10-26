/**
 * @module for-angular/agent/components/agent-chat/agent-chat.component.spec
 * @summary Contract tests for the composed `ngx-decaf-agent-chat` surface.
 * @description The component is now a composition root over the chat component
 * suite, so the DOM hooks assert on the composed primitives
 * (`chat-conversation`, `chat-message`, `chat-composer`,
 * `chat-attachment-input`, `chat-knowledge-base-selector`,
 * `chat-telemetry`, `chat-structured-object`) while preserving every
 * behavioral contract of the previous monolith: empty state, title, message
 * rendering, typing state, error/backend banners, send gating, keyboard
 * handling, attachments, knowledge selection, telemetry, structured objects,
 * namespace chips, auto-scroll, and cancel. Additional coverage exercises the
 * newly composed inputs (suggestions, slash commands, model/visibility
 * selectors, history, inline edit, votes, and deletion).
 */
import type { Provider } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";
import { of } from "rxjs";

import {
  AGENT_CHAT_HISTORY_SOURCE,
  AGENT_CHAT_TRANSPORT,
} from "../../tokens/agent-chat.tokens";
import type {
  AgentChatHistoryEntry,
  AgentChatTransport,
  AgentChatTransportHandlers,
} from "../../types";
import { ChatHeaderComponent } from "../chat-header/chat-header.component";
import { AgentChatComponent } from "./agent-chat.component";

const RUN_ID = "run-1";
const EVENTS_URL = "/graph/runs/run-1/events";
const TS = "2026-01-01T00:00:00.000Z";

type TransportStub = AgentChatTransport & {
  send: jest.Mock;
  replay: jest.Mock;
  cancel: jest.Mock;
};

function transportStub(): TransportStub {
  return {
    send: jest.fn().mockResolvedValue({ runId: RUN_ID, eventsUrl: EVENTS_URL }),
    replay: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  } as never as TransportStub;
}

function envelope(
  sequence: number,
  type: GraphExecutionEventType,
  extra: Record<string, unknown> = {},
): Parameters<AgentChatTransportHandlers["onEvent"]>[0] {
  return {
    runId: RUN_ID,
    workflowId: "wf-1",
    sequence,
    type,
    timestamp: TS,
    ...extra,
  } as never;
}

function handlersOf(stub: TransportStub): AgentChatTransportHandlers {
  return stub.send.mock.calls[0][1] as AgentChatTransportHandlers;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mount(
  transport: TransportStub = transportStub(),
  providers: Provider[] = [],
): ComponentFixture<AgentChatComponent> {
  TestBed.configureTestingModule({
    imports: [AgentChatComponent],
    providers: [
      { provide: AGENT_CHAT_TRANSPORT, useValue: transport },
      ...providers,
    ],
  });
  const fixture = TestBed.createComponent(AgentChatComponent);
  fixture.detectChanges();
  return fixture;
}

async function sendAndStream(
  fixture: ComponentFixture<AgentChatComponent>,
  transport: TransportStub,
  message = "hello",
  payload: Record<string, unknown> = { response: "the agent answer" },
): Promise<void> {
  await fixture.componentInstance.service.send(message);
  handlersOf(transport).onEvent(
    envelope(2, GraphExecutionEventType.NODE_OUTPUT, { payload }),
  );
  await fixture.detectChanges();
}

async function complete(
  fixture: ComponentFixture<AgentChatComponent>,
  transport: TransportStub,
  sequence = 9,
): Promise<void> {
  handlersOf(transport).onEvent(
    envelope(sequence, GraphExecutionEventType.WORKFLOW_COMPLETED),
  );
  await fixture.detectChanges();
}

function headerAction(
  element: HTMLElement,
  label: string,
): HTMLButtonElement {
  const action = Array.from(
    element.querySelectorAll<HTMLButtonElement>(".chat-header__action"),
  ).find((button) => button.textContent?.includes(label));
  expect(action).toBeDefined();
  return action!;
}

function typeInto(fixture: ComponentFixture<AgentChatComponent>, value: string): HTMLTextAreaElement {
  const textarea = (fixture.nativeElement as HTMLElement).querySelector(
    ".chat-composer__input",
  ) as HTMLTextAreaElement;
  textarea.value = value;
  textarea.dispatchEvent(new Event("input"));
  return textarea;
}

describe("AgentChatComponent", () => {
  let transport: TransportStub;
  let fixture: ComponentFixture<AgentChatComponent>;

  beforeEach(() => {
    transport = transportStub();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it("renders the empty transcript state before any message", () => {
    fixture = mount(transport);

    expect(element().querySelector(".chat-conversation__empty")).not.toBeNull();
    expect(element().querySelectorAll(".agent-chat__message")).toHaveLength(0);
    expect(element().querySelector(".agent-chat__typing")).toBeNull();
  });

  it("renders the projected chat-greeting in the empty conversation slot until a message exists", async () => {
    fixture = mount(transport);

    const empty = element().querySelector(
      ".chat-conversation__empty",
    ) as HTMLElement;
    expect(empty).not.toBeNull();
    const greeting = empty.querySelector(
      "ngx-decaf-chat-greeting",
    ) as HTMLElement;
    expect(greeting).not.toBeNull();
    expect(greeting.closest(".chat-conversation__empty")).toBe(empty);
    expect(greeting.querySelector(".chat-greeting")).not.toBeNull();

    await sendAndStream(fixture, transport, "hello");
    await complete(fixture, transport);

    expect(element().querySelector(".chat-conversation__empty")).toBeNull();
    expect(element().querySelector("ngx-decaf-chat-greeting")).toBeNull();
  });

  it("renders the configured header title fallback", () => {
    fixture = mount(transport);

    expect(element().querySelector(".chat-header__title")?.textContent?.trim()).toBe(
      "Agent chat",
    );
  });

  it("renders messages with role classes, actions, and attachment chips", async () => {
    fixture = mount(transport);
    await sendAndStream(fixture, transport, "hello", {
      response: "the agent answer",
      actions: ["queryRevenue", "sendMail"],
    });

    const messages = element().querySelectorAll(".agent-chat__message");
    expect(messages).toHaveLength(2);
    expect(messages[0].classList.contains("agent-chat__message--user")).toBe(true);
    expect(messages[0].querySelector(".chat-message__text")?.textContent?.trim()).toBe(
      "hello",
    );
    expect(messages[1].classList.contains("agent-chat__message--assistant")).toBe(true);
    expect(messages[1].querySelector(".chat-message__text")?.textContent?.trim()).toBe(
      "the agent answer",
    );

    const chips = messages[1].querySelectorAll(".chat-message__action-chip");
    expect(Array.from(chips).map((chip) => chip.textContent?.trim())).toEqual([
      "queryRevenue",
      "sendMail",
    ]);

    const [request] = transport.send.mock.calls[0] as unknown[];
    expect((request as { attachments: unknown[] }).attachments).toEqual([]);
  });

  it("renders user attachments as attachment chips in the transcript", async () => {
    fixture = mount(transport);
    await fixture.componentInstance.service.send("with a file", [
      { id: "attachment:1", name: "notes.txt", mime: "text/plain", size: 3 },
    ]);
    await fixture.detectChanges();

    const attachments = element().querySelectorAll(
      ".agent-chat__message--user .chat-message__attachment",
    );
    expect(attachments).toHaveLength(1);
    expect(attachments[0].textContent).toContain("notes.txt");
  });

  it("replaces the empty state once messages exist and shows the typing indicator while running", async () => {
    fixture = mount(transport);
    void fixture.componentInstance.service.send("hello");
    await fixture.detectChanges();

    expect(element().querySelector(".agent-chat__typing")).not.toBeNull();
    expect(element().querySelector(".agent-chat__empty")).toBeNull();

    await complete(fixture, transport, 3);

    expect(element().querySelector(".agent-chat__typing")).toBeNull();
  });

  it("renders the error banner when the service carries an error", async () => {
    transport.send.mockRejectedValue(new Error("backend exploded"));
    fixture = mount(transport);
    await fixture.componentInstance.service.send("hello");
    await fixture.detectChanges();

    const banner = element().querySelector(
      ".agent-chat__banner--error",
    ) as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner.getAttribute("role")).toBe("alert");
    expect(banner.textContent).toContain("backend exploded");
  });

  it("renders the backend-unavailable banner when the backend is marked unavailable without an error", async () => {
    fixture = mount(transport);
    fixture.componentInstance.service.backendAvailable.set(false);
    fixture.componentInstance.service.error.set(null);
    await fixture.detectChanges();

    const banner = element().querySelector(
      ".agent-chat__banner--error",
    ) as HTMLElement;
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain("not reachable");
  });

  it("gates the send button on a non-empty draft and the running state", async () => {
    fixture = mount(transport);
    const sendButton = element().querySelector(
      ".chat-composer__action--send",
    ) as HTMLButtonElement;
    expect(sendButton.disabled).toBe(true);

    typeInto(fixture, "typed message");
    await fixture.detectChanges();
    expect(
      (element().querySelector(".chat-composer__action--send") as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    void fixture.componentInstance.service.send("typed message");
    await fixture.detectChanges();
    expect(element().querySelector(".chat-composer__action--send")).toBeNull();
    expect(element().querySelector(".chat-composer__action--stop")).not.toBeNull();
    expect(
      (element().querySelector(".chat-composer__input") as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);

    await complete(fixture, transport, 3);

    expect(element().querySelector(".chat-composer__action--stop")).toBeNull();
    const restored = element().querySelector(
      ".chat-composer__action--send",
    ) as HTMLButtonElement;
    expect(restored.disabled).toBe(false);
    expect(
      (element().querySelector(".chat-composer__input") as HTMLTextAreaElement)
        .disabled,
    ).toBe(false);
  });

  it("sends on Enter, keeps the draft on Shift+Enter", async () => {
    fixture = mount(transport);
    const textarea = typeInto(fixture, "first line\nsecond");

    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }),
    );
    await flush();
    expect(transport.send).not.toHaveBeenCalled();
    expect(fixture.componentInstance.draft()).toBe("first line\nsecond");

    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await flush();
    await fixture.detectChanges();

    expect(transport.send).toHaveBeenCalledTimes(1);
    const [request] = transport.send.mock.calls[0] as unknown[];
    expect((request as { message: string }).message).toBe("first line\nsecond");
    expect(fixture.componentInstance.draft()).toBe("");
  });

  it("adds and removes attachments through the composed attachment input", async () => {
    fixture = mount(transport);
    const fileInput = element().querySelector(
      ".chat-attachment-input__file",
    ) as HTMLInputElement;
    const file = new File(["abc"], "notes.txt", { type: "text/plain" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      configurable: true,
    });
    fileInput.dispatchEvent(new Event("change"));
    await fixture.detectChanges();

    const chips = element().querySelectorAll(
      ".chat-attachment-preview__item",
    );
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain("notes.txt");
    expect(fileInput.value).toBe("");

    (chips[0].querySelector(
      ".chat-attachment-preview__remove",
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();
    expect(
      element().querySelectorAll(".chat-attachment-preview__item"),
    ).toHaveLength(0);
  });

  it("passes attachments and selected knowledge sources through the send request", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("knowledgeSources", [
      { id: "kb-1", label: "Employee handbook" },
      { id: "kb-2", label: "Price list" },
    ]);
    await fixture.detectChanges();

    headerAction(element(), "Knowledge base").dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await fixture.detectChanges();

    const checkboxes = element().querySelectorAll(
      ".chat-knowledge-base__entry input[type=checkbox]",
    );
    expect(checkboxes).toHaveLength(2);
    (checkboxes[0] as HTMLInputElement).click();
    (checkboxes[1] as HTMLInputElement).click();
    (checkboxes[1] as HTMLInputElement).click();
    await fixture.detectChanges();

    const fileInput = element().querySelector(
      ".chat-attachment-input__file",
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      value: [new File(["abc"], "notes.txt", { type: "text/plain" })],
      configurable: true,
    });
    fileInput.dispatchEvent(new Event("change"));

    typeInto(fixture, "with extras");

    const sendButton = element().querySelector(
      ".chat-composer__action--send",
    ) as HTMLButtonElement;
    sendButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    await fixture.detectChanges();

    expect(transport.send).toHaveBeenCalledTimes(1);
    const [request] = transport.send.mock.calls[0] as unknown[];
    expect(request).toMatchObject({
      message: "with extras",
      knowledgeSourceIds: ["kb-1"],
    });
    expect((request as { attachments: { name: string }[] }).attachments).toEqual([
      expect.objectContaining({ name: "notes.txt" }),
    ]);
  });

  it("toggles the telemetry panel with the header action", async () => {
    fixture = mount(transport);
    await sendAndStream(fixture, transport);

    expect(element().querySelector(".chat-telemetry__content")).toBeNull();

    const toggle = headerAction(element(), "Telemetry");
    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    const content = element().querySelector(
      ".chat-telemetry__content",
    ) as HTMLElement;
    expect(content).not.toBeNull();
    const rows = content.querySelectorAll(".chat-telemetry__row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain(RUN_ID);
    expect(rows[0].textContent).toContain("0/0");

    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();
    expect(element().querySelector(".chat-telemetry__content")).toBeNull();
  });

  it("wires the structured object panel to the composed structured-object view", async () => {
    fixture = mount(transport);
    await fixture.componentInstance.service.send("hello");
    handlersOf(transport).onEvent(
      envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
        payload: {
          response: "extracted",
          structuredOutput: { invoiceNumber: "INV-1", total: 2 },
        },
      }),
    );
    await fixture.detectChanges();

    const panel = element().querySelector(".agent-chat__structured") as HTMLElement;
    expect(panel).not.toBeNull();
    expect(panel.querySelector("ngx-decaf-chat-structured-object")).not.toBeNull();
    expect(element().querySelector("app-graph-io-viewer")).toBeNull();

    const rows = panel.querySelectorAll(".chat-structured-object__row");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const text = panel.textContent ?? "";
    expect(text).toContain("invoiceNumber");
    expect(text).toContain("INV-1");
    expect(text).toContain("total");
  });

  it("renders namespace chips from the workflow document auth metadata", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("workflow", {
      id: "wf-1",
      metadata: { auth: { namespaces: ["ns-alpha", "ns-beta"] } },
    } as unknown as GraphWorkflowDocument);
    await fixture.detectChanges();

    const chips = element().querySelectorAll(".chat-header__namespace-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent?.trim()).toBe("ns-alpha");
    expect(chips[1].textContent?.trim()).toBe("ns-beta");
  });

  it("renders no namespace chips when the workflow document carries no auth metadata", () => {
    fixture = mount(transport);

    expect(element().querySelector(".chat-header__namespaces")).toBeNull();
  });

  it("scrolls the transcript to the bottom when messages change", async () => {
    fixture = mount(transport);
    const transcript = element().querySelector(
      ".chat-conversation__transcript",
    ) as HTMLElement;
    let scrolledTo: number | null = null;
    Object.defineProperty(transcript, "scrollHeight", {
      get: () => 480,
      configurable: true,
    });
    Object.defineProperty(transcript, "scrollTop", {
      get: () => scrolledTo ?? 0,
      set: (value: number) => {
        scrolledTo = value;
      },
      configurable: true,
    });

    await sendAndStream(fixture, transport);

    expect(scrolledTo).toBe(480);
  });

  it("cancels the running roundtrip through the composed stop button", async () => {
    fixture = mount(transport);
    void fixture.componentInstance.service.send("hello");
    await fixture.detectChanges();

    await flush();
    await fixture.detectChanges();

    const stopButton = element().querySelector(
      ".chat-composer__action--stop",
    ) as HTMLButtonElement;
    expect(stopButton).not.toBeNull();
    stopButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(transport.cancel).toHaveBeenCalledWith(RUN_ID);
  });

  it("renders suggested prompts before the first exchange and sends one on click", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("suggestions", [
      "Show me the full roundtrip",
      "Where is my order?",
    ]);
    await fixture.detectChanges();

    const suggestions = element().querySelectorAll(
      ".chat-suggested-actions__item",
    );
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].textContent).toContain("full roundtrip");

    (suggestions[0] as HTMLButtonElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await flush();
    await flush();
    await fixture.detectChanges();

    expect(transport.send).toHaveBeenCalledTimes(1);
    const [request] = transport.send.mock.calls[0] as unknown[];
    expect((request as { message: string }).message).toBe(
      "Show me the full roundtrip",
    );
    expect(element().querySelector(".chat-suggested-actions")).toBeNull();
  });

  it("opens the slash-command popover and inserts the chosen command", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("slashCommands", [
      { name: "summarize", description: "Summarize the conversation" },
      { name: "extract", description: "Extract a structured object" },
    ]);
    await fixture.detectChanges();

    typeInto(fixture, "/");
    await fixture.detectChanges();

    const popover = element().querySelector(".chat-slash-commands");
    expect(popover).not.toBeNull();
    const commands = popover!.querySelectorAll(".chat-slash-commands__item");
    expect(commands).toHaveLength(2);

    (commands[0] as HTMLButtonElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe("/summarize ");
    expect(element().querySelector(".chat-slash-commands")).toBeNull();
  });

  it("selects a model through the composed model selector", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("models", [
      { id: "demo-fast", name: "Demo Fast", provider: "local" },
      { id: "demo-reasoning", name: "Demo Reasoning", provider: "local" },
    ]);
    await fixture.detectChanges();

    const selector = element().querySelector(
      ".chat-model-selector__trigger",
    ) as HTMLButtonElement;
    expect(selector).not.toBeNull();
    selector.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    const options = element().querySelectorAll(
      ".chat-model-selector__option",
    );
    expect(options).toHaveLength(2);
    (element().querySelector(
      '.chat-model-selector__option[data-model-id="demo-reasoning"]',
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    expect(fixture.componentInstance.selectedModel()).toMatchObject({
      id: "demo-reasoning",
    });
    expect(
      element().querySelector(".chat-model-selector__trigger")?.textContent,
    ).toContain("Demo Reasoning");
  });

  it("changes conversation visibility through the composed selector", async () => {
    fixture = mount(transport);

    expect(
      element().querySelector(".chat-visibility-selector"),
    ).not.toBeNull();
    (element().querySelector(
      ".chat-visibility-selector__trigger",
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    (element().querySelector(
      '.chat-visibility-selector__option[data-visibility="shared"]',
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    expect(fixture.componentInstance.currentVisibility()).toBe("shared");
    expect(
      element().querySelector(".chat-visibility-selector__value")?.textContent,
    ).toContain("Shared");
  });

  it("loads the history rail and resets the transcript when an entry is selected", async () => {
    const entries: AgentChatHistoryEntry[] = [
      {
        id: "history-1",
        title: "Weekly revenue review",
        messageCount: 4,
        visibility: "private",
      },
    ];
    const cancel = jest.fn().mockResolvedValue(undefined);
    fixture = mount(transport, [
      {
        provide: AGENT_CHAT_HISTORY_SOURCE,
        useValue: { list: () => of(entries), delete: cancel },
      },
    ]);
    await sendAndStream(fixture, transport);
    await complete(fixture, transport, 9);

    const item = element().querySelector(
      ".chat-history-item__main",
    ) as HTMLButtonElement;
    expect(item).not.toBeNull();
    expect(fixture.componentInstance.messages().length).toBeGreaterThan(0);

    const selected: AgentChatHistoryEntry[] = [];
    fixture.componentInstance.historySelected.subscribe((entry) =>
      selected.push(entry),
    );
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    expect(fixture.componentInstance.messages()).toEqual([]);
    expect(fixture.componentInstance.activeHistoryId()).toBe("history-1");
    expect(selected).toEqual([entries[0]]);

    (element().querySelector(".chat-history__new") as HTMLButtonElement)
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();
    expect(fixture.componentInstance.activeHistoryId()).toBeNull();
  });

  it("hides the history rail when showHistory is false", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("showHistory", false);
    await fixture.detectChanges();

    expect(element().querySelector(".agent-chat__history")).toBeNull();
  });

  it("edits a user message inline and re-sends the replacement text", async () => {
    fixture = mount(transport);
    await sendAndStream(fixture, transport);
    await complete(fixture, transport, 9);

    (element().querySelector(
      ".agent-chat__message--user [data-action='edit']",
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    const editor = element().querySelector(".chat-message-editor");
    expect(editor).not.toBeNull();
    const textarea = editor!.querySelector(
      ".chat-message-editor__input",
    ) as HTMLTextAreaElement;
    textarea.value = "edited message";
    textarea.dispatchEvent(new Event("input"));
    await fixture.detectChanges();

    (textarea.closest("form") as HTMLFormElement).dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await flush();
    await flush();
    await fixture.detectChanges();

    expect(transport.send).toHaveBeenCalledTimes(2);
    const [second] = transport.send.mock.calls[1] as unknown[];
    expect((second as { message: string }).message).toBe("edited message");
    expect(fixture.componentInstance.messages()).toHaveLength(1);
  });

  it("records votes and deletes messages through the composed action bar", async () => {
    fixture = mount(transport);
    await sendAndStream(fixture, transport);
    await complete(fixture, transport, 9);

    const assistant = element().querySelector(
      ".agent-chat__message--assistant",
    ) as HTMLElement;
    (assistant.querySelector(
      "[data-action='vote-up']",
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    expect(
      fixture.componentInstance
        .messages()
        .find((message) => message.role === "assistant")?.vote,
    ).toBe("up");

    (assistant.querySelector(
      "[data-action='delete']",
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    expect(
      fixture.componentInstance
        .messages()
        .some((message) => message.role === "assistant"),
    ).toBe(false);
  });
  it("composes the extracted chat header and wires its title, namespaces, and open state", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("headerTitleKey", "agent.chat.custom");
    fixture.componentRef.setInput("headerTitleFallback", "Demo header");
    fixture.componentRef.setInput("workflow", {
      id: "wf-1",
      metadata: { auth: { namespaces: ["ns-alpha", "ns-beta"] } },
    } as unknown as GraphWorkflowDocument);
    await fixture.detectChanges();

    const header = (): ChatHeaderComponent =>
      fixture.debugElement.query(By.directive(ChatHeaderComponent))
        .componentInstance as ChatHeaderComponent;

    expect(element().querySelector("ngx-decaf-chat-header")).not.toBeNull();
    expect(header().titleKey()).toBe("agent.chat.custom");
    expect(header().titleFallback()).toBe("Demo header");
    expect(header().namespaces()).toEqual(["ns-alpha", "ns-beta"]);
    expect(header().showHistory()).toBe(true);
    expect(header().showKnowledgeBase()).toBe(true);
    expect(header().historyOpen()).toBe(true);
    expect(header().knowledgeOpen()).toBe(false);
    expect(header().telemetryOpen()).toBe(false);
    expect(header().selectedKnowledgeCount()).toBe(0);
    expect(
      Array.from(
        element().querySelectorAll(".chat-header__namespace-chip"),
      ).map((chip) => chip.textContent?.trim()),
    ).toEqual(["ns-alpha", "ns-beta"]);

    fixture.componentRef.setInput("showHistory", false);
    fixture.componentRef.setInput("showKnowledgeBase", false);
    await fixture.detectChanges();

    expect(header().showHistory()).toBe(false);
    expect(header().showKnowledgeBase()).toBe(false);
    expect(
      Array.from(
        element().querySelectorAll<HTMLButtonElement>(".chat-header__action"),
      ).map((button) => button.textContent?.trim()),
    ).toEqual(["Telemetry"]);
  });

  it("drives history, knowledge, telemetry, and the knowledge badge from the extracted header actions", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("knowledgeSources", [
      { id: "kb-1", label: "Employee handbook" },
    ]);
    await fixture.detectChanges();

    const header = (): ChatHeaderComponent =>
      fixture.debugElement.query(By.directive(ChatHeaderComponent))
        .componentInstance as ChatHeaderComponent;

    expect(element().querySelector(".agent-chat__history")).not.toBeNull();
    headerAction(element(), "Chat history").dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await fixture.detectChanges();

    expect(header().historyOpen()).toBe(false);
    expect(element().querySelector(".agent-chat__history")).toBeNull();

    headerAction(element(), "Knowledge base").dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await fixture.detectChanges();

    expect(header().knowledgeOpen()).toBe(true);
    const checkbox = element().querySelector(
      ".chat-knowledge-base__entry input[type=checkbox]",
    ) as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    checkbox.click();
    await fixture.detectChanges();

    expect(header().selectedKnowledgeCount()).toBe(1);
    expect(
      element().querySelector(".chat-header__badge")?.textContent?.trim(),
    ).toBe("1");

    headerAction(element(), "Telemetry").dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await fixture.detectChanges();

    expect(header().telemetryOpen()).toBe(true);
    expect(element().querySelector(".chat-telemetry__content")).not.toBeNull();
  });

});
