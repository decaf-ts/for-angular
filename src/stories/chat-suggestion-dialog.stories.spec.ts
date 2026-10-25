import stories, { openSuggestion, customCopy } from "./chat-suggestion-dialog.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-suggestion-dialog.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Suggestion Dialog host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Suggestion Dialog");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatSuggestionDialogHostComponent");
    expect(openSuggestion).toBeDefined();
    expect(customCopy).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.open).toBe(true);
    expect(metaArgs.suggestion).toBe("Q4 revenue review and renewal risks");
    expect(metaArgs.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(customCopy).title).toBe("Rewrite chat title?");
    expect(argsOf(customCopy).suggestion).toBe(
      "Quarterly revenue and EMEA renewals",
    );
  });
});
