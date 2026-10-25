import { ChatArtifactEditorComponent } from "@decaf-ts/for-angular/agent";

import * as stories from "./chat-artifact-editor.stories";

const STORIES = [
  "codeEditor",
  "textEditor",
  "sheetEditor",
  "readOnly",
  "imageEditor",
  "emptyImage",
];

describe("chat-artifact-editor.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Artifact Editor meta and component", () => {
    const meta = stories.default as any;
    expect(meta.title).toBe("Agent/Chat/Artifact Editor");
    expect(meta.component).toBe(ChatArtifactEditorComponent);
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
