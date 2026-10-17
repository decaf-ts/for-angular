import { ComponentFixture, TestBed } from "@angular/core/testing";
import type { GraphWorkflowDocument } from "@decaf-ts/as-graph/shared";
import { GraphExecutionEventType } from "@decaf-ts/as-graph/shared";

import { AGENT_CHAT_TRANSPORT } from "../../tokens/agent-chat.tokens";
import { AgentChatService } from "../../services/AgentChatService";
import type { AgentChatTransport, AgentChatTransportHandlers } from "../../types";
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
): ComponentFixture<AgentChatComponent> {
  TestBed.configureTestingModule({
    imports: [AgentChatComponent],
    providers: [{ provide: AGENT_CHAT_TRANSPORT, useValue: transport }],
  });
  const fixture = TestBed.createComponent(AgentChatComponent);
  fixture.detectChanges();
  return fixture;
}

async function sendAndStream(
  fixture: ComponentFixture<AgentChatComponent>,
  transport: TransportStub,
  message = "hello",
): Promise<void> {
  await fixture.componentInstance.service.send(message);
  handlersOf(transport).onEvent(
    envelope(2, GraphExecutionEventType.NODE_OUTPUT, {
      payload: { response: "the agent answer" },
    }),
  );
  await fixture.detectChanges();
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

    expect(element().querySelector(".agent-chat__empty")).not.toBeNull();
    expect(element().querySelectorAll(".agent-chat__message")).toHaveLength(0);
  });

  it("renders the configured header title fallback", () => {
    fixture = mount(transport);

    expect(element().querySelector(".agent-chat__title")?.textContent?.trim()).toBe(
      "Agent chat",
    );
  });

  it("renders messages with role classes, actions, and attachment chips", async () => {
    fixture = mount(transport);
    await sendAndStream(fixture, transport);

    const messages = element().querySelectorAll(".agent-chat__message");
    expect(messages).toHaveLength(2);
    expect(messages[0].classList.contains("agent-chat__message--user")).toBe(true);
    expect(messages[0].querySelector(".agent-chat__message-content")?.textContent?.trim()).toBe(
      "hello",
    );
    expect(messages[1].classList.contains("agent-chat__message--assistant")).toBe(true);
    expect(messages[1].querySelector(".agent-chat__message-content")?.textContent?.trim()).toBe(
      "the agent answer",
    );

    const actions = transport.send.mock.calls[0][0] as { attachments: unknown[] };
    expect(actions.attachments).toEqual([]);
  });

  it("replaces the empty state once messages exist and shows the typing indicator while running", async () => {
    fixture = mount(transport);
    void fixture.componentInstance.service.send("hello");
    await fixture.detectChanges();

    expect(element().querySelector(".agent-chat__typing")).not.toBeNull();
    expect(element().querySelector(".agent-chat__empty")).toBeNull();

    handlersOf(transport).onEvent(
      envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED),
    );
    await fixture.detectChanges();

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
      ".agent-chat__composer-button--primary",
    ) as HTMLButtonElement;
    expect(sendButton.disabled).toBe(true);

    const textarea = element().querySelector(
      ".agent-chat__composer-input",
    ) as HTMLTextAreaElement;
    textarea.value = "typed message";
    textarea.dispatchEvent(new Event("input"));
    await fixture.detectChanges();
    expect(sendButton.disabled).toBe(false);

    void fixture.componentInstance.service.send("typed message");
    await fixture.detectChanges();
    expect(sendButton.disabled).toBe(true);
    expect((element().querySelector(".agent-chat__composer-input") as HTMLTextAreaElement).disabled).toBe(true);

    handlersOf(transport).onEvent(
      envelope(3, GraphExecutionEventType.WORKFLOW_COMPLETED),
    );
    await fixture.detectChanges();
    expect(sendButton.disabled).toBe(false);
    expect((element().querySelector(".agent-chat__composer-input") as HTMLTextAreaElement).disabled).toBe(false);
  });

  it("sends on Enter, keeps the draft on Shift+Enter", async () => {
    fixture = mount(transport);
    const textarea = element().querySelector(
      ".agent-chat__composer-input",
    ) as HTMLTextAreaElement;
    textarea.value = "first line\nsecond";
    textarea.dispatchEvent(new Event("input"));

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

  it("adds and removes attachments through the hidden file input", async () => {
    fixture = mount(transport);
    const fileInput = element().querySelector(
      ".agent-chat__file-input",
    ) as HTMLInputElement;
    const file = new File(["abc"], "notes.txt", { type: "text/plain" });
    Object.defineProperty(fileInput, "files", {
      value: [file],
      configurable: true,
    });
    fileInput.dispatchEvent(new Event("change"));
    await fixture.detectChanges();

    const chips = element().querySelectorAll(".agent-chat__composer-attachments .agent-chat__attachment-chip");
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain("notes.txt");
    expect((fileInput as HTMLInputElement & { value: string }).value).toBe("");

    (chips[0].querySelector(".agent-chat__chip-remove") as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();
    expect(
      element().querySelectorAll(".agent-chat__composer-attachments .agent-chat__attachment-chip"),
    ).toHaveLength(0);
  });

  it("passes attachments and selected knowledge sources through the send request", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("knowledgeSources", [
      { id: "kb-1", label: "Employee handbook" },
      { id: "kb-2", label: "Price list" },
    ]);
    await fixture.detectChanges();

    const checkboxes = element().querySelectorAll(
      ".agent-chat__knowledge-option input[type=checkbox]",
    );
    expect(checkboxes).toHaveLength(2);
    (checkboxes[0] as HTMLInputElement).click();
    (checkboxes[1] as HTMLInputElement).click();
    (checkboxes[1] as HTMLInputElement).click();
    await fixture.detectChanges();

    const fileInput = element().querySelector(
      ".agent-chat__file-input",
    ) as HTMLInputElement;
    Object.defineProperty(fileInput, "files", {
      value: [new File(["abc"], "notes.txt", { type: "text/plain" })],
      configurable: true,
    });
    fileInput.dispatchEvent(new Event("change"));

    const textarea = element().querySelector(
      ".agent-chat__composer-input",
    ) as HTMLTextAreaElement;
    textarea.value = "with extras";
    textarea.dispatchEvent(new Event("input"));

    const sendButton = element().querySelector(
      ".agent-chat__composer-button--primary",
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

    expect(element().querySelector(".agent-chat__telemetry")).toBeNull();

    const toggle = element().querySelector(
      ".agent-chat__header-action",
    ) as HTMLButtonElement;
    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    const telemetry = element().querySelector(".agent-chat__telemetry") as HTMLElement;
    expect(telemetry).not.toBeNull();
    const rows = telemetry.querySelectorAll(".agent-chat__telemetry-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain(RUN_ID);
    expect(rows[0].textContent).toContain("0/0");

    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();
    expect(element().querySelector(".agent-chat__telemetry")).toBeNull();
  });

  it("wires the structured object panel to the graph io viewer", async () => {
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
    expect(element().querySelector("app-graph-io-viewer")).toBeNull();

    (panel.querySelector(".agent-chat__header-action") as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await fixture.detectChanges();

    const viewer = element().querySelector("app-graph-io-viewer");
    expect(viewer).not.toBeNull();
  });

  it("renders namespace chips from the workflow document auth metadata", async () => {
    fixture = mount(transport);
    fixture.componentRef.setInput("workflow", {
      id: "wf-1",
      metadata: { auth: { namespaces: ["ns-alpha", "ns-beta"] } },
    } as unknown as GraphWorkflowDocument);
    await fixture.detectChanges();

    const chips = element().querySelectorAll(".agent-chat__namespace-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent?.trim()).toBe("ns-alpha");
    expect(chips[1].textContent?.trim()).toBe("ns-beta");
  });

  it("renders no namespace chips when the workflow document carries no auth metadata", () => {
    fixture = mount(transport);

    expect(element().querySelector(".agent-chat__namespaces")).toBeNull();
  });

  it("scrolls the transcript to the bottom when messages change", async () => {
    fixture = mount(transport);
    const transcript = element().querySelector(
      ".agent-chat__transcript",
    ) as HTMLElement;
    let scrolledTo: number | null = null;
    Object.defineProperty(transcript, "scrollTop", {
      get: () => scrolledTo ?? 0,
      set: (value: number) => {
        scrolledTo = value;
      },
      configurable: true,
    });

    await sendAndStream(fixture, transport);

    expect(scrolledTo).toBe(transcript.scrollHeight);
  });

  it("cancels the running roundtrip through the cancel button", async () => {
    fixture = mount(transport);
    void fixture.componentInstance.service.send("hello");
    await fixture.detectChanges();

    await flush();
    await fixture.detectChanges();

    const cancelButton = element().querySelector(
      ".agent-chat__composer-button--danger",
    ) as HTMLButtonElement;
    expect(cancelButton).not.toBeNull();
    cancelButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(transport.cancel).toHaveBeenCalledWith(RUN_ID);
  });
});
