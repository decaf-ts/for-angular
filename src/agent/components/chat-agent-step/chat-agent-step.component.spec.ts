import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatAgentStepStatus } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatAgentStepComponent } from "./chat-agent-step.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatAgentStepComponent> {
  const fixture = TestBed.createComponent(ChatAgentStepComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatAgentStepComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function root(fixture: ComponentFixture<ChatAgentStepComponent>): HTMLElement {
  return element(fixture).querySelector(".chat-agent-step") as HTMLElement;
}

function iconNames(fixture: ComponentFixture<ChatAgentStepComponent>): string[] {
  return fixture.debugElement
    .queryAll(By.directive(ChatIconComponent))
    .map((entry) => entry.componentInstance.name());
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatAgentStepComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatAgentStepComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("marks the root as a network step and renders the name and agent id", () => {
    const fixture = mount({ name: "Research agent", agentId: "agent-research" });

    expect(root(fixture).getAttribute("data-network")).toBe("true");
    expect(
      element(fixture).querySelector(".chat-agent-step__name")?.textContent?.trim(),
    ).toBe("Research agent");
    expect(
      element(fixture).querySelector(".chat-agent-step__id")?.textContent?.trim(),
    ).toBe("agent-research");
  });

  it("omits the agent id when it is not provided", () => {
    const fixture = mount({ name: "Research agent" });

    expect(element(fixture).querySelector(".chat-agent-step__id")).toBeNull();
  });

  it("renders chip, icon and busy state for every status", () => {
    const cases: Array<[AgentChatAgentStepStatus, string, string]> = [
      ["running", "Running", "loader"],
      ["success", "Succeeded", "check"],
      ["failed", "Failed", "x"],
      ["suspended", "Suspended", "info"],
      ["waiting", "Waiting", "loader"],
    ];
    const fixture = mount({ name: "Step" });

    for (const [status, label, icon] of cases) {
      fixture.componentRef.setInput("status", status);
      fixture.detectChanges();

      expect(root(fixture).getAttribute("data-status")).toBe(status);
      expect(
        element(fixture).querySelector(".chat-agent-step__chip")
          ?.textContent?.trim(),
      ).toBe(label);
      expect(iconNames(fixture)[0]).toBe(icon);

      const busyIcon = element(fixture).querySelector(
        ".chat-agent-step__icon",
      ) as HTMLElement;
      expect(busyIcon.classList.contains("chat-agent-step__icon--busy")).toBe(
        status === "running" || status === "waiting",
      );
    }
  });

  it("sets data-status=failed for failed steps", () => {
    const fixture = mount({ name: "Step", status: "failed" });

    expect(root(fixture).getAttribute("data-status")).toBe("failed");
  });

  it("resolves the status chip through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.workflow.status.failed"] = "Falhou";
    const fixture = mount({ name: "Step", status: "failed" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-agent-step__chip")?.textContent,
      ),
    ).toBe("Falhou");
  });

  it("renders input and output details only when defined", () => {
    const fixture = mount({
      name: "Step",
      stepInput: { question: "Which orders are delayed?" },
      stepOutput: { answer: "Three orders." },
    });
    const panes = element(fixture).querySelectorAll(
      ".chat-agent-step__pane",
    ) as NodeListOf<HTMLDetailsElement>;

    expect(panes).toHaveLength(2);
    expect(panes[0].tagName).toBe("DETAILS");
    expect(normalize(panes[0].querySelector("summary")?.textContent)).toBe(
      "Input",
    );
    expect(panes[0].querySelector("pre")?.textContent).toContain(
      '"question": "Which orders are delayed?"',
    );
    expect(normalize(panes[1].querySelector("summary")?.textContent)).toBe(
      "Output",
    );
    expect(panes[1].querySelector("pre")?.textContent).toContain(
      '"answer": "Three orders."',
    );
  });

  it("omits panes whose values are undefined", () => {
    const fixture = mount({ name: "Step", stepInput: { a: 1 } });

    expect(
      element(fixture).querySelectorAll(".chat-agent-step__pane"),
    ).toHaveLength(1);
    expect(
      normalize(
        element(fixture).querySelector(".chat-agent-step__pane summary")
          ?.textContent,
      ),
    ).toBe("Input");
  });

  it("renders an error as an alert", () => {
    const fixture = mount({
      name: "Step",
      status: "failed",
      error: "The research agent could not reach the orders service.",
    });
    const alert = element(fixture).querySelector(
      ".chat-agent-step__error",
    ) as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent?.trim()).toBe(
      "The research agent could not reach the orders service.",
    );
  });

  it("exposes a descriptive aria label with the step name", () => {
    const fixture = mount({ name: "Research agent" });

    expect(root(fixture).getAttribute("aria-label")).toBe(
      "Agent step — Research agent",
    );
  });
});
