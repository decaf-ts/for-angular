import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { GenuiActionService } from "../../genui-action.service";
import { DEFAULT_GENUI_CONFIG, GENUI_CONFIG, provideGenui } from "../../genui.config";
import { GENUI_LIMITS } from "../../limits";
import { collectSecretIds, type GenuiRenderContext } from "../../render-context";
import type { GenuiNode, GenuiSpec } from "../../types";
import { GenuiBlockComponent } from "./genui-block.component";

const CONTEXT: GenuiRenderContext = {
  sessionId: "session-1",
  blockId: "block-1",
  specId: "spec-1",
};

let httpMock: HttpTestingController | undefined;

function mount(
  spec: GenuiSpec,
  context: GenuiRenderContext = CONTEXT,
  persist = false,
): ComponentFixture<GenuiBlockComponent> {
  const fixture = TestBed.createComponent(GenuiBlockComponent);
  fixture.componentRef.setInput("spec", spec);
  fixture.componentRef.setInput("context", context);
  fixture.componentRef.setInput("persist", persist);
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function el(fixture: ComponentFixture<GenuiBlockComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function text(fixture: ComponentFixture<GenuiBlockComponent>, selector: string): string {
  return el(fixture).querySelector(selector)?.textContent?.trim() ?? "";
}

function useRelay(): void {
  TestBed.overrideProvider(GENUI_CONFIG, {
    useValue: { ...DEFAULT_GENUI_CONFIG, autoRelay: true },
  });
}

function nestedRows(depth: number): GenuiNode {
  let node: GenuiNode = { type: "text", content: "deep-leaf" };
  for (let index = 0; index < depth; index += 1) {
    node = { type: "row", items: [node] };
  }
  return node;
}

const RENDER_SPEC: GenuiSpec = {
  items: [
    { type: "text", size: "h2", content: "Hello GenUI" },
    { type: "callout", tone: "warning", title: "Careful", content: "Check the totals." },
    {
      type: "card",
      title: "Card title",
      eyebrow: "Eyebrow",
      items: [{ type: "text", content: "Card body" }],
    },
    {
      type: "row",
      items: [
        { type: "text", content: "Left" },
        { type: "text", content: "Right" },
      ],
    },
    {
      type: "grid",
      cols: 2,
      items: [
        { type: "text", content: "G1" },
        { type: "text", content: "G2" },
      ],
    },
    {
      type: "table",
      columns: ["Name", "Total"],
      rows: [
        ["A", "10"],
        ["B", "20"],
      ],
    },
    {
      type: "tabs",
      tabs: [
        { label: "One", items: [{ type: "text", content: "Tab one" }] },
        { label: "Two", items: [{ type: "text", content: "Tab two" }] },
      ],
    },
    {
      type: "steps",
      current: 1,
      steps: [{ title: "Start" }, { title: "Middle" }, { title: "End" }],
    },
    { type: "keyvalue", pairs: [{ key: "Owner", value: "Ada" }] },
    { type: "timeline", items: [{ time: "09:00", title: "Kickoff", desc: "Start" }] },
    {
      type: "quiz",
      question: "2+2?",
      options: [{ label: "3" }, { label: "4", correct: true }],
      explanation: "Four.",
    },
  ],
};

describe("GenuiBlockComponent", () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [GenuiBlockComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideGenui({ autoRelay: false })],
    });
  });

  afterEach(() => {
    httpMock?.verify();
    httpMock = undefined;
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it("renders the text, card, row, grid, callout, table, tabs, steps, keyvalue, timeline and quiz nodes", () => {
    const fixture = mount(RENDER_SPEC);

    expect(text(fixture, ".genui-text")).toBe("Hello GenUI");

    expect(el(fixture).querySelector(".genui-callout")?.getAttribute("data-tone")).toBe("warning");
    expect(text(fixture, ".genui-callout__title")).toBe("Careful");
    expect(text(fixture, ".genui-callout__body")).toBe("Check the totals.");

    expect(text(fixture, ".genui-card__title")).toBe("Card title");
    expect(text(fixture, ".genui-card__eyebrow")).toBe("Eyebrow");
    expect(text(fixture, ".genui-card__body .genui-text")).toBe("Card body");

    const rowTexts = Array.from(el(fixture).querySelectorAll(".genui-row .genui-text")).map((node) =>
      node.textContent?.trim(),
    );
    expect(rowTexts).toEqual(["Left", "Right"]);

    const grid = el(fixture).querySelector(".genui-grid") as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.style.gridTemplateColumns).toContain("repeat(2");
    expect(el(fixture).querySelectorAll(".genui-grid__cell")).toHaveLength(2);

    expect(Array.from(el(fixture).querySelectorAll(".genui-table th")).map((node) => node.textContent?.trim())).toEqual([
      "Name",
      "Total",
    ]);
    const rows = el(fixture).querySelectorAll(".genui-table tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelectorAll("td")[0]?.textContent?.trim()).toBe("A");

    const tabButtons = el(fixture).querySelectorAll(".genui-tabs__list button");
    expect(tabButtons).toHaveLength(2);
    expect(text(fixture, ".genui-tabs__panel")).toBe("Tab one");
    (tabButtons[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(text(fixture, ".genui-tabs__panel")).toBe("Tab two");

    const stepStates = Array.from(el(fixture).querySelectorAll(".genui-steps li")).map((node) =>
      node.getAttribute("data-state"),
    );
    expect(stepStates).toEqual(["done", "current", "todo"]);
    expect(text(fixture, ".genui-steps__title")).toBe("Start");

    expect(text(fixture, ".genui-keyvalue dt")).toBe("Owner");
    expect(text(fixture, ".genui-keyvalue dd")).toBe("Ada");

    expect(text(fixture, ".genui-timeline__time")).toBe("09:00");
    expect(text(fixture, ".genui-timeline__title")).toBe("Kickoff");
    expect(text(fixture, ".genui-timeline__desc")).toBe("Start");

    expect(text(fixture, ".genui-quiz__question")).toBe("2+2?");
    const quizOptions = el(fixture).querySelectorAll(".genui-quiz__options button");
    expect(quizOptions).toHaveLength(2);
    (quizOptions[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelector(".genui-quiz__submit") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(text(fixture, ".genui-quiz__result")).toBe("Correct");
    expect(text(fixture, ".genui-quiz__explanation")).toBe("Four.");
  });

  it("renders the visible fallback for an unknown type and never throws", () => {
    const spec = {
      items: [{ type: "mystery-widget", payload: "x" }],
    } as unknown as GenuiSpec;

    const fixture = mount(spec);
    const fallback = el(fixture).querySelector(".genui-fallback");

    expect(fallback).not.toBeNull();
    expect(fallback?.textContent).toContain("mystery-widget");
  });

  it("hides a node whose `when` condition is false and shows it once satisfied", () => {
    const fixture = mount({
      items: [
        { type: "input", id: "show", label: "Show it", value: "" },
        {
          type: "text",
          content: "Conditional text",
          when: { field: "show", op: "eq", value: "yes" },
        },
      ],
    });

    expect(el(fixture).textContent).not.toContain("Conditional text");

    fixture.componentInstance.state.setField("show", "yes");
    fixture.detectChanges();
    expect(el(fixture).textContent).toContain("Conditional text");

    fixture.componentInstance.state.setField("show", "no");
    fixture.detectChanges();
    expect(el(fixture).textContent).not.toContain("Conditional text");
  });

  it("renders an `enableWhen` node inert with its disabled reason until enabled", () => {
    const fixture = mount({
      items: [
        {
          type: "button",
          label: "Continue",
          action: "continue",
          enableWhen: { field: "ready", op: "eq", value: "yes" },
          disabledReason: "Finish setup first",
        },
      ],
    });

    let node = el(fixture).querySelector(".genui-node") as HTMLElement;
    expect(node.classList.contains("genui-node--gated")).toBe(true);
    expect(node.hasAttribute("inert")).toBe(true);
    expect(node.getAttribute("aria-disabled")).toBe("true");
    expect(text(fixture, ".genui-node__gate")).toBe("Finish setup first");

    fixture.componentInstance.state.setField("ready", "yes");
    fixture.detectChanges();
    node = el(fixture).querySelector(".genui-node") as HTMLElement;
    expect(node.classList.contains("genui-node--gated")).toBe(false);
    expect(node.hasAttribute("inert")).toBe(false);
    expect(el(fixture).querySelector(".genui-node__gate")).toBeNull();
  });

  it("resolves table `$computed` cells through GenuiBlockState.computedValues", () => {
    const fixture = mount({
      computed: [{ id: "total", expr: "a+b" }],
      items: [
        {
          type: "table",
          columns: ["Item", "Total"],
          types: ["text", "num"],
          rows: [["Widget", { $computed: "total" }]],
        },
      ],
    });

    fixture.componentInstance.state.setField("a", "2");
    fixture.componentInstance.state.setField("b", "3");
    fixture.detectChanges();

    const cells = el(fixture).querySelectorAll(".genui-table tbody td");
    expect(cells[1]?.textContent?.trim()).toBe("5");

    fixture.componentInstance.state.setField("a", "10");
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll(".genui-table tbody td")[1]?.textContent?.trim()).toBe("13");
  });

  it("honours GENUI_LIMITS.maxDepth", () => {
    const within = mount({ items: [nestedRows(GENUI_LIMITS.maxDepth)] });
    expect(el(within).textContent).toContain("deep-leaf");
    within.destroy();

    const beyond = mount({ items: [nestedRows(GENUI_LIMITS.maxDepth + 1)] });
    expect(el(beyond).querySelector(".genui-text")).toBeNull();
    expect(el(beyond).textContent).not.toContain("deep-leaf");
  });

  it("honours GENUI_LIMITS.maxTableRows", () => {
    const rows = Array.from({ length: GENUI_LIMITS.maxTableRows + 5 }, (_, index) => [`row-${index}`]);
    const fixture = mount({ items: [{ type: "table", columns: ["Value"], rows }] });

    expect(el(fixture).querySelectorAll(".genui-table tbody tr")).toHaveLength(GENUI_LIMITS.maxTableRows);
  });

  it("emits the action, posts the provenance envelope and renders the action provenance", async () => {
    useRelay();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = mount({
      items: [{ type: "button", label: "Approve", action: "approve" }],
    });
    const emitted: { name: string; payload: Record<string, unknown>; blockId: string; specId: string }[] = [];
    fixture.componentInstance.action.subscribe((event) => emitted.push(event));

    (el(fixture).querySelector(".genui-button") as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(emitted).toEqual([
      { name: "approve", payload: { label: "Approve" }, blockId: CONTEXT.blockId, specId: CONTEXT.specId },
    ]);

    const request = httpMock!.expectOne("/genui/actions");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual({
      sessionId: CONTEXT.sessionId,
      name: "approve",
      payload: { label: "Approve" },
      specId: CONTEXT.specId,
      blockId: CONTEXT.blockId,
    });
    request.flush({ ok: true });

    await fixture.whenStable();
    fixture.detectChanges();

    const provenance = TestBed.inject(GenuiActionService).provenance();
    expect(provenance?.status).toBe("sent");
    expect(provenance?.name).toBe("approve");
    expect(text(fixture, ".genui-provenance__name")).toBe("approve");
    expect(el(fixture).querySelector(".genui-provenance")?.getAttribute("data-status")).toBe("sent");
    expect(el(fixture).querySelector(".genui-provenance__json")?.textContent).toContain('"label": "Approve"');
  });

  it("keeps a password input value out of localStorage, the submit payload and provenance", async () => {
    useRelay();
    httpMock = TestBed.inject(HttpTestingController);
    const secret = "s3cr3t-P@ssw0rd";
    const spec: GenuiSpec = {
      items: [
        { type: "input", id: "pw", inputType: "password", label: "Password" },
        { type: "submit", label: "Send", action: "send" },
      ],
    };
    expect(collectSecretIds(spec).has("pw")).toBe(true);

    const fixture = mount(spec, CONTEXT, true);
    const emitted: { name: string; payload: Record<string, unknown> }[] = [];
    fixture.componentInstance.action.subscribe((event) => emitted.push(event));

    const password = el(fixture).querySelector('input[type="password"]') as HTMLInputElement;
    expect(password).not.toBeNull();
    password.value = secret;
    password.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();

    const submit = el(fixture).querySelector(".genui-submit button") as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    submit.click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.name).toBe("send");
    expect(JSON.stringify(emitted[0]?.payload)).not.toContain(secret);
    expect(emitted[0]?.payload["fields"]).toEqual({});

    const request = httpMock!.expectOne("/genui/actions");
    expect(JSON.stringify(request.request.body)).not.toContain(secret);
    request.flush({ ok: true });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(JSON.stringify(TestBed.inject(GenuiActionService).provenance()?.payload)).not.toContain(secret);

    const storage = localStorage;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key === null) continue;
      expect(storage.getItem(key) ?? "").not.toContain(secret);
    }
    const persisted = JSON.parse(storage.getItem("decaf.genui.state:session-1:block-1:spec-1") ?? "{}") as {
      fields?: Record<string, string>;
    };
    expect(persisted.fields).toEqual({});
  });
});
