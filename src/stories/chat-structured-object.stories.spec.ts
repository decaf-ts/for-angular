import { ChatStructuredObjectComponent } from "@decaf-ts/for-angular/agent";

import * as stories from "./chat-structured-object.stories";

const STORIES = [
  "committed",
  "streamingGhost",
  "withHistory",
  "rawJson",
  "empty",
  "compactEmpty",
];

describe("chat-structured-object.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Structured Object meta and component", () => {
    const meta = stories.default as any;
    expect(meta.title).toBe("Agent/Chat/Structured Object");
    expect(meta.component).toBe(ChatStructuredObjectComponent);
    expect(meta.args).toBeDefined();
  });

  it("exports every declared story with a renderable definition", () => {
    for (const name of STORIES) {
      const story = (stories as any)[name];
      expect(story).toBeDefined();
      expect(typeof story).toBe("object");
    }
  });

  it("wires at least one story-level argument override", () => {
    const overrides = STORIES.map((name) => (stories as any)[name]?.args ?? {}).filter(
      (args) => Object.keys(args).length > 0,
    );
    expect(overrides.length).toBeGreaterThan(0);
  });
});
