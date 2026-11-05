import stories, {
  activeConversation,
  conversationList,
  drawerOpen,
  empty,
  loading,
  paginated,
} from "./chat-history.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-history.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/History meta and every story", () => {
    expect((stories as any).title).toBe("Agent/Chat/History");
    expect((stories as any).component).toBeDefined();
    expect(typeof (stories as any).component).toBe("function");
    expect((stories as any).component.name).toBe("ChatHistoryComponent");
    for (const story of [
      conversationList,
      activeConversation,
      paginated,
      drawerOpen,
      loading,
      empty,
    ]) {
      expect(story).toBeDefined();
    }
  });

  it("wires the five-entry history and default inputs", () => {
    const meta = (stories as any).args ?? {};

    expect(meta.entries).toHaveLength(5);
    expect(meta.entries[0].id).toBe("chat-quarterly");
    expect(meta.entries.map((entry: { visibility: string }) => entry.visibility)).toEqual([
      "private",
      "shared",
      "public",
      "private",
      "shared",
    ]);
    expect(meta.entries$).toBeNull();
    expect(meta.routes$).toBeNull();
    expect(meta.activeId).toBe("chat-quarterly");
    expect(meta.variant).toBe("panel");
    expect(meta.open).toBe(true);
    expect(meta.loading).toBe(false);
    expect(meta.pageSize).toBe(6);
    expect(meta.skeletonRows).toBe(4);
    expect(meta.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(conversationList)).toEqual({});
    expect(argsOf(activeConversation).activeId).toBe("chat-handbook");
    expect(argsOf(paginated).pageSize).toBe(2);
    expect(argsOf(drawerOpen).variant).toBe("drawer");
    expect(argsOf(drawerOpen).open).toBe(true);
    expect(argsOf(loading).loading).toBe(true);
    expect(argsOf(loading).skeletonRows).toBe(4);
    expect(argsOf(empty).entries).toEqual([]);
    expect(argsOf(empty).activeId).toBeNull();
  });
});
