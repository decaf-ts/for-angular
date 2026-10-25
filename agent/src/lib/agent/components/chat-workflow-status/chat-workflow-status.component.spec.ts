import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import type {
  AgentChatWorkflowStep,
  AgentChatWorkflowStepStatus,
} from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatWorkflowStatusComponent } from "./chat-workflow-status.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

const STEPS: AgentChatWorkflowStep[] = [
  {
    id: "step-fetch",
    name: "Fetch open orders",
    status: "success",
    output: { count: 12 },
  },
  {
    id: "step-approve",
    name: "Approve refunds",
    status: "suspended",
  },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatWorkflowStatusComponent> {
  const fixture = TestBed.createComponent(ChatWorkflowStatusComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatWorkflowStatusComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function steps(
  fixture: ComponentFixture<ChatWorkflowStatusComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll("[data-workflow-step]"),
  ) as HTMLElement[];
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatWorkflowStatusComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatWorkflowStatusComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("marks the root as a workflow and renders the count badge", () => {
    const fixture = mount({ steps: STEPS });

    expect(
      element(fixture).querySelector(".chat-workflow-status")?.getAttribute(
        "data-workflow",
      ),
    ).toBe("true");
    expect(
      element(fixture).querySelector(".chat-workflow-status__count")
        ?.textContent?.trim(),
    ).toBe("2");
  });

  it("renders one workflow row per step with its name", () => {
    const fixture = mount({ steps: STEPS });
    const rows = steps(fixture);

    expect(rows).toHaveLength(2);
    expect(
      rows[0].querySelector(".chat-workflow-status__name")?.textContent?.trim(),
    ).toBe("Fetch open orders");
    expect(
      rows[1].querySelector(".chat-workflow-status__name")?.textContent?.trim(),
    ).toBe("Approve refunds");
  });

  it("renders the status chip, tone and icon for every status", () => {
    const cases: Array<[AgentChatWorkflowStepStatus, string, string]> = [
      ["running", "Running", "loader"],
      ["success", "Succeeded", "check"],
      ["failed", "Failed", "x"],
      ["suspended", "Suspended", "info"],
      ["waiting", "Waiting", "loader"],
    ];
    const fixture = mount({
      steps: [{ id: "s", name: "Step", status: "running" }],
    });

    for (const [status, label, icon] of cases) {
      fixture.componentRef.setInput("steps", [
        { id: "s", name: "Step", status },
      ]);
      fixture.detectChanges();

      const row = steps(fixture)[0];
      expect(row.getAttribute("data-status")).toBe(status);
      expect(
        row.querySelector(".chat-workflow-status__chip")?.textContent?.trim(),
      ).toBe(label);
      expect(
        fixture.debugElement
          .queryAll(By.directive(ChatIconComponent))
          .map((entry) => entry.componentInstance.name()),
      ).toContain(icon);
    }
  });

  it("resolves the status chip through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.workflow.status.success"] = "Concluído";
    const fixture = mount({
      steps: [{ id: "s", name: "Step", status: "success" }],
    });

    expect(
      normalize(
        steps(fixture)[0].querySelector(".chat-workflow-status__chip")
          ?.textContent,
      ),
    ).toBe("Concluído");
  });

  it("renders a details JSON pane only when output is defined", () => {
    const fixture = mount({ steps: STEPS });

    const defined = steps(fixture)[0].querySelector(
      ".chat-workflow-status__output",
    ) as HTMLDetailsElement;
    expect(defined).not.toBeNull();
    expect(defined.tagName).toBe("DETAILS");
    expect(defined.querySelector("pre")?.textContent).toContain('"count": 12');
    expect(
      steps(fixture)[1].querySelector(".chat-workflow-status__output"),
    ).toBeNull();
  });

  it("renders an output pane for null but not for undefined", () => {
    const fixture = mount({
      steps: [
        { id: "a", name: "Null output", status: "success", output: null },
        { id: "b", name: "No output", status: "success", output: undefined },
      ],
    });

    expect(
      steps(fixture)[0].querySelector(".chat-workflow-status__output"),
    ).not.toBeNull();
    expect(
      steps(fixture)[1].querySelector(".chat-workflow-status__output"),
    ).toBeNull();
  });

  it("renders step errors as alerts", () => {
    const fixture = mount({
      steps: [
        {
          id: "s",
          name: "Classify delays",
          status: "failed",
          error: "The model returned malformed JSON.",
        },
      ],
    });
    const alert = steps(fixture)[0].querySelector(
      ".chat-workflow-status__error",
    ) as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent?.trim()).toBe(
      "The model returned malformed JSON.",
    );
  });

  it("renders the empty state when there are no steps", () => {
    const fixture = mount({ steps: [] });

    expect(
      element(fixture).querySelector(".chat-workflow-status__empty")
        ?.textContent?.trim(),
    ).toBe("No workflow steps yet.");
    expect(steps(fixture)).toHaveLength(0);
  });

  it("resolves the empty state through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.workflow.empty"] =
      "Nenhum passo de fluxo.";
    const fixture = mount({ steps: [] });

    expect(
      normalize(
        element(fixture).querySelector(".chat-workflow-status__empty")
          ?.textContent,
      ),
    ).toBe("Nenhum passo de fluxo.");
  });

  it("renders a custom title and uses it as the aria label", () => {
    const fixture = mount({ steps: STEPS, title: "Delayed order triage" });

    expect(
      element(fixture).querySelector(".chat-workflow-status__title")
        ?.tagName,
    ).toBe("H3");
    expect(
      element(fixture).querySelector(".chat-workflow-status__title")
        ?.textContent?.trim(),
    ).toBe("Delayed order triage");
    expect(
      element(fixture).querySelector(".chat-workflow-status")?.getAttribute(
        "aria-label",
      ),
    ).toBe("Delayed order triage");
  });
});
