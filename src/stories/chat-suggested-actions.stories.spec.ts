import stories, { defaultState, customTitle, conversationStarted } from "./chat-suggested-actions.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-suggested-actions.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Suggested Actions host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Suggested Actions");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatSuggestedActionsHostComponent");
    expect(defaultState).toBeDefined();
    expect(customTitle).toBeDefined();
    expect(conversationStarted).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.suggestions).toHaveLength(4);
    expect(metaArgs.empty).toBe(true);
    expect(metaArgs.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(customTitle).title).toBe("Start with one of these");
    expect(argsOf(conversationStarted).empty).toBe(false);
  });
});
