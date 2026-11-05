import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatConsoleRow } from "../../types";
import { ChatArtifactConsoleComponent } from "./chat-artifact-console.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactConsoleComponent> {
  const fixture = TestBed.createComponent(ChatArtifactConsoleComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactConsoleComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function pointer(
  clientY: number,
  currentTarget?: HTMLElement,
): PointerEvent {
  return {
    clientY,
    pointerId: 1,
    preventDefault: jest.fn(),
    currentTarget: currentTarget ?? null,
  } as unknown as PointerEvent;
}

const ROWS: AgentChatConsoleRow[] = [
  { id: "1", level: "log", text: "booting", timestamp: "2026-01-01T00:00:00Z" },
  { id: "2", level: "warn", text: "slow" },
  { id: "3", level: "error", text: "boom" },
];

describe("ChatArtifactConsoleComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatArtifactConsoleComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the output rows in a live log region", () => {
    const fixture = mount({ rows: ROWS, title: "Build output" });
    const body = element(fixture).querySelector(
      ".chat-artifact-console__body",
    ) as HTMLElement;

    expect(body.getAttribute("role")).toBe("log");
    expect(body.getAttribute("aria-live")).toBe("polite");
    expect(
      element(fixture).querySelectorAll(".chat-artifact-console__row").length,
    ).toBe(3);
    expect(
      element(fixture).querySelector(".chat-artifact-console__title")
        ?.textContent,
    ).toContain("Build output");
    expect(
      element(fixture).querySelectorAll(".chat-artifact-console__row")[2]
        .getAttribute("data-level"),
    ).toBe("error");
  });

  it("renders the empty output state", () => {
    const fixture = mount();

    expect(
      element(fixture).querySelector(".chat-artifact-console__empty")
        ?.textContent,
    ).toContain("No output yet");
    expect(
      element(fixture).querySelector(".chat-artifact-console__count")
        ?.textContent,
    ).toContain("0");
  });

  it("applies the initial height with clamping", () => {
    const fixture = mount({ initialHeight: 260, minHeight: 100, maxHeight: 400 });

    expect(
      element(fixture)
        .querySelector(".chat-artifact-console")
        ?.getAttribute("style"),
    ).toContain("height: 260px");
    expect(fixture.componentInstance.height()).toBe(260);
  });

  it("clamps heights to the configured bounds", () => {
    const fixture = mount({ initialHeight: 999, minHeight: 120, maxHeight: 300 });
    expect(fixture.componentInstance.height()).toBe(300);

    fixture.componentRef.setInput("initialHeight", 10);
    fixture.detectChanges();
    expect(fixture.componentInstance.height()).toBe(120);
  });

  it("resizes by dragging the handle and emits the new height", () => {
    const fixture = mount({ initialHeight: 200, minHeight: 120, maxHeight: 400 });
    const emitted: number[] = [];
    fixture.componentInstance.heightChange.subscribe((height) =>
      emitted.push(height),
    );

    fixture.componentInstance.startResize(pointer(300));
    fixture.componentInstance.onResize(pointer(250));
    fixture.componentInstance.endResize();

    expect(fixture.componentInstance.height()).toBe(250);
    expect(emitted).toEqual([250]);
  });

  it("stops resizing after the pointer is released", () => {
    const fixture = mount({ initialHeight: 200 });
    fixture.componentInstance.startResize(pointer(300));
    fixture.componentInstance.endResize();
    fixture.componentInstance.onResize(pointer(100));

    expect(fixture.componentInstance.height()).toBe(200);
  });

  it("never resizes outside the min/max bounds", () => {
    const fixture = mount({ initialHeight: 200, minHeight: 150, maxHeight: 260 });

    fixture.componentInstance.startResize(pointer(200));
    fixture.componentInstance.onResize(pointer(0));
    expect(fixture.componentInstance.height()).toBe(260);

    fixture.componentInstance.onResize(pointer(1000));
    expect(fixture.componentInstance.height()).toBe(150);
  });

  it("supports keyboard resizing on the separator handle", () => {
    const fixture = mount({ initialHeight: 200, minHeight: 120, maxHeight: 400 });
    const handle = element(fixture).querySelector(
      ".chat-artifact-console__handle",
    ) as HTMLElement;
    const emitted: number[] = [];
    fixture.componentInstance.heightChange.subscribe((height) =>
      emitted.push(height),
    );

    expect(handle.getAttribute("role")).toBe("separator");
    expect(handle.getAttribute("aria-orientation")).toBe("horizontal");
    expect(handle.getAttribute("aria-valuemin")).toBe("120");
    expect(handle.getAttribute("aria-valuemax")).toBe("400");

    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));

    expect(emitted).toEqual([216, 200, 120, 400]);
    expect(fixture.componentInstance.height()).toBe(400);
  });

  it("emits cleared when the clear button is clicked", () => {
    const fixture = mount({ rows: ROWS });
    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => (cleared += 1));

    (
      element(fixture).querySelector(
        ".chat-artifact-console__clear",
      ) as HTMLButtonElement
    ).click();

    expect(cleared).toBe(1);
  });

  it("hides the resize handle and clear action when not requested", () => {
    const fixture = mount({ resizable: false, showClear: false, rows: ROWS });

    expect(
      element(fixture).querySelector(".chat-artifact-console__handle"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-artifact-console__clear"),
    ).toBeNull();
  });
});
