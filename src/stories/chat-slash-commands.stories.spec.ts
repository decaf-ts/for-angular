import stories, { defaultState, filtered, emptyResults, closed } from "./chat-slash-commands.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-slash-commands.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Slash Commands host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Slash Commands");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatSlashCommandsHostComponent");
    expect(defaultState).toBeDefined();
    expect(filtered).toBeDefined();
    expect(emptyResults).toBeDefined();
    expect(closed).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.commands).toHaveLength(4);
    expect(metaArgs.query).toBe("");
    expect(metaArgs.open).toBe(true);
  });

  it("wires the per-story args", () => {
    expect(argsOf(filtered).query).toBe("s");
    expect(argsOf(emptyResults).query).toBe("zzz");
    expect(argsOf(closed).open).toBe(false);
  });
});
