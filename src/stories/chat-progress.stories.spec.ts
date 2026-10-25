import { ChatProgressComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  done,
  empty,
  indeterminate,
  running,
} from "./chat-progress.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-progress.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Progress meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Progress");
    expect(stories.component).toBe(ChatProgressComponent);
    expect(running).toBeDefined();
    expect(done).toBeDefined();
    expect(indeterminate).toBeDefined();
    expect(empty).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.events).toHaveLength(2);
    expect(metaArgs.events[0]).toMatchObject({
      label: "Reading knowledge base…",
      value: 2,
      total: 10,
    });
    expect(metaArgs.events[1]).toMatchObject({ value: 7, total: 10 });
  });

  it("wires the per-story args", () => {
    expect(argsOf(running)).toEqual({});
    expect(argsOf(done).events).toHaveLength(3);
    expect(argsOf(done).events[2]).toMatchObject({
      label: "Knowledge base ready",
      value: 10,
      total: 10,
      done: true,
    });
    expect(argsOf(indeterminate).events).toHaveLength(1);
    expect(argsOf(indeterminate).events[0].total).toBeUndefined();
    expect(argsOf(empty).events).toEqual([]);
  });
});
