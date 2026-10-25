import stories, { defaultState, imagesOnly, textOnly, empty } from "./chat-attachment-preview.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-attachment-preview.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Attachment Preview host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Attachment Preview");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatAttachmentPreviewHostComponent");
    expect(defaultState).toBeDefined();
    expect(imagesOnly).toBeDefined();
    expect(textOnly).toBeDefined();
    expect(empty).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.attachments).toHaveLength(3);
    expect(metaArgs.attachments.map((item: any) => item.id)).toEqual([
      "img-1",
      "txt-1",
      "pdf-1",
    ]);
  });

  it("wires the per-story args", () => {
    expect(argsOf(imagesOnly).attachments).toHaveLength(1);
    expect(argsOf(textOnly).attachments[0].mime).toBe("text/plain");
    expect(argsOf(empty).attachments).toEqual([]);
  });
});
