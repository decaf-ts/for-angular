import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslateService } from "@ngx-translate/core";

import { ChatHeaderComponent } from "./chat-header.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatHeaderComponent> {
  const fixture = TestBed.createComponent(ChatHeaderComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatHeaderComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function actions(
  fixture: ComponentFixture<ChatHeaderComponent>,
): HTMLButtonElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-header__action"),
  ) as HTMLButtonElement[];
}

function action(
  fixture: ComponentFixture<ChatHeaderComponent>,
  label: string,
): HTMLButtonElement {
  const button = actions(fixture).find((candidate) =>
    normalize(candidate.textContent).includes(label),
  );
  expect(button).toBeDefined();
  return button as HTMLButtonElement;
}

describe("ChatHeaderComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatHeaderComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the h2 title from the fallback when the key is missing", () => {
    const fixture = mount();

    const title = element(fixture).querySelector(".chat-header__title");
    expect(title?.tagName).toBe("H2");
    expect(title?.textContent?.trim()).toBe("Agent chat");
  });

  it("resolves a custom title key through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.custom"] = "Assistente";
    const fixture = mount({
      titleKey: "agent.chat.custom",
      titleFallback: "Custom chat",
    });

    expect(
      element(fixture).querySelector(".chat-header__title")?.textContent?.trim(),
    ).toBe("Assistente");
  });

  it("renders a custom fallback when the key is missing", () => {
    const fixture = mount({
      titleKey: "agent.chat.missing",
      titleFallback: "Support chat",
    });

    expect(
      element(fixture).querySelector(".chat-header__title")?.textContent?.trim(),
    ).toBe("Support chat");
  });

  it("renders no namespace chips when the namespace list is empty", () => {
    const fixture = mount({ namespaces: [] });

    expect(element(fixture).querySelector(".chat-header__namespaces")).toBeNull();
    expect(element(fixture).querySelectorAll(".chat-header__namespace-chip")).toHaveLength(
      0,
    );
  });

  it("renders one chip per namespace with the namespaces label", () => {
    const fixture = mount({
      namespaces: ["tenant:acme", "role:analyst"],
    });
    const region = element(fixture).querySelector(
      ".chat-header__namespaces",
    ) as HTMLElement;

    expect(region).not.toBeNull();
    expect(region.getAttribute("role")).toBe("note");
    expect(region.getAttribute("aria-label")).toBe("Required namespaces");
    expect(
      normalize(
        element(fixture).querySelector(".chat-header__namespaces-label")
          ?.textContent,
      ),
    ).toBe("Namespaces");
    expect(
      Array.from(
        element(fixture).querySelectorAll(".chat-header__namespace-chip"),
      ).map((chip) => chip.textContent?.trim()),
    ).toEqual(["tenant:acme", "role:analyst"]);
  });

  it("resolves the namespaces label through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.namespaces.label"] =
      "Namespaces necessários";
    const fixture = mount({ namespaces: ["ns-a"] });

    expect(
      normalize(
        element(fixture).querySelector(".chat-header__namespaces-label")
          ?.textContent,
      ),
    ).toBe("Namespaces necessários");
    expect(
      element(fixture).querySelector(".chat-header__namespaces")?.getAttribute(
        "aria-label",
      ),
    ).toBe("Namespaces necessários");
  });

  it("always renders the telemetry action", () => {
    const fixture = mount({ showHistory: false, showKnowledgeBase: false });

    expect(actions(fixture)).toHaveLength(1);
    expect(normalize(action(fixture, "Telemetry").textContent)).toBe("Telemetry");
  });

  it("gates the history action on showHistory", () => {
    const shown = mount({ showHistory: true });
    expect(
      actions(shown).some((button) =>
        normalize(button.textContent).includes("Chat history"),
      ),
    ).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ChatHeaderComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
    const hidden = mount({ showHistory: false });
    expect(
      actions(hidden).some((button) =>
        normalize(button.textContent).includes("Chat history"),
      ),
    ).toBe(false);
  });

  it("gates the knowledge action on showKnowledgeBase", () => {
    const shown = mount({ showKnowledgeBase: true });
    expect(
      actions(shown).some((button) =>
        normalize(button.textContent).includes("Knowledge base"),
      ),
    ).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ChatHeaderComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
    const hidden = mount({ showKnowledgeBase: false });
    expect(
      actions(hidden).some((button) =>
        normalize(button.textContent).includes("Knowledge base"),
      ),
    ).toBe(false);
  });

  it("reflects the history open state through aria-expanded and aria-pressed", () => {
    const fixture = mount({ historyOpen: true });
    const history = action(fixture, "Chat history");

    expect(history.getAttribute("aria-expanded")).toBe("true");
    expect(history.getAttribute("aria-pressed")).toBe("true");

    fixture.componentRef.setInput("historyOpen", false);
    fixture.detectChanges();

    expect(history.getAttribute("aria-expanded")).toBe("false");
    expect(history.getAttribute("aria-pressed")).toBe("false");
  });

  it("reflects the telemetry open state through aria-expanded and aria-pressed", () => {
    const fixture = mount({ telemetryOpen: false });
    const telemetry = action(fixture, "Telemetry");

    expect(telemetry.getAttribute("aria-expanded")).toBe("false");
    expect(telemetry.getAttribute("aria-pressed")).toBe("false");

    fixture.componentRef.setInput("telemetryOpen", true);
    fixture.detectChanges();

    expect(telemetry.getAttribute("aria-expanded")).toBe("true");
    expect(telemetry.getAttribute("aria-pressed")).toBe("true");
    expect(normalize(telemetry.textContent)).toBe("Telemetry");
  });

  it("reflects the knowledge open state through aria-expanded", () => {
    const fixture = mount({ knowledgeOpen: false });
    const knowledge = action(fixture, "Knowledge base");

    expect(knowledge.getAttribute("aria-expanded")).toBe("false");

    fixture.componentRef.setInput("knowledgeOpen", true);
    fixture.detectChanges();

    expect(knowledge.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders the knowledge badge only when a selection exists", () => {
    const fixture = mount({ selectedKnowledgeCount: 0 });

    expect(element(fixture).querySelector(".chat-header__badge")).toBeNull();

    fixture.componentRef.setInput("selectedKnowledgeCount", 3);
    fixture.detectChanges();

    expect(
      element(fixture).querySelector(".chat-header__badge")?.textContent?.trim(),
    ).toBe("3");
  });

  it("emits historyToggle when the history action is clicked", () => {
    const fixture = mount();
    const emitted: void[] = [];
    fixture.componentInstance.historyToggle.subscribe((value) =>
      emitted.push(value),
    );

    action(fixture, "Chat history").click();

    expect(emitted).toHaveLength(1);
  });

  it("emits knowledgeBaseOpen when the knowledge action is clicked", () => {
    const fixture = mount();
    const emitted: void[] = [];
    fixture.componentInstance.knowledgeBaseOpen.subscribe((value) =>
      emitted.push(value),
    );

    action(fixture, "Knowledge base").click();

    expect(emitted).toHaveLength(1);
  });

  it("emits telemetryToggle when the telemetry action is clicked", () => {
    const fixture = mount();
    const emitted: void[] = [];
    fixture.componentInstance.telemetryToggle.subscribe((value) =>
      emitted.push(value),
    );

    action(fixture, "Telemetry").click();

    expect(emitted).toHaveLength(1);
  });
});
