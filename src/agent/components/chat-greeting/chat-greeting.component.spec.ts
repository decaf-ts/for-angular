import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatGreetingComponent } from "./chat-greeting.component";

@Component({
  standalone: true,
  imports: [ChatGreetingComponent],
  template: `
    <ngx-decaf-chat-greeting
      variant="info"
      linkHref="https://example.test/help"
      linkLabel="Docs"
    >
      <span class="projected-content">Projected content</span>
    </ngx-decaf-chat-greeting>
  `,
})
class ChatGreetingHostComponent {}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatGreetingComponent> {
  const fixture = TestBed.createComponent(ChatGreetingComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatGreetingComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("ChatGreetingComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatGreetingComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the greeting variant, defaults, and no info icon", () => {
    const fixture = mount();
    const section = element(fixture).querySelector(
      ".chat-greeting",
    ) as HTMLElement;

    expect(section).not.toBeNull();
    expect(section.classList.contains("chat-greeting--info")).toBe(false);
    expect(section.getAttribute("role")).toBe("note");
    expect(section.getAttribute("aria-label")).toBe("How can I help?");
    expect(
      element(fixture).querySelector(".chat-greeting__title")?.textContent?.trim(),
    ).toBe("How can I help?");
    expect(
      element(fixture).querySelector(".chat-greeting__message")?.textContent?.trim(),
    ).toBe(
      "Ask a question, attach a file, or pick a suggestion to get started.",
    );
    expect(element(fixture).querySelector(".chat-greeting__icon")).toBeNull();
  });

  it("renders the info variant with the configured icon", () => {
    const fixture = mount({ variant: "info", icon: "box", iconSize: 30 });
    const section = element(fixture).querySelector(
      ".chat-greeting",
    ) as HTMLElement;

    expect(section.classList.contains("chat-greeting--info")).toBe(true);
    const icon = element(fixture).querySelector(".chat-greeting__icon");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");

    const iconDebug = fixture.debugElement.query(
      By.directive(ChatIconComponent),
    );
    const iconComponent = iconDebug.componentInstance as ChatIconComponent;
    expect(iconComponent.name()).toBe("box");
    expect(iconComponent.size()).toBe(30);
  });

  it("renders title and message overrides", () => {
    const fixture = mount({
      variant: "info",
      title: "Ask about shipments",
      message: "Attach an order export.",
    });
    const section = element(fixture).querySelector(
      ".chat-greeting",
    ) as HTMLElement;

    expect(section.getAttribute("aria-label")).toBe("Ask about shipments");
    expect(
      element(fixture).querySelector(".chat-greeting__title")?.textContent?.trim(),
    ).toBe("Ask about shipments");
    expect(
      element(fixture).querySelector(".chat-greeting__message")?.textContent?.trim(),
    ).toBe("Attach an order export.");
  });

  it("projects custom content into the card", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ChatGreetingHostComponent] });
    const fixture = TestBed.createComponent(ChatGreetingHostComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(".projected-content")?.textContent?.trim(),
    ).toBe("Projected content");
  });

  it("renders a link only when linkHref is provided and emits linkClick", () => {
    const withoutLink = mount();
    expect(
      element(withoutLink).querySelector(".chat-greeting__link"),
    ).toBeNull();

    const fixture = mount({
      linkHref: "https://example.test/help",
      linkLabel: "Open help",
    });
    const link = element(fixture).querySelector(
      ".chat-greeting__link",
    ) as HTMLAnchorElement;

    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("https://example.test/help");
    expect(link.textContent).toContain("Open help");

    const clicks: MouseEvent[] = [];
    fixture.componentInstance.linkClick.subscribe((event) => clicks.push(event));
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toBeInstanceOf(MouseEvent);
  });

  it("falls back to the default link label", () => {
    const fixture = mount({ linkHref: "https://example.test/help" });
    expect(
      element(fixture).querySelector(".chat-greeting__link")?.textContent?.trim(),
    ).toBe("Learn more");
  });

  it("toggles the animated class", () => {
    const animated = mount({ animated: true });
    expect(
      element(animated).querySelector(".chat-greeting")?.classList,
    ).toContain("chat-greeting--animated");

    const staticFixture = mount({ animated: false });
    expect(
      element(staticFixture).querySelector(".chat-greeting")?.classList,
    ).not.toContain("chat-greeting--animated");
  });
});
