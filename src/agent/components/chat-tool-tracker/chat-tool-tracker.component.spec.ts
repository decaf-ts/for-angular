import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatTrackerStatus } from "../../types";
import { ChatToolTrackerComponent } from "./chat-tool-tracker.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatToolTrackerComponent> {
  const fixture = TestBed.createComponent(ChatToolTrackerComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatToolTrackerComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function stepElements(
  fixture: ComponentFixture<ChatToolTrackerComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-tool-tracker__step"),
  ) as HTMLElement[];
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function progressValue(
  fixture: ComponentFixture<ChatToolTrackerComponent>,
): string | null {
  return element(fixture)
    .querySelector(".chat-tool-tracker__progress")
    ?.getAttribute("aria-valuenow") ?? null;
}

describe("ChatToolTrackerComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatToolTrackerComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders three nodes in box/gps/home order with two connectors", () => {
    const fixture = mount({ status: "ordered" });
    const steps = stepElements(fixture);

    expect(steps.map((step) => step.getAttribute("data-step"))).toEqual([
      "box",
      "gps",
      "home",
    ]);
    expect(
      element(fixture).querySelectorAll(".chat-tool-tracker__connector"),
    ).toHaveLength(2);
  });

  it("maps each status to its default progress percentage", () => {
    const cases: Array<[AgentChatTrackerStatus, string]> = [
      ["ordered", "34"],
      ["shipped", "71"],
      ["delivered", "100"],
      ["cancelled", "0"],
    ];
    const fixture = mount();

    for (const [status, expected] of cases) {
      fixture.componentRef.setInput("status", status);
      fixture.detectChanges();

      expect(progressValue(fixture)).toBe(expected);
      expect(
        (element(fixture).querySelector(
          ".chat-tool-tracker__progress-fill",
        ) as HTMLElement).style.width,
      ).toBe(`${expected}%`);
    }
  });

  it("lets an explicit progress override the status default and clamps it", () => {
    const fixture = mount({ status: "ordered", progress: 50 });
    expect(progressValue(fixture)).toBe("50");

    fixture.componentRef.setInput("progress", 150);
    fixture.detectChanges();
    expect(progressValue(fixture)).toBe("100");

    fixture.componentRef.setInput("progress", -20);
    fixture.detectChanges();
    expect(progressValue(fixture)).toBe("0");
  });

  it("derives complete, active and pending node states for ordered", () => {
    const fixture = mount({ status: "ordered" });

    expect(stepElements(fixture).map((step) => step.getAttribute("data-state"))).toEqual([
      "complete",
      "active",
      "pending",
    ]);
  });

  it("derives node states for shipped, delivered and cancelled", () => {
    const fixture = mount({ status: "shipped" });
    expect(stepElements(fixture).map((step) => step.getAttribute("data-state"))).toEqual([
      "complete",
      "complete",
      "active",
    ]);

    fixture.componentRef.setInput("status", "delivered");
    fixture.detectChanges();
    expect(stepElements(fixture).map((step) => step.getAttribute("data-state"))).toEqual([
      "complete",
      "complete",
      "complete",
    ]);

    fixture.componentRef.setInput("status", "cancelled");
    fixture.detectChanges();
    expect(stepElements(fixture).map((step) => step.getAttribute("data-state"))).toEqual([
      "cancelled",
      "cancelled",
      "cancelled",
    ]);
  });

  it("exposes data-status theming on the root", () => {
    const fixture = mount({ status: "delivered" });

    expect(
      element(fixture).querySelector(".chat-tool-tracker")?.getAttribute(
        "data-status",
      ),
    ).toBe("delivered");
  });

  it("renders the progressbar accessibility contract", () => {
    const fixture = mount({ status: "shipped" });
    const bar = element(fixture).querySelector(
      ".chat-tool-tracker__progress",
    ) as HTMLElement;

    expect(bar.getAttribute("role")).toBe("progressbar");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-valuenow")).toBe("71");
    expect(bar.getAttribute("aria-valuetext")).toBe("71%");
    expect(bar.getAttribute("aria-label")).toBe("Shipment progress");
  });

  it("resolves the progressbar label through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.tool.tracker.progress"] =
      "Progresso do envio";
    const fixture = mount({ status: "shipped" });
    const bar = element(fixture).querySelector(
      ".chat-tool-tracker__progress",
    ) as HTMLElement;

    expect(bar.getAttribute("aria-label")).toBe("Progresso do envio");
  });

  it("defaults the footer label to the percentage and status", () => {
    const fixture = mount({ status: "ordered" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-tracker__progress-label")
          ?.textContent,
      ),
    ).toBe("34% · Order confirmed");
  });

  it("renders the translated status in the footer when available", () => {
    translate.dictionary["agent.chat.tool.tracker.status.shipped"] =
      "A caminho";
    const fixture = mount({ status: "shipped" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-tracker__progress-label")
          ?.textContent,
      ),
    ).toBe("71% · A caminho");
  });

  it("lets the label input override the footer label", () => {
    const fixture = mount({
      status: "shipped",
      progress: 88,
      label: "88% · Arriving tomorrow",
    });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-tracker__progress-label")
          ?.textContent,
      ),
    ).toBe("88% · Arriving tomorrow");
    expect(
      element(fixture).querySelector(".chat-tool-tracker")?.getAttribute(
        "aria-label",
      ),
    ).toBe("88% · Arriving tomorrow");
  });

  it("renders the per-status description fallback", () => {
    const fixture = mount({ status: "shipped" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-tracker__description")
          ?.textContent,
      ),
    ).toBe(
      "The courier picked up your parcel and it is heading your way.",
    );
  });

  it("lets the description input override the per-status description", () => {
    const fixture = mount({ status: "shipped" });

    fixture.componentRef.setInput(
      "description",
      "The parcel reached the local distribution centre.",
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.description()).toBe(
      "The parcel reached the local distribution centre.",
    );
    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-tracker__description")
          ?.textContent,
      ),
    ).toBe("The parcel reached the local distribution centre.");
  });

  it("renders the cancelled description for a cancelled delivery", () => {
    const fixture = mount({ status: "cancelled" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-tracker__description")
          ?.textContent,
      ),
    ).toBe("This delivery was cancelled.");
  });
});
