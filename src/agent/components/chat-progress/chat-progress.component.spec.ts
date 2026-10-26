import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import type { AgentChatProgressEvent } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatProgressComponent } from "./chat-progress.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatProgressComponent> {
  const fixture = TestBed.createComponent(ChatProgressComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatProgressComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function root(fixture: ComponentFixture<ChatProgressComponent>): HTMLElement {
  return element(fixture).querySelector(".chat-progress") as HTMLElement;
}

function iconName(fixture: ComponentFixture<ChatProgressComponent>): string {
  return fixture.debugElement.query(By.directive(ChatIconComponent))
    .componentInstance.name();
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatProgressComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatProgressComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("exposes the live status accessibility contract", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Indexing", value: 1, total: 10 }],
    });

    expect(root(fixture).getAttribute("role")).toBe("status");
    expect(root(fixture).getAttribute("aria-live")).toBe("polite");
  });

  it("renders only the latest event", () => {
    const events: AgentChatProgressEvent[] = [
      {
        id: "e1",
        label: "Old label",
        value: 2,
        total: 10,
        message: "2 of 10 documents indexed.",
      },
      {
        id: "e2",
        label: "New label",
        value: 7,
        total: 10,
        message: "7 of 10 documents indexed.",
      },
    ];
    const fixture = mount({ events });

    expect(
      normalize(
        element(fixture).querySelector(".chat-progress__label")?.textContent,
      ),
    ).toBe("New label");
    expect(
      normalize(
        element(fixture).querySelector(".chat-progress__message")?.textContent,
      ),
    ).toBe("7 of 10 documents indexed.");
    expect(
      element(fixture).querySelector(".chat-progress__percent")?.textContent?.trim(),
    ).toBe("70%");
  });

  it("rounds the percentage and clamps it to 0..100", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Indexing", value: 1, total: 3 }],
    });
    const percent = () =>
      element(fixture).querySelector(".chat-progress__percent")?.textContent?.trim();

    expect(percent()).toBe("33%");

    fixture.componentRef.setInput("events", [
      { id: "e", label: "Indexing", value: 999, total: 10 },
    ]);
    fixture.detectChanges();
    expect(percent()).toBe("100%");

    fixture.componentRef.setInput("events", [
      { id: "e", label: "Indexing", value: -5, total: 10 },
    ]);
    fixture.detectChanges();
    expect(percent()).toBe("0%");
  });

  it("renders no progress bar when total is missing or zero", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Thinking…" }],
    });

    expect(element(fixture).querySelector(".chat-progress__track")).toBeNull();
    expect(element(fixture).querySelector(".chat-progress__percent")).toBeNull();

    fixture.componentRef.setInput("events", [
      { id: "e", label: "Thinking…", value: 1, total: 0 },
    ]);
    fixture.detectChanges();
    expect(element(fixture).querySelector(".chat-progress__track")).toBeNull();
  });

  it("wires the progressbar range attributes", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Indexing", value: 5, total: 10 }],
    });
    const track = element(fixture).querySelector(
      ".chat-progress__track",
    ) as HTMLElement;

    expect(track.getAttribute("role")).toBe("progressbar");
    expect(track.getAttribute("aria-valuemin")).toBe("0");
    expect(track.getAttribute("aria-valuemax")).toBe("100");
    expect(track.getAttribute("aria-valuenow")).toBe("50");
    expect(track.getAttribute("aria-label")).toBe("Indexing");
    expect(
      (element(fixture).querySelector(".chat-progress__fill") as HTMLElement)
        .style.width,
    ).toBe("50%");
  });

  it("derives the progressbar aria-label from the resolved event label", () => {
    translate.dictionary["agent.chat.progress.custom"] = "Indexando documentos";
    const fixture = mount({
      events: [
        {
          id: "e",
          labelKey: "agent.chat.progress.custom",
          label: "Indexing documents",
          value: 5,
          total: 10,
        },
      ],
    });
    const track = element(fixture).querySelector(
      ".chat-progress__track",
    ) as HTMLElement;

    expect(track.getAttribute("aria-label")).toBe("Indexando documentos");
  });

  it("shows a spinner until done and a check afterwards", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Indexing", value: 5, total: 10 }],
    });

    expect(root(fixture).getAttribute("data-done")).toBeNull();
    expect(iconName(fixture)).toBe("loader");

    fixture.componentRef.setInput("events", [
      { id: "e", label: "Indexing", value: 5, total: 10, done: true },
    ]);
    fixture.detectChanges();

    expect(root(fixture).getAttribute("data-done")).toBe("true");
    expect(iconName(fixture)).toBe("check");
  });

  it("treats 100 percent as done even without the done flag", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Indexing", value: 10, total: 10 }],
    });

    expect(root(fixture).getAttribute("data-done")).toBe("true");
    expect(iconName(fixture)).toBe("check");
  });

  it("resolves the label key through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.progress.custom"] = "Indexando documentos";
    const fixture = mount({
      events: [
        {
          id: "e",
          labelKey: "agent.chat.progress.custom",
          label: "Indexing documents",
        },
      ],
    });

    expect(
      normalize(
        element(fixture).querySelector(".chat-progress__label")?.textContent,
      ),
    ).toBe("Indexando documentos");
  });

  it("falls back to the event label when the key is missing", () => {
    const fixture = mount({
      events: [{ id: "e", label: "Indexing documents" }],
    });

    expect(
      normalize(
        element(fixture).querySelector(".chat-progress__label")?.textContent,
      ),
    ).toBe("Indexing documents");
  });

  it("renders the empty state with no events", () => {
    const fixture = mount({ events: [] });

    expect(
      normalize(
        element(fixture).querySelector(".chat-progress__empty")?.textContent,
      ),
    ).toBe("Waiting for progress…");
  });

  it("resolves the empty state through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.progress.empty"] =
      "À espera de progresso…";
    const fixture = mount({ events: [] });

    expect(
      normalize(
        element(fixture).querySelector(".chat-progress__empty")?.textContent,
      ),
    ).toBe("À espera de progresso…");
  });
});
