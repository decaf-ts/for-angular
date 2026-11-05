import stories, { image, text, fallbackFile, imageWithoutUrl } from "./chat-attachment-part.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-attachment-part.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Attachment Part host meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Attachment Part");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect((stories.component as { name?: string }).name).toBe("ChatAttachmentPartHostComponent");
    expect(image).toBeDefined();
    expect(text).toBeDefined();
    expect(fallbackFile).toBeDefined();
    expect(imageWithoutUrl).toBeDefined();
  });

  it("wires the host args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.attachment.id).toBe("att-img");
    expect(metaArgs.attachment.mime).toBe("image/png");
  });

  it("wires the per-story args", () => {
    expect(argsOf(text).attachment.mime).toBe("text/plain");
    expect(argsOf(fallbackFile).attachment.mime).toBe("application/pdf");
    expect(argsOf(imageWithoutUrl).attachment.url).toBeUndefined();
  });
});
