import { ChatGreetingComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  greeting,
  infoCard,
  infoCardWithLink,
  staticCard,
} from "./chat-greeting.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-greeting.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Greeting meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Greeting");
    expect(stories.component).toBe(ChatGreetingComponent);
    expect(greeting).toBeDefined();
    expect(infoCard).toBeDefined();
    expect(infoCardWithLink).toBeDefined();
    expect(staticCard).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.variant).toBe("greeting");
    expect(metaArgs.title).toBeNull();
    expect(metaArgs.message).toBeNull();
    expect(metaArgs.icon).toBe("sparkles");
    expect(metaArgs.iconSize).toBe(28);
    expect(metaArgs.linkHref).toBeNull();
    expect(metaArgs.animated).toBe(true);
  });

  it("wires the per-story args", () => {
    expect(argsOf(infoCard)).toMatchObject({ variant: "info", icon: "box" });
    expect(argsOf(infoCardWithLink)).toMatchObject({
      variant: "info",
      icon: "file",
      linkHref: "https://example.com/knowledge-base",
    });
    expect(argsOf(staticCard).animated).toBe(false);
  });
});
