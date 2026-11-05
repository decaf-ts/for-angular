import stories, { defaultState, imagesOnly, singleFile, disabled } from "./chat-attachment-input.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-attachment-input.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Attachment Input host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Attachment Input");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatAttachmentInputHostComponent");
    expect(defaultState).toBeDefined();
    expect(imagesOnly).toBeDefined();
    expect(singleFile).toBeDefined();
    expect(disabled).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.accept).toEqual(["image/*", "text/*"]);
    expect(metaArgs.multiple).toBe(true);
    expect(metaArgs.disabled).toBe(false);
  });

  it("wires the per-story args", () => {
    expect(argsOf(imagesOnly).accept).toEqual(["image/*"]);
    expect(argsOf(singleFile).multiple).toBe(false);
    expect(argsOf(disabled).disabled).toBe(true);
  });
});
