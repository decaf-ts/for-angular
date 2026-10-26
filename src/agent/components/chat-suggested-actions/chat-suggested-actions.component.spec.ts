import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatSuggestedActionsComponent } from "./chat-suggested-actions.component";

const SUGGESTIONS = [
  "How many orders shipped last week?",
  "Summarise open incidents.",
  "Draft a customer follow-up email.",
];

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatSuggestedActionsComponent> {
  const fixture = TestBed.createComponent(ChatSuggestedActionsComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatSuggestedActionsComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function buttons(
  fixture: ComponentFixture<ChatSuggestedActionsComponent>,
): HTMLButtonElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-suggested-actions__item"),
  ) as HTMLButtonElement[];
}

describe("ChatSuggestedActionsComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatSuggestedActionsComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the suggestion grid in the empty state", () => {
    const fixture = mount({ suggestions: SUGGESTIONS });

    const section = element(fixture).querySelector(
      ".chat-suggested-actions",
    ) as HTMLElement;
    expect(section).not.toBeNull();
    expect(section.getAttribute("aria-label")).toBe("Suggested prompts");
    expect(section.textContent).toContain("Try asking");
    expect(buttons(fixture).map((button) => button.textContent?.trim())).toEqual(
      SUGGESTIONS,
    );
  });

  it("hides when the conversation is no longer empty", () => {
    const fixture = mount({ suggestions: SUGGESTIONS, empty: false });

    expect(
      element(fixture).querySelector(".chat-suggested-actions"),
    ).toBeNull();
  });

  it("hides when there are no suggestions", () => {
    const fixture = mount({ suggestions: [] });

    expect(
      element(fixture).querySelector(".chat-suggested-actions"),
    ).toBeNull();
  });

  it("uses a custom title", () => {
    const fixture = mount({ suggestions: SUGGESTIONS, title: "Start here" });

    expect(
      element(fixture).querySelector(".chat-suggested-actions__title")
        ?.textContent,
    ).toContain("Start here");
  });

  it("emits the selected prompt", () => {
    const fixture = mount({ suggestions: SUGGESTIONS });
    const selected: string[] = [];
    fixture.componentInstance.select.subscribe((value) => selected.push(value));

    buttons(fixture)[1].click();

    expect(selected).toEqual([SUGGESTIONS[1]]);
  });

  it("does not render or emit while disabled", () => {
    const fixture = mount({ suggestions: SUGGESTIONS, disabled: true });
    const selected: string[] = [];
    fixture.componentInstance.select.subscribe((value) => selected.push(value));

    fixture.componentInstance.choose(SUGGESTIONS[0]);

    expect(
      element(fixture).querySelector(".chat-suggested-actions"),
    ).toBeNull();
    expect(selected).toEqual([]);
  });
});
