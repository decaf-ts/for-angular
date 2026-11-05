import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatNestedAgentToolError } from "../../types";
import { ChatNestedAgentComponent } from "./chat-nested-agent.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

const TOOL_ERRORS: AgentChatNestedAgentToolError[] = [
  {
    id: "error-1",
    toolName: "refundOrders",
    message: "The payments service rejected the refund request.",
  },
  {
    id: "error-2",
    toolName: "notifyCustomer",
    message: "The notification queue is unavailable.",
  },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatNestedAgentComponent> {
  const fixture = TestBed.createComponent(ChatNestedAgentComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatNestedAgentComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function root(fixture: ComponentFixture<ChatNestedAgentComponent>): HTMLElement {
  return element(fixture).querySelector(".chat-nested-agent") as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatNestedAgentComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatNestedAgentComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("marks the root as a nested tool agent step", () => {
    const fixture = mount({ name: "Refund sub-agent" });

    expect(root(fixture).getAttribute("data-tool-agent")).toBe("true");
    expect(root(fixture).getAttribute("data-tool-agent-step")).toBe("true");
    expect(root(fixture).getAttribute("role")).toBe("group");
  });

  it("renders the name, run id and status chip", () => {
    const fixture = mount({
      name: "Refund sub-agent",
      runId: "run-nested-42",
      status: "success",
    });

    expect(
      element(fixture).querySelector(".chat-nested-agent__name")
        ?.textContent?.trim(),
    ).toBe("Refund sub-agent");
    expect(
      element(fixture).querySelector(".chat-nested-agent__run")
        ?.textContent?.trim(),
    ).toBe("run-nested-42");
    expect(
      element(fixture).querySelector(".chat-nested-agent__chip")
        ?.textContent?.trim(),
    ).toBe("Succeeded");
  });

  it("falls back to the nested agent title and omits a missing run id", () => {
    const fixture = mount({ name: "" });

    expect(
      element(fixture).querySelector(".chat-nested-agent__name")
        ?.textContent?.trim(),
    ).toBe("Nested agent");
    expect(element(fixture).querySelector(".chat-nested-agent__run")).toBeNull();
  });

  it("joins the ancestry with a chevron and exposes it as a title", () => {
    const fixture = mount({ ancestry: ["supervisor", "refunds"] });
    const ancestry = element(fixture).querySelector(
      ".chat-nested-agent__ancestry",
    ) as HTMLElement;

    expect(ancestry).not.toBeNull();
    expect(ancestry.textContent?.trim()).toBe("supervisor › refunds");
    expect(ancestry.getAttribute("title")).toBe("supervisor › refunds");
  });

  it("renders no ancestry when the list is empty", () => {
    const fixture = mount({ ancestry: [] });

    expect(
      element(fixture).querySelector(".chat-nested-agent__ancestry"),
    ).toBeNull();
  });

  it("indents by depth * 16px and caps at eight levels", () => {
    const fixture = mount({ depth: 2 });
    expect(root(fixture).style.paddingLeft).toBe("32px");

    fixture.componentRef.setInput("depth", 12);
    fixture.detectChanges();
    expect(root(fixture).style.paddingLeft).toBe("128px");

    fixture.componentRef.setInput("depth", -3);
    fixture.detectChanges();
    expect(root(fixture).style.paddingLeft).toBe("0px");
  });

  it("keeps the group aria-label without an aria-level", () => {
    const fixture = mount({ depth: 3 });

    expect(root(fixture).getAttribute("role")).toBe("group");
    expect(root(fixture).getAttribute("aria-label")).toBe("Nested agent");
    expect(root(fixture).hasAttribute("aria-level")).toBe(false);
  });

  it("renders text and the streaming caret only while streaming", () => {
    const fixture = mount({ text: "Working on it", streaming: false });
    const text = element(fixture).querySelector(
      ".chat-nested-agent__text",
    ) as HTMLElement;

    expect(normalize(text.textContent)).toBe("Working on it");
    expect(text.classList).not.toContain("chat-nested-agent__text--streaming");
    expect(
      element(fixture).querySelector(".chat-nested-agent__caret"),
    ).toBeNull();

    fixture.componentRef.setInput("streaming", true);
    fixture.detectChanges();

    expect(
      element(fixture).querySelector(".chat-nested-agent__caret"),
    ).not.toBeNull();
    expect(text.classList).toContain("chat-nested-agent__text--streaming");
  });

  it("renders no text block when the text is empty", () => {
    const fixture = mount({ text: "", streaming: true });

    expect(element(fixture).querySelector(".chat-nested-agent__text")).toBeNull();
    expect(
      element(fixture).querySelector(".chat-nested-agent__caret"),
    ).toBeNull();
  });

  it("renders one alert per tool error with the tool name and message", () => {
    const fixture = mount({ toolErrors: TOOL_ERRORS });
    const alerts = element(fixture).querySelectorAll(
      ".chat-nested-agent__error",
    ) as NodeListOf<HTMLElement>;

    expect(alerts).toHaveLength(2);
    alerts.forEach((alert) => {
      expect(alert.getAttribute("role")).toBe("alert");
    });
    expect(
      alerts[0].querySelector(".chat-nested-agent__error-tool")?.textContent?.trim(),
    ).toBe("refundOrders");
    expect(
      alerts[0].querySelector(".chat-nested-agent__error-message")
        ?.textContent?.trim(),
    ).toBe("The payments service rejected the refund request.");
    expect(
      alerts[1].querySelector(".chat-nested-agent__error-tool")?.textContent?.trim(),
    ).toBe("notifyCustomer");
  });

  it("renders no error list when there are no tool errors", () => {
    const fixture = mount({ toolErrors: [] });

    expect(
      element(fixture).querySelector(".chat-nested-agent__errors"),
    ).toBeNull();
  });

  it("resolves the status chip through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.workflow.status.running"] = "Em execução";
    const fixture = mount({ status: "running" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-nested-agent__chip")?.textContent,
      ),
    ).toBe("Em execução");
  });
});
