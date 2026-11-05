import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { TranslateService } from "@ngx-translate/core";

import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatToolWeatherComponent } from "./chat-tool-weather.component";

class FakeTranslateService {
  readonly dictionary: Record<string, string> = {};

  instant(key: string): string {
    return this.dictionary[key] ?? key;
  }
}

let translate: FakeTranslateService;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatToolWeatherComponent> {
  const fixture = TestBed.createComponent(ChatToolWeatherComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatToolWeatherComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function root(
  fixture: ComponentFixture<ChatToolWeatherComponent>,
): HTMLElement {
  return element(fixture).querySelector(".chat-tool-weather") as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

describe("ChatToolWeatherComponent", () => {
  beforeEach(() => {
    translate = new FakeTranslateService();
    TestBed.configureTestingModule({
      imports: [ChatToolWeatherComponent],
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the day SVG variant by default and the night variant when night", () => {
    const day = mount({ location: "Lisbon", high: 24, low: 16 });
    expect(root(day).getAttribute("data-variant")).toBe("day");
    expect(
      element(day).querySelector(".chat-tool-weather__icon svg circle"),
    ).not.toBeNull();

    const night = mount({ location: "Porto", night: true, high: 15, low: 9 });
    expect(root(night).getAttribute("data-variant")).toBe("night");
    expect(
      element(night).querySelector(".chat-tool-weather__icon svg circle"),
    ).toBeNull();
  });

  it("renders high and low temperatures with the unit", () => {
    const fixture = mount({ location: "Lisbon", high: 24, low: 16, unit: "°F" });
    const temperatures = Array.from(
      element(fixture).querySelectorAll(".chat-tool-weather__temperature"),
    ) as HTMLElement[];

    expect(temperatures).toHaveLength(2);
    expect(normalize(temperatures[0].querySelector("dt")?.textContent)).toBe(
      "High",
    );
    expect(normalize(temperatures[0].querySelector("dd")?.textContent)).toBe(
      "24°F",
    );
    expect(normalize(temperatures[1].querySelector("dt")?.textContent)).toBe(
      "Low",
    );
    expect(normalize(temperatures[1].querySelector("dd")?.textContent)).toBe(
      "16°F",
    );
  });

  it("renders an explicit condition verbatim", () => {
    const fixture = mount({
      location: "New York",
      condition: "Partly cloudy",
      high: 68,
      low: 51,
      unit: "°F",
    });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-weather__condition")
          ?.textContent,
      ),
    ).toBe("Partly cloudy");
  });

  it("falls back to the day and night condition keys", () => {
    const day = mount({ location: "Lisbon" });
    expect(
      normalize(
        element(day).querySelector(".chat-tool-weather__condition")?.textContent,
      ),
    ).toBe("Sunny");

    const night = mount({ location: "Porto", night: true });
    expect(
      normalize(
        element(night).querySelector(".chat-tool-weather__condition")
          ?.textContent,
      ),
    ).toBe("Clear night");
  });

  it("resolves the fallback condition through AgentTranslateFallbackPipe", () => {
    translate.dictionary["agent.chat.tool.weather.condition.night"] =
      "Noite limpa";
    const fixture = mount({ location: "Porto", night: true });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-weather__condition")
          ?.textContent,
      ),
    ).toBe("Noite limpa");
  });

  it("renders the loading state with a loader, text and aria-busy", () => {
    const fixture = mount({ location: "Madrid", state: "loading" });

    expect(root(fixture).getAttribute("data-state")).toBe("loading");
    expect(root(fixture).getAttribute("aria-busy")).toBe("true");
    expect(
      element(fixture).querySelector(".chat-tool-weather__loading")?.getAttribute(
        "role",
      ),
    ).toBe("status");
    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-weather__loading")
          ?.textContent,
      ),
    ).toBe("Fetching the forecast…");
    expect(
      fixture.debugElement
        .queryAll(By.directive(ChatIconComponent))
        .map((icon) => icon.componentInstance.name()),
    ).toContain("loader");
    expect(element(fixture).querySelector(".chat-tool-weather__temperatures")).toBeNull();
    expect(
      element(fixture).querySelector(".chat-tool-weather__condition"),
    ).toBeNull();
  });

  it("renders the error state with the provided message", () => {
    const fixture = mount({
      location: "Madrid",
      state: "error",
      error: "The weather provider did not respond.",
    });
    const error = element(fixture).querySelector(
      ".chat-tool-weather__error",
    ) as HTMLElement;

    expect(root(fixture).getAttribute("data-state")).toBe("error");
    expect(root(fixture).getAttribute("aria-busy")).toBeNull();
    expect(error.getAttribute("role")).toBe("alert");
    expect(normalize(error.textContent)).toBe(
      "The weather provider did not respond.",
    );
    expect(element(fixture).querySelector(".chat-tool-weather__temperatures")).toBeNull();
  });

  it("falls back to the generic error message when none is provided", () => {
    const fixture = mount({ location: "Madrid", state: "error" });

    expect(
      normalize(
        element(fixture).querySelector(".chat-tool-weather__error")?.textContent,
      ),
    ).toBe("The forecast is unavailable right now.");
  });

  it("exposes a descriptive aria label including the location", () => {
    const fixture = mount({ location: "Lisbon" });

    expect(root(fixture).getAttribute("aria-label")).toBe("Weather — Lisbon");
  });
});
