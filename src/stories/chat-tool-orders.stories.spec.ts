import { ChatToolOrdersComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  customTitle,
  defaultState,
  empty,
} from "./chat-tool-orders.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-tool-orders.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Tool Orders meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Tool Orders");
    expect(stories.component).toBe(ChatToolOrdersComponent);
    expect(defaultState).toBeDefined();
    expect(customTitle).toBeDefined();
    expect(empty).toBeDefined();
  });

  it("declares no meta-level default args", () => {
    expect(stories.args ?? {}).toEqual({});
  });

  it("wires the per-story args", () => {
    expect(argsOf(defaultState).orders).toHaveLength(3);
    expect(argsOf(defaultState).title).toBeNull();
    expect(argsOf(customTitle).orders).toHaveLength(2);
    expect(argsOf(customTitle).title).toBe("Delayed orders");
    expect(argsOf(empty).orders).toEqual([]);
    expect(argsOf(empty).title).toBeNull();
  });
});
