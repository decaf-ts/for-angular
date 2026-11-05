/**
 * @module for-angular/app/pages/chat/chat.page.spec
 * @summary SAA-1518.1 `/chat` demo page contract.
 * @description Proves the demo hosts the composed chat against the
 * deterministic {@link AgentChatFakeTransport}, that the scenario toggle
 * reconfigures the transport and clears both the transcript and the demo
 * panels, that the transport's demo side channel fills every roundtrip panel,
 * and that approval decisions and notification dismissal update the page
 * state.
 */
import type { ComponentFixture } from "@angular/core/testing";
import { TestBed } from "@angular/core/testing";

import { ChatPage } from "./chat.page";

function mount(): ComponentFixture<ChatPage> {
  TestBed.configureTestingModule({ imports: [ChatPage] });
  const fixture = TestBed.createComponent(ChatPage);
  fixture.detectChanges();
  return fixture;
}

async function runConversation(
  fixture: ComponentFixture<ChatPage>,
): Promise<ChatPage> {
  const page = fixture.componentInstance;
  page.transport.configure({ speed: 500 });
  await page.chat()?.service.send("show me the full roundtrip");
  await jest.advanceTimersByTimeAsync(50);
  fixture.detectChanges();
  return page;
}

describe("ChatPage — fake transport demo surface (SAA-1518.1)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  it("mounts the composed chat against the fake transport with demo defaults", () => {
    const fixture = mount();
    const page = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector("ngx-decaf-agent-chat")).not.toBeNull();
    expect(page.transport.activeScenario).toBe("conversation");
    expect(page.scenario()).toBe("conversation");
    expect(page.chat()?.messages()).toEqual([]);
    expect(
      element.querySelectorAll(".chat-demo__scenario-button"),
    ).toHaveLength(2);
    expect(
      element.querySelectorAll(".chat-demo__scenario-button--active"),
    ).toHaveLength(1);
  });

  it("renders the demo shell without a duplicate main or header landmark", () => {
    const fixture = mount();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector("main")).toBeNull();
    expect(element.querySelector(".chat-demo")).not.toBeNull();
    const intro = element.querySelector(".chat-demo__intro") as HTMLElement;
    expect(intro.tagName).toBe("DIV");
    expect(intro.querySelector("header")).toBeNull();
  });

  it("switches the scripted scenario and resets the transcript and panels", async () => {
    const fixture = mount();
    const page = await runConversation(fixture);
    const element = fixture.nativeElement as HTMLElement;

    expect(page.chat()?.messages().length).toBeGreaterThan(0);
    expect(page.workflowSteps()).toHaveLength(3);
    expect(page.orders()).toHaveLength(3);
    expect(page.weather()?.location).toBe("Lisbon");

    const buttons = element.querySelectorAll<HTMLButtonElement>(
      ".chat-demo__scenario-button",
    );
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    buttons[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    fixture.detectChanges();

    expect(page.scenario()).toBe("structured-object");
    expect(page.transport.activeScenario).toBe("structured-object");
    expect(page.chat()?.messages()).toEqual([]);
    expect(page.workflowSteps()).toEqual([]);
    expect(page.progress()).toBeNull();
    expect(page.agentStep()).toBeNull();
    expect(page.nestedAgent()).toBeNull();
    expect(page.approvalStatus()).toBe("pending");
    expect(page.orders()).toEqual([]);
    expect(page.trackerStatus()).toBe("ordered");
    expect(page.trackerProgress()).toBe(0);
    expect(page.weather()).toBeNull();
    expect(page.notifications()).toEqual([]);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0].getAttribute("aria-pressed")).toBe("false");
  });

  it("streams the structured-object scenario after switching", async () => {
    const fixture = mount();
    const page = fixture.componentInstance;

    page.selectScenario("structured-object");
    fixture.detectChanges();
    page.transport.configure({ speed: 500 });
    await page.chat()?.service.send("extract invoice INV-2026-0142");
    await jest.advanceTimersByTimeAsync(50);
    fixture.detectChanges();

    expect(page.chat()?.messages().length).toBeGreaterThan(0);
    expect(page.chat()?.structuredObject()?.value).toMatchObject({
      invoiceNumber: "INV-2026-0142",
      vendor: "Northwind Supply",
      total: 1480,
    });
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        ".agent-chat__structured",
      ),
    ).not.toBeNull();
  });

  it("populates every demo panel from the transport side channel", async () => {
    const fixture = mount();
    const page = await runConversation(fixture);
    const element = fixture.nativeElement as HTMLElement;

    expect(page.workflowSteps()).toHaveLength(3);
    expect(page.workflowSteps().every((step) => step.status === "success")).toBe(
      true,
    );
    expect(page.progress()).toMatchObject({ id: "done", done: true, value: 100 });
    expect(page.agentStep()).toMatchObject({
      name: "Research agent",
      status: "success",
    });
    expect(page.nestedAgent()).toMatchObject({
      runId: "demo-nested-research",
      status: "success",
      streaming: false,
    });
    expect(page.approvalStatus()).toBe("pending");
    expect(page.approvalToolName()).toBe("sendSummary");
    expect(page.approvalPayload()).toMatchObject({
      to: "customer@example.com",
    });
    expect(page.orders()).toHaveLength(3);
    expect(page.trackerStatus()).toBe("shipped");
    expect(page.trackerProgress()).toBe(66);
    expect(page.weather()).toMatchObject({
      location: "Lisbon",
      condition: "Sunny",
      high: 24,
      low: 17,
    });
    expect(page.notifications().length).toBeGreaterThan(0);

    expect(
      element.querySelectorAll(".chat-workflow-status__step"),
    ).toHaveLength(3);
    expect(element.querySelector(".chat-progress")).not.toBeNull();
    expect(element.querySelector(".chat-progress__percent")?.textContent).toContain(
      "100",
    );
    expect(
      element.querySelectorAll(".chat-tool-orders, ngx-decaf-chat-tool-orders")
        .length,
    ).toBeGreaterThan(0);
    expect(element.querySelector("ngx-decaf-chat-tool-tracker")).not.toBeNull();
    expect(element.querySelector("ngx-decaf-chat-weather")).not.toBeNull();
    expect(element.querySelector("ngx-decaf-chat-agent-step")).not.toBeNull();
    expect(element.querySelector("ngx-decaf-chat-nested-agent")).not.toBeNull();
    expect(element.querySelector("ngx-decaf-chat-approval")).not.toBeNull();
  });

  it("marks the approval approved through the demo approval panel", async () => {
    const fixture = mount();
    const page = await runConversation(fixture);
    const element = fixture.nativeElement as HTMLElement;

    const approve = element.querySelector(
      ".chat-approval__button--approve",
    ) as HTMLButtonElement;
    expect(approve).not.toBeNull();
    approve.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    fixture.detectChanges();

    expect(page.approvalStatus()).toBe("approved");
    expect(
      element.querySelector(".chat-approval")?.getAttribute("data-status"),
    ).toBe("approved");
    expect(
      page.notifications().some((notification) =>
        notification.message.includes("Approval recorded locally"),
      ),
    ).toBe(true);
  });

  it("marks the approval rejected through the demo approval panel", async () => {
    const fixture = mount();
    const page = await runConversation(fixture);
    const element = fixture.nativeElement as HTMLElement;

    const reject = element.querySelector(
      ".chat-approval__button--reject",
    ) as HTMLButtonElement;
    expect(reject).not.toBeNull();
    reject.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    fixture.detectChanges();

    expect(page.approvalStatus()).toBe("rejected");
    expect(
      element.querySelector(".chat-approval")?.getAttribute("data-status"),
    ).toBe("rejected");
    expect(
      page.notifications().some((notification) =>
        notification.message.includes("Rejection recorded locally"),
      ),
    ).toBe(true);
  });

  it("dismisses a notification from the toast stack", async () => {
    const fixture = mount();
    const page = await runConversation(fixture);
    const element = fixture.nativeElement as HTMLElement;

    const toasts = element.querySelectorAll(".chat-notification");
    expect(toasts.length).toBeGreaterThan(0);
    const before = page.notifications().length;

    (toasts[0].querySelector(
      ".chat-notification__close",
    ) as HTMLButtonElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    fixture.detectChanges();

    expect(page.notifications().length).toBe(before - 1);
  });

  it("keeps the fake transport free of backend calls while streaming the demo", async () => {
    const fetchSpy = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      const fixture = mount();
      const page = await runConversation(fixture);

      expect(page.chat()?.messages().length).toBeGreaterThan(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("ignores a scenario reselect for the active scenario", async () => {
    const fixture = mount();
    const page = fixture.componentInstance;

    await page.chat()?.service.send("hello");
    await jest.advanceTimersByTimeAsync(50);
    fixture.detectChanges();
    const messages = page.chat()?.messages().length;

    page.selectScenario("conversation");
    fixture.detectChanges();

    expect(page.chat()?.messages().length).toBe(messages);
    expect(page.transport.activeScenario).toBe("conversation");
  });

});
