import { ChatArtifactConsoleComponent } from "@decaf-ts/for-angular/agent";

import * as stories from "./chat-artifact-console.stories";

const STORIES = [
  "output",
  "empty",
  "tallConsole",
  "fixedHeight",
  "errorsOnly",
];

describe("chat-artifact-console.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Artifact Console meta and component", () => {
    const meta = stories.default as any;
    expect(meta.title).toBe("Agent/Chat/Artifact Console");
    expect(meta.component).toBe(ChatArtifactConsoleComponent);
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
