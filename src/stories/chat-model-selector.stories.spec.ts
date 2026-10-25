import stories, { defaultState, noSelection, noModels } from "./chat-model-selector.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-model-selector.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Model Selector host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Model Selector");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatModelSelectorHostComponent");
    expect(defaultState).toBeDefined();
    expect(noSelection).toBeDefined();
    expect(noModels).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.models).toHaveLength(3);
    expect(metaArgs.model).toBe("gpt-5");
  });

  it("wires the per-story args", () => {
    expect(argsOf(noSelection).model).toBeNull();
    expect(argsOf(noModels).models).toEqual([]);
  });
});
