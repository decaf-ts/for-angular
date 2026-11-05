import { ChatReasoningComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  collapsed,
  expanded,
  inline as inlineStory,
  streaming,
} from "./chat-reasoning.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-reasoning.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Reasoning meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Reasoning");
    expect(stories.component).toBe(ChatReasoningComponent);
    expect(collapsed).toBeDefined();
    expect(expanded).toBeDefined();
    expect(streaming).toBeDefined();
    expect(inlineStory).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.title).toBeNull();
    expect(typeof metaArgs.content).toBe("string");
    expect(metaArgs.open).toBe(false);
    expect(metaArgs.streaming).toBe(false);
    expect(metaArgs.inline).toBe(false);
    expect(metaArgs.meta).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(expanded).open).toBe(true);
    expect(argsOf(streaming)).toMatchObject({ streaming: true, meta: "0.8s" });
    expect(argsOf(inlineStory)).toMatchObject({
      title: "Why this query",
      inline: true,
      open: true,
      meta: "3 steps",
    });
  });
});
