import stories, {
  conversation,
  empty,
  running,
} from "./chat-conversation.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-conversation.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Conversation host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Conversation");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe(
      "ChatConversationHostComponent",
    );
    expect(conversation).toBeDefined();
    expect(empty).toBeDefined();
    expect(running).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(Array.isArray(metaArgs.messages)).toBe(true);
    expect((metaArgs.messages as unknown[]).length).toBe(4);
    expect(metaArgs.running).toBe(false);
    expect(metaArgs.downloadFilename).toBe("conversation.md");
  });

  it("wires the empty and running story args", () => {
    expect(argsOf(empty).messages).toEqual([]);
    expect(argsOf(running)).toMatchObject({ running: true });
    expect(Array.isArray(argsOf(running).messages)).toBe(true);
  });
});
