import stories, { defaultState, withDraft, running, disabled, keepsDraft } from "./chat-composer.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-composer.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Composer host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Composer");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatComposerHostComponent");
    expect(defaultState).toBeDefined();
    expect(withDraft).toBeDefined();
    expect(running).toBeDefined();
    expect(disabled).toBeDefined();
    expect(keepsDraft).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.value).toBe("");
    expect(metaArgs.running).toBe(false);
    expect(metaArgs.disabled).toBe(false);
    expect(metaArgs.clearOnSend).toBe(true);
    expect(metaArgs.placeholder).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(withDraft).value).toBe("Summarise the last three incidents");
    expect(argsOf(running).running).toBe(true);
    expect(argsOf(disabled).disabled).toBe(true);
    expect(argsOf(keepsDraft).clearOnSend).toBe(false);
  });
});
