import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatComposerComponent } from "./chat-composer.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatComposerComponent> {
  const fixture = TestBed.createComponent(ChatComposerComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatComposerComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function textareaOf(
  fixture: ComponentFixture<ChatComposerComponent>,
): HTMLTextAreaElement {
  return element(fixture).querySelector(
    ".chat-composer__input",
  ) as HTMLTextAreaElement;
}

function actionButton(
  fixture: ComponentFixture<ChatComposerComponent>,
  action: string,
): HTMLButtonElement | null {
  return element(fixture).querySelector(
    `button[data-action="${action}"]`,
  ) as HTMLButtonElement | null;
}

function typeInto(
  fixture: ComponentFixture<ChatComposerComponent>,
  value: string,
): void {
  const textarea = textareaOf(fixture);
  textarea.value = value;
  textarea.dispatchEvent(new Event("input"));
  fixture.detectChanges();
}

function keydown(
  fixture: ComponentFixture<ChatComposerComponent>,
  init: KeyboardEventInit,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  textareaOf(fixture).dispatchEvent(event);
  fixture.detectChanges();
  return event;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ChatComposerComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatComposerComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders a labelled textarea and the send action", () => {
    const fixture = mount();
    const textarea = textareaOf(fixture);

    expect(textarea).not.toBeNull();
    expect(textarea.id).toBe(fixture.componentInstance.textareaId);
    expect(textarea.getAttribute("placeholder")).toBe("Type a message…");
    expect(element(fixture).querySelector("label")?.getAttribute("for")).toBe(
      fixture.componentInstance.textareaId,
    );
    expect(actionButton(fixture, "send")).not.toBeNull();
    expect(actionButton(fixture, "stop")).toBeNull();
    expect(element(fixture).querySelector(".chat-composer__hint")?.textContent).toContain(
      "Enter to send",
    );
  });

  it("uses an explicit placeholder when provided", () => {
    const fixture = mount({ placeholder: "Ask the agent" });

    expect(textareaOf(fixture).getAttribute("placeholder")).toBe("Ask the agent");
  });

  it("emits valueChange and keeps the draft in sync while typing", () => {
    const fixture = mount();
    const changes: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => changes.push(value));

    typeInto(fixture, "Hello there");

    expect(fixture.componentInstance.draft()).toBe("Hello there");
    expect(changes).toEqual(["Hello there"]);
    expect(textareaOf(fixture).value).toBe("Hello there");
  });

  it("sends on Enter, clears the draft, and refocuses the textarea", async () => {
    const fixture = mount();
    const sent: string[] = [];
    const changes: string[] = [];
    fixture.componentInstance.send.subscribe((value) => sent.push(value));
    fixture.componentInstance.valueChange.subscribe((value) => changes.push(value));

    typeInto(fixture, "  Summarise the orders  ");
    const event = keydown(fixture, { key: "Enter" });
    await flush();
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(sent).toEqual(["Summarise the orders"]);
    expect(fixture.componentInstance.draft()).toBe("");
    expect(changes).toEqual(["  Summarise the orders  ", ""]);
    expect(document.activeElement).toBe(textareaOf(fixture));
  });

  it("ignores Enter while an IME composition is active", () => {
    const fixture = mount({ value: "composing" });
    const sent: string[] = [];
    fixture.componentInstance.send.subscribe((value) => sent.push(value));

    const event = keydown(fixture, { key: "Enter", isComposing: true });

    expect(event.defaultPrevented).toBe(false);
    expect(sent).toEqual([]);
  });

  it("does not send Shift+Enter (newline)", () => {
    const fixture = mount();
    const sent: string[] = [];
    fixture.componentInstance.send.subscribe((value) => sent.push(value));

    typeInto(fixture, "first line");
    const event = keydown(fixture, { key: "Enter", shiftKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(sent).toEqual([]);
  });

  it("does not send blank drafts or while running", () => {
    const blank = mount();
    const blankSent: string[] = [];
    blank.componentInstance.send.subscribe((value) => blankSent.push(value));
    keydown(blank, { key: "Enter" });
    expect(blankSent).toEqual([]);

    const running = mount({ value: "pending", running: true });
    const runningSent: string[] = [];
    running.componentInstance.send.subscribe((value) => runningSent.push(value));
    keydown(running, { key: "Enter" });
    expect(runningSent).toEqual([]);
  });

  it("shows a stop action while running and emits stop", () => {
    const fixture = mount({ value: "In flight", running: true });
    let stops = 0;
    const sent: string[] = [];
    fixture.componentInstance.stop.subscribe(() => (stops += 1));
    fixture.componentInstance.send.subscribe((value) => sent.push(value));

    expect(actionButton(fixture, "send")).toBeNull();
    const stop = actionButton(fixture, "stop");
    expect(stop).not.toBeNull();
    expect(stop?.getAttribute("aria-label")).toBe("Stop response");
    expect(textareaOf(fixture).disabled).toBe(true);

    stop?.click();
    fixture.detectChanges();

    expect(stops).toBe(1);
    expect(sent).toEqual([]);
  });

  it("keeps the textarea editable while running when disabledWhileRunning is false", () => {
    const fixture = mount({
      value: "In flight",
      running: true,
      disabledWhileRunning: false,
    });

    expect(textareaOf(fixture).disabled).toBe(false);
  });

  it("disables the textarea and actions when disabled", () => {
    const fixture = mount({ value: "Draft", disabled: true });
    let stops = 0;
    fixture.componentInstance.stop.subscribe(() => (stops += 1));

    expect(textareaOf(fixture).disabled).toBe(true);
    expect(actionButton(fixture, "send")?.disabled).toBe(true);
    fixture.componentInstance.submit();
    expect(stops).toBe(0);
  });

  it("retains the draft when clearOnSend is false", async () => {
    const fixture = mount({ clearOnSend: false, refocusOnSend: false });
    const sent: string[] = [];
    fixture.componentInstance.send.subscribe((value) => sent.push(value));

    typeInto(fixture, "keep me");
    fixture.componentInstance.submit();
    await flush();

    expect(sent).toEqual(["keep me"]);
    expect(fixture.componentInstance.draft()).toBe("keep me");
    expect(textareaOf(fixture).value).toBe("keep me");
  });

  it("emits slash queries for a leading slash without spaces", () => {
    const fixture = mount();
    const queries: (string | null)[] = [];
    fixture.componentInstance.slashQuery.subscribe((value) => queries.push(value));

    typeInto(fixture, "/sum");
    typeInto(fixture, "/summarise this");
    typeInto(fixture, "hello");

    expect(queries).toEqual(["sum", null, null]);
  });

  it("accepts a slash command into the draft", async () => {
    const fixture = mount();
    const changes: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => changes.push(value));

    fixture.componentInstance.acceptSlashCommand("/summarise");
    await flush();
    fixture.detectChanges();

    expect(fixture.componentInstance.draft()).toBe("/summarise ");
    expect(changes).toEqual(["/summarise "]);
    expect(document.activeElement).toBe(textareaOf(fixture));
  });

  it("auto-grows the textarea up to maxRows", () => {
    const fixture = mount({ maxRows: 3 });
    const textarea = textareaOf(fixture);
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 120,
    });

    fixture.componentInstance.autoGrow();

    expect(textarea.style.height).toBe("66px");
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("switches the hint to the running state while a response is in flight", () => {
    const fixture = mount({ running: true });

    expect(
      element(fixture).querySelector(".chat-composer__hint")?.textContent,
    ).toContain("Agent is responding");
  });

  it("does not refocus after a send when refocusOnSend is false", async () => {
    const fixture = mount({ refocusOnSend: false });
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();
    typeInto(fixture, "no refocus");

    fixture.componentInstance.submit();
    await flush();

    expect(fixture.componentInstance.draft()).toBe("");
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it("keeps the textarea scroll-hidden when content fits within maxRows", () => {
    const fixture = mount({ maxRows: 6 });
    const textarea = textareaOf(fixture);
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 44,
    });

    fixture.componentInstance.autoGrow();

    expect(textarea.style.height).toBe("44px");
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("prevents native form submission and sends the draft", () => {
    const fixture = mount({ value: "form submit" });
    const sent: string[] = [];
    fixture.componentInstance.send.subscribe((value) => sent.push(value));

    const event = new Event("submit", { bubbles: true, cancelable: true });
    element(fixture).querySelector("form")!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(sent).toEqual(["form submit"]);
  });
});
