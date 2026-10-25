import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatSlashCommand } from "../../types";
import { ChatSlashCommandsComponent } from "./chat-slash-commands.component";

const COMMANDS: AgentChatSlashCommand[] = [
  { name: "summarise", description: "Summarise the conversation" },
  { name: "search", description: "Search the knowledge base" },
  { name: "sum", aliases: ["total"], description: "Sum a column" },
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatSlashCommandsComponent> {
  const fixture = TestBed.createComponent(ChatSlashCommandsComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatSlashCommandsComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function listboxOf(
  fixture: ComponentFixture<ChatSlashCommandsComponent>,
): HTMLElement {
  return element(fixture).querySelector(
    ".chat-slash-commands",
  ) as HTMLElement;
}

function optionsOf(
  fixture: ComponentFixture<ChatSlashCommandsComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-slash-commands__item"),
  ) as HTMLElement[];
}

function press(
  fixture: ComponentFixture<ChatSlashCommandsComponent>,
  key: string,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  listboxOf(fixture).dispatchEvent(event);
  fixture.detectChanges();
  return event;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ChatSlashCommandsComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatSlashCommandsComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders every command with its slash name and description", () => {
    const fixture = mount({ commands: COMMANDS });

    const listbox = listboxOf(fixture);
    expect(listbox.getAttribute("role")).toBe("listbox");
    expect(listbox.getAttribute("aria-label")).toBe("Slash commands");
    const options = optionsOf(fixture);
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toContain("/summarise");
    expect(options[0].textContent).toContain("Summarise the conversation");
    expect(options[0].getAttribute("role")).toBe("option");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
  });

  it("filters by prefix, with or without the leading slash", () => {
    const withoutSlash = mount({ commands: COMMANDS, query: "sum" });
    expect(
      optionsOf(withoutSlash).map((option) =>
        option.getAttribute("data-command"),
      ),
    ).toEqual(["summarise", "sum"]);

    const withSlash = mount({ commands: COMMANDS, query: "/sea" });
    expect(
      optionsOf(withSlash).map((option) => option.getAttribute("data-command")),
    ).toEqual(["search"]);
  });

  it("matches aliases", () => {
    const fixture = mount({ commands: COMMANDS, query: "tot" });

    expect(
      optionsOf(fixture).map((option) => option.getAttribute("data-command")),
    ).toEqual(["sum"]);
  });

  it("renders the empty state when nothing matches", () => {
    const fixture = mount({ commands: COMMANDS, query: "zzz" });

    expect(optionsOf(fixture)).toHaveLength(0);
    expect(
      element(fixture).querySelector(".chat-slash-commands__empty")
        ?.textContent,
    ).toContain("No matching commands");
    expect(fixture.componentInstance.activeDescendant()).toBeNull();
  });

  it("does not render while closed", () => {
    const fixture = mount({ commands: COMMANDS, open: false });

    expect(listboxOf(fixture)).toBeNull();
  });

  it("moves the highlight with arrow keys and wraps", () => {
    const fixture = mount({ commands: COMMANDS });

    const down = press(fixture, "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.activeIndex()).toBe(1);
    expect(optionsOf(fixture)[1].getAttribute("aria-selected")).toBe("true");

    press(fixture, "ArrowDown");
    press(fixture, "ArrowDown");
    expect(fixture.componentInstance.activeIndex()).toBe(0);

    press(fixture, "ArrowUp");
    expect(fixture.componentInstance.activeIndex()).toBe(2);
  });

  it("jumps to the first and last command with Home/End", () => {
    const fixture = mount({ commands: COMMANDS });

    press(fixture, "End");
    expect(fixture.componentInstance.activeIndex()).toBe(2);

    press(fixture, "Home");
    expect(fixture.componentInstance.activeIndex()).toBe(0);
  });

  it("selects the highlighted command with Enter and closes", () => {
    const fixture = mount({ commands: COMMANDS });
    const selected: AgentChatSlashCommand[] = [];
    let closed = 0;
    fixture.componentInstance.select.subscribe((command) =>
      selected.push(command),
    );
    fixture.componentInstance.close.subscribe(() => (closed += 1));

    press(fixture, "ArrowDown");
    press(fixture, "Enter");

    expect(selected).toEqual([COMMANDS[1]]);
    expect(closed).toBe(1);
  });

  it("does not select on Enter when nothing matches", () => {
    const fixture = mount({ commands: COMMANDS, query: "zzz" });
    const selected: AgentChatSlashCommand[] = [];
    fixture.componentInstance.select.subscribe((command) =>
      selected.push(command),
    );

    press(fixture, "Enter");

    expect(selected).toEqual([]);
  });

  it("ignores unmapped keys", () => {
    const fixture = mount({ commands: COMMANDS });

    const event = press(fixture, "a");

    expect(event.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.activeIndex()).toBe(0);
  });

  it("closes on Escape", () => {
    const fixture = mount({ commands: COMMANDS });
    let closed = 0;
    fixture.componentInstance.close.subscribe(() => (closed += 1));

    const event = press(fixture, "Escape");

    expect(event.defaultPrevented).toBe(true);
    expect(closed).toBe(1);
  });

  it("selects a clicked command", () => {
    const fixture = mount({ commands: COMMANDS });
    const selected: AgentChatSlashCommand[] = [];
    let closed = 0;
    fixture.componentInstance.select.subscribe((command) =>
      selected.push(command),
    );
    fixture.componentInstance.close.subscribe(() => (closed += 1));

    optionsOf(fixture)[2].click();

    expect(selected).toEqual([COMMANDS[2]]);
    expect(closed).toBe(1);
  });

  it("scrolls the active option into view", async () => {
    const fixture = mount({ commands: COMMANDS });
    const option = optionsOf(fixture)[1];
    const scrollIntoView = jest.fn();
    option.scrollIntoView = scrollIntoView;

    press(fixture, "ArrowDown");
    await flush();

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("resets the highlight when the query changes", () => {
    const fixture = mount({ commands: COMMANDS });
    press(fixture, "End");

    fixture.componentRef.setInput("query", "sea");
    fixture.detectChanges();

    expect(fixture.componentInstance.activeIndex()).toBe(0);
  });

  it("highlights an option on mouse move", () => {
    const fixture = mount({ commands: COMMANDS });

    optionsOf(fixture)[2].dispatchEvent(new MouseEvent("mousemove"));
    fixture.detectChanges();

    expect(fixture.componentInstance.activeIndex()).toBe(2);
  });
});
