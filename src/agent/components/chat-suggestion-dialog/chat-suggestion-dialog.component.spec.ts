import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatSuggestionDialogComponent } from "./chat-suggestion-dialog.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatSuggestionDialogComponent> {
  const fixture = TestBed.createComponent(ChatSuggestionDialogComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatSuggestionDialogComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function panelOf(
  fixture: ComponentFixture<ChatSuggestionDialogComponent>,
): HTMLElement {
  return element(fixture).querySelector(
    ".chat-suggestion-dialog__panel",
  ) as HTMLElement;
}

function buttonOf(
  fixture: ComponentFixture<ChatSuggestionDialogComponent>,
  action: string,
): HTMLButtonElement {
  return element(fixture).querySelector(
    `button[data-action="${action}"]`,
  ) as HTMLButtonElement;
}

function keydown(
  target: EventTarget,
  init: KeyboardEventInit,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ChatSuggestionDialogComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatSuggestionDialogComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders nothing while closed", () => {
    const fixture = mount({ suggestion: "Rename the chat" });

    expect(panelOf(fixture)).toBeNull();
  });

  it("renders a labelled modal with the suggestion and actions", async () => {
    const fixture = mount({ open: true, suggestion: "Rename the chat to Q4 review" });
    await flush();
    fixture.detectChanges();

    const panel = panelOf(fixture);
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    const titleId = panel.getAttribute("aria-labelledby");
    const descriptionId = panel.getAttribute("aria-describedby");
    expect(titleId).toBe(fixture.componentInstance.titleId);
    expect(descriptionId).toBe(fixture.componentInstance.descriptionId);
    expect(element(fixture).querySelector(`#${titleId}`)?.textContent).toContain(
      "Suggested change",
    );
    expect(
      element(fixture).querySelector(`#${descriptionId}`)?.textContent,
    ).toContain("Review the AI-generated suggestion");
    expect(
      element(fixture).querySelector(".chat-suggestion-dialog__suggestion")
        ?.textContent,
    ).toContain("Rename the chat to Q4 review");
    expect(buttonOf(fixture, "apply").textContent).toContain("Apply");
    expect(buttonOf(fixture, "ignore").textContent).toContain("Ignore");
    expect(document.activeElement).toBe(panel);
  });

  it("uses a custom title and description", () => {
    const fixture = mount({
      open: true,
      suggestion: "Rewrite",
      title: "Rewrite title?",
      description: "This will update the conversation title.",
    });

    expect(
      element(fixture).querySelector(".chat-suggestion-dialog__title")
        ?.textContent,
    ).toContain("Rewrite title?");
    expect(
      element(fixture).querySelector(".chat-suggestion-dialog__description")
        ?.textContent,
    ).toContain("This will update the conversation title.");
  });

  it("emits the suggestion when applied", () => {
    const fixture = mount({ open: true, suggestion: "A better title" });
    const applied: string[] = [];
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    buttonOf(fixture, "apply").click();

    expect(applied).toEqual(["A better title"]);
  });

  it("disables apply when the suggestion is blank", () => {
    const fixture = mount({ open: true, suggestion: "   " });
    const applied: string[] = [];
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    expect(buttonOf(fixture, "apply").disabled).toBe(true);
    fixture.componentInstance.applySuggestion();
    expect(applied).toEqual([]);
  });

  it("emits ignore from the button, close button, and backdrop", () => {
    const fixture = mount({ open: true, suggestion: "Suggestion" });
    let ignored = 0;
    fixture.componentInstance.ignore.subscribe(() => (ignored += 1));

    buttonOf(fixture, "ignore").click();
    buttonOf(fixture, "close").click();
    element(fixture)
      .querySelector('[data-role="overlay"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(ignored).toBe(3);
  });

  it("does not ignore when the dialog panel itself is clicked", () => {
    const fixture = mount({ open: true, suggestion: "Suggestion" });
    let ignored = 0;
    fixture.componentInstance.ignore.subscribe(() => (ignored += 1));

    panelOf(fixture).click();

    expect(ignored).toBe(0);
  });

  it("ignores on Escape", () => {
    const fixture = mount({ open: true, suggestion: "Suggestion" });
    let ignored = 0;
    fixture.componentInstance.ignore.subscribe(() => (ignored += 1));

    const event = keydown(document, { key: "Escape" });

    expect(event.defaultPrevented).toBe(true);
    expect(ignored).toBe(1);
  });

  it("applies on Enter when the dialog is focused", () => {
    const fixture = mount({ open: true, suggestion: "Apply me" });
    const applied: string[] = [];
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    keydown(panelOf(fixture), { key: "Enter" });

    expect(applied).toEqual(["Apply me"]);
  });

  it("applies on Ctrl/Cmd+Enter from anywhere", () => {
    const fixture = mount({ open: true, suggestion: "Apply me" });
    const applied: string[] = [];
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    keydown(buttonOf(fixture, "apply"), { key: "Enter", ctrlKey: true });
    keydown(buttonOf(fixture, "ignore"), { key: "Enter", metaKey: true });

    expect(applied).toEqual(["Apply me", "Apply me"]);
  });

  it("does not emit apply or ignore directly while closed", () => {
    const fixture = mount({ open: false, suggestion: "Apply me" });
    let ignored = 0;
    const applied: string[] = [];
    fixture.componentInstance.ignore.subscribe(() => (ignored += 1));
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    fixture.componentInstance.ignoreSuggestion();
    fixture.componentInstance.applySuggestion();

    expect(ignored).toBe(0);
    expect(applied).toEqual([]);
  });

  it("ignores a plain Enter outside the dialog", () => {
    const fixture = mount({ open: true, suggestion: "Apply me" });
    const applied: string[] = [];
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    const event = keydown(buttonOf(fixture, "ignore"), { key: "Enter" });

    expect(event.defaultPrevented).toBe(false);
    expect(applied).toEqual([]);
  });

  it("ignores keyboard events while closed", () => {
    const fixture = mount({ open: false, suggestion: "Apply me" });
    let ignored = 0;
    const applied: string[] = [];
    fixture.componentInstance.ignore.subscribe(() => (ignored += 1));
    fixture.componentInstance.apply.subscribe((value) => applied.push(value));

    keydown(document, { key: "Escape" });
    keydown(document, { key: "Enter", ctrlKey: true });

    expect(ignored).toBe(0);
    expect(applied).toEqual([]);
  });
});
