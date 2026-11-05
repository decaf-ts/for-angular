import { ChatThinkingMessageComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  labelled,
  reducedMotion,
  singleLine,
  typing,
} from "./chat-thinking-message.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-thinking-message.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Thinking Message meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Thinking Message");
    expect(stories.component).toBe(ChatThinkingMessageComponent);
    expect(typing).toBeDefined();
    expect(singleLine).toBeDefined();
    expect(labelled).toBeDefined();
    expect(reducedMotion).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.label).toBeNull();
    expect(metaArgs.lines).toBe(2);
    expect(metaArgs.animated).toBe(true);
    expect(metaArgs.showAvatar).toBe(true);
    expect(metaArgs.avatarIcon).toBe("bot");
  });

  it("wires the per-story args", () => {
    expect(argsOf(singleLine).lines).toBe(1);
    expect(argsOf(labelled)).toMatchObject({
      label: "Searching the knowledge base…",
      lines: 3,
    });
    expect(argsOf(reducedMotion)).toMatchObject({
      animated: false,
      avatarIcon: "loader",
    });
  });
});
