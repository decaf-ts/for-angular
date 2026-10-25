import { ChatArtifactSkeletonComponent } from "@decaf-ts/for-angular/agent";

import * as stories from "./chat-artifact-skeleton.stories";

const STORIES = [
  "fullPanel",
  "inline",
  "longDocument",
  "customLabel",
];

describe("chat-artifact-skeleton.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Artifact Skeleton meta and component", () => {
    const meta = stories.default as any;
    expect(meta.title).toBe("Agent/Chat/Artifact Skeleton");
    expect(meta.component).toBe(ChatArtifactSkeletonComponent);
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
