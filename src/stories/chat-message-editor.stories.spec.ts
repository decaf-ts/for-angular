import stories, {
  disabledWhileRunning,
  editingUserMessage,
  withoutMessage,
} from "./chat-message-editor.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-message-editor.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Message Editor host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Message Editor");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe(
      "ChatMessageEditorHostComponent",
    );
    expect(editingUserMessage).toBeDefined();
    expect(withoutMessage).toBeDefined();
    expect(disabledWhileRunning).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect((metaArgs.message as { id?: string }).id).toBe("message-1");
    expect(metaArgs.initialText).toBe("");
    expect(metaArgs.running).toBe(false);
  });

  it("wires the per-story args", () => {
    expect(argsOf(withoutMessage).message).toBeNull();
    expect(typeof argsOf(withoutMessage).initialText).toBe("string");
    expect(argsOf(disabledWhileRunning).running).toBe(true);
  });
});
