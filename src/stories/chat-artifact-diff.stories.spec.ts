import { ChatArtifactDiffComponent } from "@decaf-ts/for-angular/agent";

import * as stories from "./chat-artifact-diff.stories";

const STORIES = [
  "sideBySide",
  "inline",
  "unchanged",
  "longDocument",
  "withoutToggle",
];

describe("chat-artifact-diff.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Artifact Diff meta and component", () => {
    const meta = stories.default as any;
    expect(meta.title).toBe("Agent/Chat/Artifact Diff");
    expect(meta.component).toBe(ChatArtifactDiffComponent);
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
