import { ChatToolWeatherComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  day,
  error as errorStory,
  fahrenheit,
  loading,
  night,
} from "./chat-tool-weather.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-tool-weather.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Tool Weather meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Tool Weather");
    expect(stories.component).toBe(ChatToolWeatherComponent);
    expect(day).toBeDefined();
    expect(night).toBeDefined();
    expect(fahrenheit).toBeDefined();
    expect(loading).toBeDefined();
    expect(errorStory).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.location).toBe("Lisbon");
    expect(metaArgs.condition).toBeNull();
    expect(metaArgs.high).toBe(24);
    expect(metaArgs.low).toBe(16);
    expect(metaArgs.unit).toBe("°C");
    expect(metaArgs.night).toBe(false);
    expect(metaArgs.state).toBe("success");
    expect(metaArgs.error).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(day)).toMatchObject({
      location: "Lisbon",
      high: 24,
      low: 16,
    });
    expect(argsOf(night)).toMatchObject({
      location: "Porto",
      condition: "Clear night",
      high: 15,
      low: 9,
      night: true,
    });
    expect(argsOf(fahrenheit)).toMatchObject({
      location: "New York",
      condition: "Partly cloudy",
      high: 68,
      low: 51,
      unit: "°F",
    });
    expect(argsOf(loading)).toMatchObject({ state: "loading", location: "Madrid" });
    expect(argsOf(errorStory)).toMatchObject({
      state: "error",
      location: "Madrid",
      error: "The weather provider did not respond.",
    });
  });
});
