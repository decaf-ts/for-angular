import { ChatMessageComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  assistant,
  error as errorStory,
  pending,
  streaming,
  system,
  user,
  withAttachments,
  withNestedParts,
} from "./chat-message.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-message.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Message meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Message");
    expect(stories.component).toBe(ChatMessageComponent);
    expect(assistant).toBeDefined();
    expect(user).toBeDefined();
    expect(streaming).toBeDefined();
    expect(withNestedParts).toBeDefined();
    expect(withAttachments).toBeDefined();
    expect(system).toBeDefined();
    expect(errorStory).toBeDefined();
    expect(pending).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.role).toBe("assistant");
    expect(typeof metaArgs.content).toBe("string");
    expect(metaArgs.attachments).toEqual([]);
    expect(metaArgs.parts).toEqual([]);
    expect(metaArgs.actions).toEqual([]);
    expect(metaArgs.streaming).toBe(false);
    expect(metaArgs.pending).toBe(false);
    expect(metaArgs.avatar).toBe("default");
  });

  it("wires the per-story args", () => {
    expect(argsOf(user).role).toBe("user");
    expect(argsOf(streaming).streaming).toBe(true);
    expect(argsOf(system).role).toBe("system");
    expect(argsOf(errorStory).role).toBe("error");
    expect(argsOf(pending).pending).toBe(true);
    expect((argsOf(withNestedParts).parts as unknown[]).length).toBe(5);
    expect((argsOf(withAttachments).attachments as unknown[]).length).toBe(2);
  });
});
