import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatToolCallState } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatToolComponent } from "./chat-tool.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatToolComponent> {
  const fixture = TestBed.createComponent(ChatToolComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatToolComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function text(fixture: ComponentFixture<ChatToolComponent>, selector: string): string {
  return (
    element(fixture).querySelector(selector)?.textContent?.trim() ?? ""
  );
}

function trigger(fixture: ComponentFixture<ChatToolComponent>): HTMLButtonElement {
  return element(fixture).querySelector(".chat-tool__trigger") as HTMLButtonElement;
}

function iconNames(fixture: ComponentFixture<ChatToolComponent>): string[] {
  return fixture.debugElement
    .queryAll(By.directive(ChatIconComponent))
    .map((debug) => debug.componentInstance.name());
}

describe("ChatToolComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatToolComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the title as the heading and the tool name beneath it", () => {
    const fixture = mount({ name: "queryOrders", title: "Order lookup" });

    expect(text(fixture, ".chat-tool__name")).toBe("Order lookup");
    expect(text(fixture, ".chat-tool__tool-name")).toBe("queryOrders");
  });

  it("falls back to the name when no title is provided", () => {
    const fixture = mount({ name: "queryOrders" });

    expect(text(fixture, ".chat-tool__name")).toBe("queryOrders");
    expect(element(fixture).querySelector(".chat-tool__tool-name")).toBeNull();
  });

  it("renders every state label and tone", () => {
    const cases: Array<[AgentChatToolCallState, string, string]> = [
      ["input-streaming", "pending", "Preparing input…"],
      ["input-available", "pending", "Input ready"],
      ["output-available", "success", "Completed"],
      ["output-error", "error", "Failed"],
      ["output-denied", "denied", "Denied"],
    ];
    const fixture = mount();

    for (const [state, tone, label] of cases) {
      fixture.componentRef.setInput("state", state);
      fixture.detectChanges();

      const root = element(fixture).querySelector(".chat-tool") as HTMLElement;
      expect(root.getAttribute("data-state")).toBe(state);
      expect(root.getAttribute("data-tone")).toBe(tone);
      expect(text(fixture, ".chat-tool__status")).toContain(label);
    }
  });

  it("resolves the state label through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.tool.state.output-available"] =
      "Concluído";
    const fixture = mount({ state: "output-available" });

    expect(text(fixture, ".chat-tool__status")).toContain("Concluído");
  });

  it("applies the busy class only while the input is streaming", () => {
    const fixture = mount({ state: "input-streaming" });
    const streamingStatus = element(fixture).querySelector(
      ".chat-tool__status",
    ) as HTMLElement;
    expect(streamingStatus.classList).toContain("chat-tool__status--busy");
    expect(iconNames(fixture)[1]).toBe("loader");

    fixture.componentRef.setInput("state", "output-available");
    fixture.detectChanges();

    expect(streamingStatus.classList).not.toContain(
      "chat-tool__status--busy",
    );
    expect(iconNames(fixture)[1]).toBe("check");
  });

  it("hides the trigger and content when there is nothing to expand", () => {
    const fixture = mount({ name: "queryOrders" });

    expect(trigger(fixture)).toBeNull();
    expect(element(fixture).querySelector(".chat-tool__content")).toBeNull();
    expect(element(fixture).querySelector(".chat-tool__error")).toBeNull();
  });

  it("renders the error alert even while collapsed", () => {
    const fixture = mount({ state: "output-error", error: "backend timeout" });

    const error = element(fixture).querySelector(
      ".chat-tool__error",
    ) as HTMLElement;
    expect(error).not.toBeNull();
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent?.trim()).toBe("backend timeout");
    expect(element(fixture).querySelector(".chat-tool__content")).toBeNull();
  });

  it("wires aria-expanded and aria-controls to the content panel", () => {
    const fixture = mount({ toolInput: { status: "delayed" } });
    const button = trigger(fixture);

    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBe(
      fixture.componentInstance.contentId,
    );
    expect(text(fixture, ".chat-tool__trigger-label")).toBe("Show details");

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(text(fixture, ".chat-tool__trigger-label")).toBe("Hide details");
    expect(
      element(fixture).querySelector(".chat-tool__content")?.getAttribute("id"),
    ).toBe(fixture.componentInstance.contentId);
  });

  it("renders input and output JSON panes when both values exist", () => {
    const fixture = mount({
      toolInput: { status: "delayed", limit: 3 },
      toolOutput: { count: 3 },
      open: true,
    });

    const input = element(fixture).querySelector(
      '[data-pane="input"]',
    ) as HTMLElement;
    const output = element(fixture).querySelector(
      '[data-pane="output"]',
    ) as HTMLElement;
    expect(input.textContent).toContain('"status": "delayed"');
    expect(input.textContent).toContain('"limit": 3');
    expect(output.textContent).toContain('"count": 3');
  });

  it("omits a pane whose value is undefined", () => {
    const fixture = mount({ toolInput: { status: "delayed" }, open: true });

    expect(
      element(fixture).querySelector('[data-pane="input"]'),
    ).not.toBeNull();
    expect(element(fixture).querySelector('[data-pane="output"]')).toBeNull();
    expect(text(fixture, ".chat-tool__pane-title")).toBe("Input");
  });

  it("emits toggle exactly once per trigger click with the new value", () => {
    const fixture = mount({ toolOutput: { count: 1 } });
    const toggles: boolean[] = [];
    fixture.componentInstance.toggle.subscribe((value) => toggles.push(value));
    const button = trigger(fixture);

    button.click();
    fixture.detectChanges();
    expect(toggles).toEqual([true]);
    expect(
      element(fixture).querySelector(".chat-tool__content"),
    ).not.toBeNull();

    button.click();
    fixture.detectChanges();
    expect(toggles).toEqual([true, false]);
    expect(element(fixture).querySelector(".chat-tool__content")).toBeNull();
  });

  it("keeps the open input in sync with the expanded signal", () => {
    const fixture = mount({ toolInput: { a: 1 } });

    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
    expect(
      element(fixture).querySelector(".chat-tool__content"),
    ).not.toBeNull();

    fixture.componentRef.setInput("open", false);
    fixture.detectChanges();
    expect(element(fixture).querySelector(".chat-tool__content")).toBeNull();
  });
});
