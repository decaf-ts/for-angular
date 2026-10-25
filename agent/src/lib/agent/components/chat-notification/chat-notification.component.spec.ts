import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatNotification } from "../../types";
import { ChatNotificationComponent } from "./chat-notification.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatNotificationComponent> {
  const fixture = TestBed.createComponent(ChatNotificationComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatNotificationComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

const NOTIFICATIONS: AgentChatNotification[] = [
  {
    id: "rate-limit",
    severity: "warning",
    title: "Slow down",
    message: "Too many requests. Retry in a moment.",
    autoDismissMs: 0,
  },
  {
    id: "stream-error",
    severity: "error",
    message: "The stream ended unexpectedly.",
    autoDismissMs: 0,
    actionLabel: "Retry",
  },
];

describe("ChatNotificationComponent", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ChatNotificationComponent],
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  it("renders a polite live region with stacked notifications", () => {
    const fixture = mount({ notifications: NOTIFICATIONS });
    const region = element(fixture).querySelector(
      ".chat-notifications",
    ) as HTMLElement;

    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("false");
    expect(
      element(fixture).querySelectorAll(".chat-notification").length,
    ).toBe(2);
  });

  it("renders severity, title, message, and action affordances", () => {
    const fixture = mount({ notifications: NOTIFICATIONS });
    const items = element(fixture).querySelectorAll(".chat-notification");

    expect(items[0].getAttribute("data-severity")).toBe("warning");
    expect(
      items[0].querySelector(".chat-notification__title")?.textContent,
    ).toContain("Slow down");
    expect(items[1].getAttribute("data-severity")).toBe("error");
    expect(
      items[1].querySelector(".chat-notification__message")?.textContent,
    ).toContain("The stream ended unexpectedly.");
    expect(
      items[1].querySelector(".chat-notification__action")?.textContent,
    ).toContain("Retry");
  });

  it("emits the action id when the action button is clicked", () => {
    const fixture = mount({ notifications: NOTIFICATIONS });
    const actions: string[] = [];
    fixture.componentInstance.action.subscribe((id) => actions.push(id));

    (
      element(fixture).querySelector(
        ".chat-notification__action",
      ) as HTMLButtonElement
    ).click();

    expect(actions).toEqual(["stream-error"]);
  });

  it("dismisses on close and emits the id", () => {
    const fixture = mount({ notifications: NOTIFICATIONS });
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    (
      element(fixture).querySelector(
        ".chat-notification__close",
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(dismissed).toEqual(["rate-limit"]);
    expect(
      element(fixture).querySelectorAll(".chat-notification").length,
    ).toBe(1);
  });

  it("auto-dismisses after the per-notification delay", () => {
    const fixture = mount({
      notifications: [
        {
          id: "auto",
          severity: "info",
          message: "Auto dismiss me",
          autoDismissMs: 500,
        },
      ],
    });
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    jest.advanceTimersByTime(499);
    fixture.detectChanges();
    expect(dismissed).toEqual([]);

    jest.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(dismissed).toEqual(["auto"]);
    expect(
      element(fixture).querySelectorAll(".chat-notification").length,
    ).toBe(0);
  });

  it("falls back to the component auto-dismiss delay", () => {
    const fixture = mount({
      autoDismissMs: 300,
      notifications: [{ id: "fallback", message: "Using default" }],
    });
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    jest.advanceTimersByTime(300);
    fixture.detectChanges();

    expect(dismissed).toEqual(["fallback"]);
  });

  it("does not auto-dismiss when the delay is zero", () => {
    const fixture = mount({
      autoDismissMs: 0,
      notifications: [{ id: "sticky", message: "Stay" }],
    });
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    jest.advanceTimersByTime(10000);
    fixture.detectChanges();

    expect(dismissed).toEqual([]);
    expect(
      element(fixture).querySelectorAll(".chat-notification").length,
    ).toBe(1);
  });

  it("hides the close affordance when not dismissible", () => {
    const fixture = mount({
      dismissible: false,
      notifications: [{ id: "fixed", message: "No close" }],
    });

    expect(
      element(fixture).querySelector(".chat-notification__close"),
    ).toBeNull();
  });

  it("clears pending timers when a notification leaves the input", () => {
    const fixture = mount({
      notifications: [{ id: "gone", message: "Removed", autoDismissMs: 100 }],
    });
    fixture.componentRef.setInput("notifications", []);
    fixture.detectChanges();
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    jest.advanceTimersByTime(1000);

    expect(dismissed).toEqual([]);
  });
});
