import { ChatIconComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  attachment,
  bot,
  labelled,
  loader,
  user,
} from "./chat-icon.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-icon.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Icon meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Icon");
    expect(stories.component).toBe(ChatIconComponent);
    expect(bot).toBeDefined();
    expect(user).toBeDefined();
    expect(attachment).toBeDefined();
    expect(loader).toBeDefined();
    expect(labelled).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.name).toBe("bot");
    expect(metaArgs.size).toBe(20);
    expect(metaArgs.strokeWidth).toBe(1.75);
    expect(metaArgs.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(user).name).toBe("user");
    expect(argsOf(attachment).name).toBe("attachment");
    expect(argsOf(loader)).toMatchObject({ name: "loader", size: 28 });
    expect(argsOf(labelled)).toMatchObject({
      name: "send",
      title: "Send message",
      size: 24,
    });
  });
});
