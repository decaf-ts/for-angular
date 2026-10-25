import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { GraphIoViewerComponent } from "@decaf-ts/for-angular/diagrams";

import type { AgentChatStructuredObjectEntry } from "../../types";
import {
  ChatStructuredObjectComponent,
  flattenAgentChatStructuredObject,
  summarizeAgentChatStructuredValue,
} from "./chat-structured-object.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatStructuredObjectComponent> {
  const fixture = TestBed.createComponent(ChatStructuredObjectComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatStructuredObjectComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("flattenAgentChatStructuredObject", () => {
  it("returns no rows for nullish values", () => {
    expect(flattenAgentChatStructuredObject(null)).toEqual([]);
    expect(flattenAgentChatStructuredObject(undefined)).toEqual([]);
  });

  it("flattens nested objects and arrays with stable paths", () => {
    const rows = flattenAgentChatStructuredObject({
      expense: { vendor: "Acme", total: 42.5 },
      tags: ["travel", "q3"],
      paid: false,
    });

    expect(rows.map((row) => row.path)).toEqual([
      "$",
      "$.expense",
      "$.expense.vendor",
      "$.expense.total",
      "$.tags",
      "$.tags[0]",
      "$.tags[1]",
      "$.paid",
    ]);
    expect(rows.find((row) => row.path === "$.expense.vendor")?.display).toBe(
      "Acme",
    );
    expect(rows.find((row) => row.path === "$.tags")?.display).toBe("[2]");
    expect(rows.find((row) => row.path === "$.paid")?.display).toBe("false");
  });

  it("renders empty containers explicitly", () => {
    const rows = flattenAgentChatStructuredObject({ empty: {}, list: [] });

    expect(rows.find((row) => row.path === "$.empty")?.display).toBe("{}");
    expect(rows.find((row) => row.path === "$.list")?.display).toBe("[]");
  });

  it("summarizes long values with an ellipsis", () => {
    const text = summarizeAgentChatStructuredValue({ a: "x".repeat(400) }, 20);

    expect(text.length).toBe(21);
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("ChatStructuredObjectComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatStructuredObjectComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the info empty state when no value is available", () => {
    const fixture = mount();
    const section = element(fixture).querySelector(
      ".chat-structured-object",
    ) as HTMLElement;

    expect(section.getAttribute("aria-label")).toBe("Structured object");
    expect(section.getAttribute("aria-busy")).toBeNull();
    expect(
      element(fixture).querySelector(".chat-structured-object__empty-title")
        ?.textContent,
    ).toContain("No structured data yet");
    expect(
      element(fixture).querySelector(".chat-structured-object__rows"),
    ).toBeNull();
  });

  it("renders a compact empty line when the info variant is disabled", () => {
    const fixture = mount({ emptyVariant: false });

    expect(
      element(fixture).querySelector(".chat-structured-object__empty"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-structured-object__empty-line")
        ?.textContent,
    ).toContain("No structured data");
  });

  it("renders the streamed fields as a reduced-opacity ghost preview", () => {
    const fixture = mount({
      value: { expense: { vendor: "Acme" }, total: undefined },
      streaming: true,
    });
    const rows = element(fixture).querySelector(
      ".chat-structured-object__rows",
    ) as HTMLElement;

    expect(rows.classList.contains("chat-structured-object__rows--ghost")).toBe(
      true,
    );
    expect(
      element(fixture).querySelector(".chat-structured-object")
        ?.getAttribute("aria-busy"),
    ).toBe("true");
    expect(
      element(fixture)
        .querySelectorAll(".chat-structured-object__row")
        .length,
    ).toBeGreaterThan(0);
    expect(
      element(fixture).querySelector(".chat-structured-object__waiting")
        ?.textContent,
    ).toContain("Waiting for the next field");
  });

  it("commits the streamed object and prepends it to the history on finish", () => {
    const fixture = mount({
      value: { total: undefined },
      runId: "run-1",
      streaming: true,
    });
    const committed: AgentChatStructuredObjectEntry[] = [];
    fixture.componentInstance.committed.subscribe((entry) =>
      committed.push(entry),
    );

    fixture.componentRef.setInput("value", { total: 99 });
    fixture.componentRef.setInput("streaming", false);
    fixture.detectChanges();

    expect(committed).toHaveLength(1);
    expect(committed[0].runId).toBe("run-1");
    expect(committed[0].value).toEqual({ total: 99 });
    expect(fixture.componentInstance.committedEntries()).toHaveLength(1);
    expect(
      element(fixture).querySelectorAll(".chat-structured-object__history-item")
        .length,
    ).toBe(1);
    expect(
      element(fixture).querySelector(".chat-structured-object__rows--ghost"),
    ).toBeNull();
  });

  it("does not commit on the initial render even when a completed value is set", () => {
    const fixture = mount({ value: { total: 1 }, streaming: false, runId: "r" });

    expect(fixture.componentInstance.committedEntries()).toEqual([]);
  });

  it("renders the supplied history and emits the selected entry", () => {
    const history: AgentChatStructuredObjectEntry[] = [
      { runId: "run-a", value: { total: 1 }, committedAt: "2026-01-01" },
      { runId: "run-b", value: { total: 2 } },
    ];
    const fixture = mount({ value: { total: 3 }, history });
    const selected: AgentChatStructuredObjectEntry[] = [];
    fixture.componentInstance.historySelected.subscribe((entry) =>
      selected.push(entry),
    );

    expect(
      element(fixture).querySelectorAll(".chat-structured-object__history-item")
        .length,
    ).toBe(2);

    (
      element(fixture).querySelector(
        ".chat-structured-object__history-button",
      ) as HTMLButtonElement
    ).click();

    expect(selected).toEqual([history[0]]);
  });

  it("hides the history section when disabled", () => {
    const fixture = mount({
      value: { total: 1 },
      history: [{ runId: "run-a", value: {} }],
      showHistory: false,
    });

    expect(
      element(fixture).querySelector(".chat-structured-object__history"),
    ).toBeNull();
  });

  it("reuses the graph I/O viewer in raw mode", () => {
    const fixture = mount({
      value: { total: 7, nested: { ok: true } },
      rawMode: true,
    });
    const viewer = fixture.debugElement.query(
      By.directive(GraphIoViewerComponent),
    );

    expect(viewer).not.toBeNull();
    expect(viewer.componentInstance.value()).toEqual({
      total: 7,
      nested: { ok: true },
    });
    expect(
      element(fixture).querySelector(".chat-structured-object__rows"),
    ).toBeNull();
  });

  it("honours a custom title override", () => {
    const fixture = mount({ title: "Expense draft", value: { total: 1 } });

    expect(
      element(fixture).querySelector(".chat-structured-object__title")
        ?.textContent,
    ).toContain("Expense draft");
  });
});
