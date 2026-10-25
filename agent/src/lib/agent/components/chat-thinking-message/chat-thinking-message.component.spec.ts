import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatThinkingMessageComponent } from "./chat-thinking-message.component";

type ThinkingInputs = {
  label?: string | null;
  lines?: number;
  animated?: boolean;
  showAvatar?: boolean;
  avatarIcon?: string;
};

function mount(
  inputs: ThinkingInputs = {},
): ComponentFixture<ChatThinkingMessageComponent> {
  const fixture = TestBed.createComponent(ChatThinkingMessageComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatThinkingMessageComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("ChatThinkingMessageComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatThinkingMessageComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("exposes a live status region with the default label", () => {
    const fixture = mount();
    const root = element(fixture).querySelector(
      ".chat-thinking-message",
    ) as HTMLElement;

    expect(root.getAttribute("role")).toBe("status");
    expect(root.getAttribute("aria-live")).toBe("polite");
    expect(root.getAttribute("aria-label")).toBe("Agent is thinking");
    expect(
      element(fixture).querySelector(".chat-thinking-message__label")
        ?.textContent?.trim(),
    ).toBe("Thinking…");
  });

  it("renders and labels a custom message", () => {
    const fixture = mount({ label: "Searching the knowledge base…" });
    const root = element(fixture).querySelector(
      ".chat-thinking-message",
    ) as HTMLElement;

    expect(root.getAttribute("aria-label")).toBe(
      "Searching the knowledge base…",
    );
    expect(
      element(fixture).querySelector(".chat-thinking-message__label")
        ?.textContent?.trim(),
    ).toBe("Searching the knowledge base…");
  });

  it("renders the requested number of descending-width lines", () => {
    const fixture = mount({ lines: 3 });
    const lines = Array.from(
      element(fixture).querySelectorAll(".chat-thinking-message__line"),
    ) as HTMLElement[];

    expect(lines).toHaveLength(3);
    expect(lines[0].style.width).toBe("100%");
    expect(lines[1].style.width).toBe("80%");
    expect(lines[2].style.width).toBe("60%");
  });

  it("defaults to two lines", () => {
    const fixture = mount();
    expect(
      element(fixture).querySelectorAll(".chat-thinking-message__line"),
    ).toHaveLength(2);
  });

  it("toggles the animated class", () => {
    const animated = mount({ animated: true });
    expect(
      element(animated).querySelector(".chat-thinking-message")?.classList,
    ).toContain("chat-thinking-message--animated");

    const staticFixture = mount({ animated: false });
    expect(
      element(staticFixture).querySelector(".chat-thinking-message")?.classList,
    ).not.toContain("chat-thinking-message--animated");
  });

  it("shows the avatar icon by default and honours avatarIcon", () => {
    const fixture = mount({ avatarIcon: "loader" });
    const avatar = element(fixture).querySelector(
      ".chat-thinking-message__avatar",
    );

    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute("aria-hidden")).toBe("true");
    expect(avatar?.querySelector(".chat-icon--spin")).not.toBeNull();
  });

  it("hides the avatar when showAvatar is false", () => {
    const fixture = mount({ showAvatar: false });
    expect(
      element(fixture).querySelector(".chat-thinking-message__avatar"),
    ).toBeNull();
  });
});
