import stories, { privateConversation, sharedConversation, disabled } from "./chat-visibility-selector.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-visibility-selector.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Visibility Selector host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Visibility Selector");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatVisibilitySelectorHostComponent");
    expect(privateConversation).toBeDefined();
    expect(sharedConversation).toBeDefined();
    expect(disabled).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.visibility).toBe("private");
  });

  it("wires the per-story args", () => {
    expect(argsOf(sharedConversation).visibility).toBe("shared");
    expect(argsOf(disabled).disabled).toBe(true);
  });
});
