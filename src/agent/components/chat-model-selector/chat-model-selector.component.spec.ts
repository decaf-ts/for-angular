import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatModel } from "../../types";
import { ChatModelSelectorComponent } from "./chat-model-selector.component";

const MODELS: AgentChatModel[] = [
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", description: "General" },
  { id: "claude-4", name: "Claude 4", provider: "Anthropic", description: "Long context" },
  { id: "local", name: "Local model", provider: "Decaf", description: "Offline" },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatModelSelectorComponent> {
  const fixture = TestBed.createComponent(ChatModelSelectorComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatModelSelectorComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function triggerOf(
  fixture: ComponentFixture<ChatModelSelectorComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    'button[data-action="trigger"]',
  ) as HTMLButtonElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function searchOf(
  fixture: ComponentFixture<ChatModelSelectorComponent>,
): HTMLInputElement {
  return element(fixture).querySelector(
    'input[data-role="search"]',
  ) as HTMLInputElement;
}

function optionsOf(
  fixture: ComponentFixture<ChatModelSelectorComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-model-selector__option"),
  ) as HTMLElement[];
}

function search(
  fixture: ComponentFixture<ChatModelSelectorComponent>,
  value: string,
): void {
  const input = searchOf(fixture);
  input.value = value;
  input.dispatchEvent(new Event("input"));
  fixture.detectChanges();
}

function press(
  fixture: ComponentFixture<ChatModelSelectorComponent>,
  key: string,
): void {
  searchOf(fixture).dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
  fixture.detectChanges();
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ChatModelSelectorComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatModelSelectorComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders a closed trigger with the placeholder when no model is selected", () => {
    const fixture = mount({ models: MODELS });

    expect(triggerOf(fixture).textContent).toContain("Select model");
    expect(triggerOf(fixture).getAttribute("aria-expanded")).toBe("false");
    expect(triggerOf(fixture).getAttribute("aria-haspopup")).toBe("listbox");
    expect(triggerOf(fixture).hasAttribute("aria-label")).toBe(false);
    expect(
      normalize(
        triggerOf(fixture).querySelector(".chat-model-selector__label")
          ?.textContent,
      ),
    ).toBe("Model:");
    expect(normalize(triggerOf(fixture).textContent)).toContain(
      "Model: Select model",
    );
    expect(element(fixture).querySelector(".chat-model-selector__panel")).toBeNull();
  });

  it("shows the current model and provider", () => {
    const fixture = mount({ models: MODELS, model: "claude-4" });

    expect(triggerOf(fixture).textContent).toContain("Claude 4");
    expect(triggerOf(fixture).textContent).toContain("Anthropic");
    expect(triggerOf(fixture).hasAttribute("aria-label")).toBe(false);
    expect(normalize(triggerOf(fixture).textContent)).toContain(
      "Model: Claude 4",
    );
  });

  it("resolves a current model object", () => {
    const fixture = mount({ models: MODELS, model: MODELS[2] });

    expect(fixture.componentInstance.selected()).toEqual(MODELS[2]);
    expect(triggerOf(fixture).textContent).toContain("Local model");
  });

  it("opens the panel, emits openChange, and focuses the search field", async () => {
    const fixture = mount({ models: MODELS });
    const changes: boolean[] = [];
    fixture.componentInstance.openChange.subscribe((value) => changes.push(value));

    triggerOf(fixture).click();
    fixture.detectChanges();
    await flush();

    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(triggerOf(fixture).getAttribute("aria-expanded")).toBe("true");
    expect(optionsOf(fixture)).toHaveLength(3);
    expect(document.activeElement).toBe(searchOf(fixture));
    expect(changes).toEqual([true]);
  });

  it("filters models by name, provider, id, and description", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    search(fixture, "claude");
    expect(optionsOf(fixture).map((option) => option.getAttribute("data-model-id"))).toEqual([
      "claude-4",
    ]);

    search(fixture, "decaf");
    expect(optionsOf(fixture).map((option) => option.getAttribute("data-model-id"))).toEqual([
      "local",
    ]);

    search(fixture, "gpt-5");
    expect(optionsOf(fixture)).toHaveLength(1);

    search(fixture, "offline");
    expect(optionsOf(fixture).map((option) => option.getAttribute("data-model-id"))).toEqual([
      "local",
    ]);
  });

  it("renders an empty-result state", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    search(fixture, "zzz");

    expect(optionsOf(fixture)).toHaveLength(0);
    expect(
      element(fixture).querySelector(".chat-model-selector__empty")?.textContent,
    ).toContain("No models match your search.");
  });

  it("emits the selected model and closes the panel", () => {
    const fixture = mount({ models: MODELS });
    const selected: AgentChatModel[] = [];
    const changes: boolean[] = [];
    fixture.componentInstance.modelChange.subscribe((model) => selected.push(model));
    fixture.componentInstance.openChange.subscribe((value) => changes.push(value));
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    optionsOf(fixture)[1].click();
    fixture.detectChanges();

    expect(selected).toEqual([MODELS[1]]);
    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(changes).toEqual([true, false]);
    expect(element(fixture).querySelector(".chat-model-selector__panel")).toBeNull();
  });

  it("navigates with arrow keys and selects with Enter", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();
    const selected: AgentChatModel[] = [];
    fixture.componentInstance.modelChange.subscribe((model) => selected.push(model));

    press(fixture, "ArrowDown");
    press(fixture, "ArrowDown");
    expect(fixture.componentInstance.activeIndex()).toBe(2);
    press(fixture, "ArrowUp");
    expect(fixture.componentInstance.activeIndex()).toBe(1);
    press(fixture, "Enter");

    expect(selected).toEqual([MODELS[1]]);
  });

  it("closes on Escape", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    press(fixture, "Escape");

    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it("closes when clicking outside the component", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    document.body.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it("stays open when clicking inside the component", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    searchOf(fixture).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(true);
  });

  it("highlights an option on mouse move", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    optionsOf(fixture)[2].dispatchEvent(new MouseEvent("mousemove"));
    fixture.detectChanges();

    expect(fixture.componentInstance.activeIndex()).toBe(2);
  });

  it("ignores out-of-range highlights and unmapped keys", () => {
    const fixture = mount({ models: MODELS });
    fixture.componentInstance.openPanel();
    fixture.detectChanges();

    fixture.componentInstance.setActive(-1);
    fixture.componentInstance.setActive(MODELS.length);
    expect(fixture.componentInstance.activeIndex()).toBe(0);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    searchOf(fixture).dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("does not open while disabled", () => {
    const fixture = mount({ models: MODELS, disabled: true });

    fixture.componentInstance.openPanel();
    triggerOf(fixture).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(triggerOf(fixture).disabled).toBe(true);
  });
});
