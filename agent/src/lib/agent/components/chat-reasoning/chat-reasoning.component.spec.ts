import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatReasoningComponent } from "./chat-reasoning.component";

@Component({
  standalone: true,
  imports: [ChatReasoningComponent],
  template: `
    <ngx-decaf-chat-reasoning [open]="true">
      <p class="projected-reasoning" chatReasoningContent>
        Projected reasoning
      </p>
    </ngx-decaf-chat-reasoning>
  `,
})
class ChatReasoningHostComponent {}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatReasoningComponent> {
  const fixture = TestBed.createComponent(ChatReasoningComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatReasoningComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("ChatReasoningComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatReasoningComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("is collapsed by default and wires aria-expanded/aria-controls", () => {
    const fixture = mount();
    const trigger = element(fixture).querySelector(
      ".chat-reasoning__trigger",
    ) as HTMLButtonElement;

    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe(
      fixture.componentInstance.contentId,
    );
    expect(
      element(fixture).querySelector(".chat-reasoning__content"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-reasoning__title")?.textContent?.trim(),
    ).toBe("Reasoning");
  });

  it("expands and collapses on trigger clicks, emitting toggle", () => {
    const fixture = mount({ content: "because", title: "Why" });
    const toggles: boolean[] = [];
    fixture.componentInstance.toggle.subscribe((open) =>
      toggles.push(open),
    );

    const trigger = element(fixture).querySelector(
      ".chat-reasoning__trigger",
    ) as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const content = element(fixture).querySelector(
      ".chat-reasoning__content",
    ) as HTMLElement;
    expect(content).not.toBeNull();
    expect(content.getAttribute("id")).toBe(fixture.componentInstance.contentId);
    expect(content.getAttribute("role")).toBe("region");
    expect(content.getAttribute("aria-label")).toBe("Why");
    expect(content.textContent).toContain("because");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    trigger.click();
    fixture.detectChanges();

    expect(toggles).toEqual([true, false]);
    expect(
      element(fixture).querySelector(".chat-reasoning__content"),
    ).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the open input in sync", () => {
    const fixture = mount();

    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();
    fixture.detectChanges();
    expect(
      element(fixture).querySelector(".chat-reasoning__content"),
    ).not.toBeNull();

    fixture.componentRef.setInput("open", false);
    fixture.detectChanges();
    fixture.detectChanges();
    expect(
      element(fixture).querySelector(".chat-reasoning__content"),
    ).toBeNull();
  });

  it("renders the streaming label and meta text", () => {
    const fixture = mount({ streaming: true, meta: "0.8s" });

    expect(
      element(fixture).querySelector(".chat-reasoning__streaming")?.textContent?.trim(),
    ).toBe("Thinking…");
    expect(
      element(fixture).querySelector(".chat-reasoning__meta")?.textContent?.trim(),
    ).toBe("0.8s");
  });

  it("distinguishes inline from standalone layouts", () => {
    const standalone = mount();
    expect(
      element(standalone).querySelector(".chat-reasoning")?.classList,
    ).toContain("chat-reasoning--standalone");
    expect(
      element(standalone).querySelector(".chat-reasoning")?.classList,
    ).not.toContain("chat-reasoning--inline");

    const inline = mount({ inline: true, open: true });
    expect(
      element(inline).querySelector(".chat-reasoning")?.classList,
    ).toContain("chat-reasoning--inline");
    expect(
      element(inline).querySelector(".chat-reasoning")?.classList,
    ).not.toContain("chat-reasoning--standalone");
  });

  it("renders projected content inside the expanded region", () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ChatReasoningHostComponent] });
    const fixture = TestBed.createComponent(ChatReasoningHostComponent);
    fixture.detectChanges();
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector(
      ".chat-reasoning__content",
    );
    expect(content).not.toBeNull();
    expect(
      content.querySelector(".projected-reasoning")?.textContent?.trim(),
    ).toBe("Projected reasoning");
  });
});
