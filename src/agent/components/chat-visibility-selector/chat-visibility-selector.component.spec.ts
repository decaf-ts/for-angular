import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatVisibility } from "../../types";
import { ChatVisibilitySelectorComponent } from "./chat-visibility-selector.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatVisibilitySelectorComponent> {
  const fixture = TestBed.createComponent(ChatVisibilitySelectorComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatVisibilitySelectorComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function triggerOf(
  fixture: ComponentFixture<ChatVisibilitySelectorComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    'button[data-action="trigger"]',
  ) as HTMLButtonElement;
}

function optionsOf(
  fixture: ComponentFixture<ChatVisibilitySelectorComponent>,
): HTMLButtonElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-visibility-selector__option"),
  ) as HTMLButtonElement[];
}

describe("ChatVisibilitySelectorComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatVisibilitySelectorComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the current visibility on the trigger", () => {
    const fixture = mount();

    expect(triggerOf(fixture).textContent).toContain("Private");
    expect(triggerOf(fixture).getAttribute("aria-expanded")).toBe("false");
    expect(triggerOf(fixture).getAttribute("aria-haspopup")).toBe("listbox");
    expect(triggerOf(fixture).hasAttribute("aria-label")).toBe(false);
    expect(
      normalize(
        triggerOf(fixture).querySelector(".chat-visibility-selector__label")
          ?.textContent,
      ),
    ).toBe("Conversation visibility:");
    expect(normalize(triggerOf(fixture).textContent)).toContain(
      "Conversation visibility: Private",
    );
  });

  it("opens a dropdown with both options and their hints", () => {
    const fixture = mount();

    triggerOf(fixture).click();
    fixture.detectChanges();

    const options = optionsOf(fixture);
    expect(options).toHaveLength(2);
    expect(options[0].getAttribute("data-visibility")).toBe("private");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[0].textContent).toContain("Only you can see this conversation.");
    expect(options[1].getAttribute("data-visibility")).toBe("shared");
    expect(options[1].textContent).toContain(
      "Anyone with the link can see this conversation.",
    );
  });

  it("optimistically switches to shared and emits the change", () => {
    const fixture = mount();
    const changes: AgentChatVisibility[] = [];
    fixture.componentInstance.visibilityChange.subscribe((value) =>
      changes.push(value),
    );
    triggerOf(fixture).click();
    fixture.detectChanges();

    optionsOf(fixture)[1].click();
    fixture.detectChanges();

    expect(changes).toEqual(["shared"]);
    expect(fixture.componentInstance.current()).toBe("shared");
    expect(triggerOf(fixture).textContent).toContain("Shared");
    expect(normalize(triggerOf(fixture).textContent)).toContain(
      "Conversation visibility: Shared",
    );
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it("keeps the previous value when optimistic is false", () => {
    const fixture = mount({ optimistic: false });
    const changes: AgentChatVisibility[] = [];
    fixture.componentInstance.visibilityChange.subscribe((value) =>
      changes.push(value),
    );
    fixture.componentInstance.toggle();
    fixture.detectChanges();

    optionsOf(fixture)[1].click();
    fixture.detectChanges();

    expect(changes).toEqual(["shared"]);
    expect(fixture.componentInstance.current()).toBe("private");
    expect(triggerOf(fixture).textContent).toContain("Private");
  });

  it("follows the visibility input when the parent confirms", () => {
    const fixture = mount();

    fixture.componentRef.setInput("visibility", "shared");
    fixture.detectChanges();

    expect(fixture.componentInstance.current()).toBe("shared");
    expect(triggerOf(fixture).textContent).toContain("Shared");
  });

  it("does not emit when selecting the current visibility", () => {
    const fixture = mount();
    const changes: AgentChatVisibility[] = [];
    fixture.componentInstance.visibilityChange.subscribe((value) =>
      changes.push(value),
    );
    fixture.componentInstance.toggle();
    fixture.detectChanges();

    optionsOf(fixture)[0].click();

    expect(changes).toEqual([]);
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it("rolls back an optimistic change", () => {
    const fixture = mount();
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    optionsOf(fixture)[1].click();

    fixture.componentInstance.rollback();

    expect(fixture.componentInstance.current()).toBe("private");
  });

  it("does not select while disabled", () => {
    const fixture = mount({ disabled: true });
    const changes: AgentChatVisibility[] = [];
    fixture.componentInstance.visibilityChange.subscribe((value) =>
      changes.push(value),
    );

    fixture.componentInstance.select("shared");

    expect(changes).toEqual([]);
    expect(fixture.componentInstance.current()).toBe("private");
  });

  it("closes the dropdown directly without emitting", () => {
    const fixture = mount();
    const changes: AgentChatVisibility[] = [];
    fixture.componentInstance.visibilityChange.subscribe((value) =>
      changes.push(value),
    );
    fixture.componentInstance.toggle();

    fixture.componentInstance.close();

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(changes).toEqual([]);
  });

  it("does not open while disabled", () => {
    const fixture = mount({ disabled: true });

    triggerOf(fixture).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
    expect(triggerOf(fixture).disabled).toBe(true);
  });

  it("closes on outside clicks and stays open on inside clicks", () => {
    const fixture = mount();
    fixture.componentInstance.toggle();
    fixture.detectChanges();

    const panel = element(fixture).querySelector(
      ".chat-visibility-selector__panel",
    ) as HTMLElement;
    panel.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.isOpen()).toBe(true);

    document.body.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });
});
