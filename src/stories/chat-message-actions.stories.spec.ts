import stories, {
  assistant,
  disabledWhileRunning,
  hoverOnly,
  user,
} from "./chat-message-actions.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-message-actions.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Message Actions host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Message Actions");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe(
      "ChatMessageActionsHostComponent",
    );
    expect(assistant).toBeDefined();
    expect(user).toBeDefined();
    expect(disabledWhileRunning).toBeDefined();
    expect(hoverOnly).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.messageId).toBe("message-1");
    expect(metaArgs.role).toBe("assistant");
    expect(metaArgs.copyText).toBe("The quarterly revenue grew 12%.");
    expect(metaArgs.running).toBe(false);
    expect(metaArgs.persistent).toBe(true);
  });

  it("wires the per-story args", () => {
    expect(argsOf(user).role).toBe("user");
    expect(argsOf(disabledWhileRunning).running).toBe(true);
    expect(argsOf(hoverOnly).persistent).toBe(false);
  });
});
