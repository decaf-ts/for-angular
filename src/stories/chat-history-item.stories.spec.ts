import stories, {
  activeConversation,
  conversation,
  deleteWithoutConfirmation,
  deleting,
  previewOnly,
  publicConversation,
  sharedConversation,
} from "./chat-history-item.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-history-item.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/History/Item meta and every story", () => {
    expect((stories as any).title).toBe("Agent/Chat/History/Item");
    expect((stories as any).component).toBeDefined();
    expect(typeof (stories as any).component).toBe("function");
    expect((stories as any).component.name).toBe("ChatHistoryItemComponent");
    for (const story of [
      conversation,
      activeConversation,
      sharedConversation,
      publicConversation,
      previewOnly,
      deleteWithoutConfirmation,
      deleting,
    ]) {
      expect(story).toBeDefined();
    }
  });

  it("wires the default entry and inputs", () => {
    const meta = (stories as any).args ?? {};

    expect(meta.entry).toMatchObject({
      id: "chat-quarterly",
      title: "Quarterly revenue review",
      preview: "How did EMEA perform last quarter?",
      messageCount: 6,
      visibility: "private",
    });
    expect(meta.active).toBe(false);
    expect(meta.confirmDelete).toBe(true);
    expect(meta.deleting).toBe(false);
  });

  it("wires the per-story args", () => {
    expect(argsOf(conversation)).toEqual({});
    expect(argsOf(activeConversation).active).toBe(true);
    expect(argsOf(sharedConversation).entry.visibility).toBe("shared");
    expect(argsOf(sharedConversation).entry.sharedWith).toEqual([
      "ada@example.com",
      "linus@example.com",
    ]);
    expect(argsOf(publicConversation).entry.visibility).toBe("public");
    expect(argsOf(previewOnly).entry).toMatchObject({
      id: "chat-preview",
      title: "",
      preview: "First user message becomes the conversation title.",
      messageCount: 1,
    });
    expect(argsOf(deleteWithoutConfirmation).confirmDelete).toBe(false);
    expect(argsOf(deleting).deleting).toBe(true);
  });
});
