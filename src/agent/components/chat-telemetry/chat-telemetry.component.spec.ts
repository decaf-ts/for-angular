import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatRoundtripTelemetry } from "../../types";
import { ChatTelemetryComponent } from "./chat-telemetry.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

const ROUNDTRIPS: AgentChatRoundtripTelemetry[] = [
  {
    runId: "run-001",
    status: "succeeded",
    startedAt: "2026-10-25T10:00:00.000Z",
    finishedAt: "2026-10-25T10:00:02.450Z",
    durationMs: 2450,
    nodeCount: 6,
    completedNodeCount: 6,
    functionId: "agent.chat.reply",
    traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    runtimeContext: { model: "gpt-5-mini" },
    promptTokens: 1240,
    completionTokens: 320,
    totalTokens: 1560,
  },
  {
    runId: "run-002",
    status: "failed",
    startedAt: "2026-10-25T10:01:00.000Z",
    finishedAt: "2026-10-25T10:01:00.840Z",
    nodeCount: 3,
    completedNodeCount: 1,
    error: {
      name: "ToolError",
      message: "The orders backend timed out after 30 seconds.",
    },
  },
  {
    runId: "run-003",
    status: "running",
    startedAt: "2026-10-25T10:02:00.000Z",
    nodeCount: 4,
    completedNodeCount: 2,
    replayed: true,
    promptTokens: 640,
  },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatTelemetryComponent> {
  const fixture = TestBed.createComponent(ChatTelemetryComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatTelemetryComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function trigger(
  fixture: ComponentFixture<ChatTelemetryComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".chat-telemetry__trigger",
  ) as HTMLButtonElement;
}

function rows(fixture: ComponentFixture<ChatTelemetryComponent>): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-telemetry__row"),
  ) as HTMLElement[];
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatTelemetryComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatTelemetryComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("is collapsed by default and wires aria-expanded/aria-controls", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS });

    expect(trigger(fixture).getAttribute("aria-expanded")).toBe("false");
    expect(trigger(fixture).getAttribute("aria-controls")).toBe(
      fixture.componentInstance.contentId,
    );
    expect(element(fixture).querySelector(".chat-telemetry__content")).toBeNull();
    expect(
      normalize(trigger(fixture).querySelector(".chat-telemetry__title")?.textContent),
    ).toBe("Run telemetry");
    expect(
      element(fixture).querySelector(".chat-telemetry__count")?.textContent?.trim(),
    ).toBe("3");
  });

  it("expands and collapses on trigger clicks, emitting toggle once per click", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS });
    const toggles: boolean[] = [];
    fixture.componentInstance.toggle.subscribe((value) => toggles.push(value));

    trigger(fixture).click();
    fixture.detectChanges();

    expect(toggles).toEqual([true]);
    expect(trigger(fixture).getAttribute("aria-expanded")).toBe("true");
    expect(
      element(fixture).querySelector(".chat-telemetry__content")?.getAttribute(
        "id",
      ),
    ).toBe(fixture.componentInstance.contentId);
    expect(rows(fixture)).toHaveLength(3);

    trigger(fixture).click();
    fixture.detectChanges();

    expect(toggles).toEqual([true, false]);
    expect(element(fixture).querySelector(".chat-telemetry__content")).toBeNull();
    expect(rows(fixture)).toHaveLength(0);
  });

  it("renders one row per run with run id, status and node counts", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS, open: true });
    const items = rows(fixture);

    expect(items).toHaveLength(3);
    expect(
      items[0].querySelector(".chat-telemetry__run")?.textContent?.trim(),
    ).toBe("run-001");
    expect(
      normalize(items[0].querySelector(".chat-telemetry__status")?.textContent),
    ).toBe("succeeded");
    expect(
      normalize(items[0].querySelector(".chat-telemetry__nodes")?.textContent),
    ).toBe("6/6");
    expect(
      items[0].getAttribute("data-status"),
    ).toBe("succeeded");
  });

  it("prefers durationMs and formats milliseconds versus seconds", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS, open: true });
    const items = rows(fixture);

    expect(
      normalize(items[0].querySelector(".chat-telemetry__duration")?.textContent),
    ).toBe("2.5 s");
    expect(
      normalize(items[1].querySelector(".chat-telemetry__duration")?.textContent),
    ).toBe("840 ms");
    expect(items[2].querySelector(".chat-telemetry__duration")).toBeNull();
  });

  it("resolves the duration unit through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.telemetry.secondsShort"] = "seg";
    const fixture = mount({ roundtrips: [ROUNDTRIPS[0]], open: true });

    expect(
      normalize(
        element(fixture).querySelector(".chat-telemetry__duration")
          ?.textContent,
      ),
    ).toBe("2.5 seg");
  });

  it("renders the replay chip only for replayed runs", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS, open: true });
    const items = rows(fixture);

    expect(
      normalize(items[2].querySelector(".chat-telemetry__replayed")?.textContent),
    ).toBe("Replayed");
    expect(items[2].getAttribute("data-replayed")).toBe("true");
    expect(items[0].querySelector(".chat-telemetry__replayed")).toBeNull();
    expect(items[0].getAttribute("data-replayed")).toBeNull();
  });

  it("renders a run error as an alert", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS, open: true });
    const alert = rows(fixture)[1].querySelector(
      ".chat-telemetry__error",
    ) as HTMLElement;

    expect(alert).not.toBeNull();
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.textContent?.trim()).toBe(
      "The orders backend timed out after 30 seconds.",
    );
  });

  it("renders generation metadata when present", () => {
    const fixture = mount({ roundtrips: [ROUNDTRIPS[0]], open: true });
    const row = rows(fixture)[0];
    const metadata = row.querySelector(
      ".chat-telemetry__metadata",
    ) as HTMLElement;

    expect(metadata).not.toBeNull();
    const entries = Array.from(
      metadata.querySelectorAll(".chat-telemetry__meta"),
    ).map((entry) => ({
      label: normalize(entry.querySelector("dt")?.textContent),
      value: normalize(entry.querySelector("dd")?.textContent),
    }));
    expect(entries).toEqual([
      { label: "Function", value: "agent.chat.reply" },
      { label: "Trace", value: "4bf92f3577b34da6a3ce929d0e0e4736" },
      { label: "Prompt tokens", value: "1240" },
      { label: "Completion tokens", value: "320" },
      { label: "Total tokens", value: "1560" },
    ]);
    expect(
      normalize(row.querySelector(".chat-telemetry__tokens")?.textContent),
    ).toBe("1560 tokens");
    expect(
      row.querySelector(".chat-telemetry__json")?.textContent,
    ).toContain('"model": "gpt-5-mini"');
  });

  it("omits metadata for a run without generation data", () => {
    const fixture = mount({
      roundtrips: [{ runId: "run-min", status: "queued" }],
      open: true,
    });
    const row = rows(fixture)[0];

    expect(row.querySelector(".chat-telemetry__metadata")).toBeNull();
    expect(row.querySelector(".chat-telemetry__context")).toBeNull();
    expect(row.querySelector(".chat-telemetry__tokens")).toBeNull();
  });

  it("renders the empty state when there are no roundtrips", () => {
    const fixture = mount({ roundtrips: [], open: true });

    expect(
      normalize(
        element(fixture).querySelector(".chat-telemetry__empty")?.textContent,
      ),
    ).toBe("No roundtrips yet.");
    expect(rows(fixture)).toHaveLength(0);
  });

  it("resolves the empty state through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.roundtrip.empty"] = "Sem roundtrips.";
    const fixture = mount({ roundtrips: [], open: true });

    expect(
      normalize(
        element(fixture).querySelector(".chat-telemetry__empty")?.textContent,
      ),
    ).toBe("Sem roundtrips.");
  });

  it("renders a custom title and uses it as the aria label", () => {
    const fixture = mount({ roundtrips: ROUNDTRIPS, title: "Refund run" });

    expect(
      normalize(trigger(fixture).querySelector(".chat-telemetry__title")?.textContent),
    ).toBe("Refund run");
    expect(
      element(fixture).querySelector(".chat-telemetry")?.getAttribute(
        "aria-label",
      ),
    ).toBe("Refund run");
  });

  it("resolves the status label through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.status.failed"] = "Falhou";
    const fixture = mount({ roundtrips: [ROUNDTRIPS[1]], open: true });

    expect(
      normalize(
        element(fixture).querySelector(".chat-telemetry__status")?.textContent,
      ),
    ).toBe("Falhou");
  });
});
