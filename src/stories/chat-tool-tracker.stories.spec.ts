import { ChatToolTrackerComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  cancelled,
  customProgress,
  delivered,
  ordered,
  shipped,
} from "./chat-tool-tracker.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-tool-tracker.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Tool Tracker meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Tool Tracker");
    expect(stories.component).toBe(ChatToolTrackerComponent);
    expect(ordered).toBeDefined();
    expect(shipped).toBeDefined();
    expect(delivered).toBeDefined();
    expect(cancelled).toBeDefined();
    expect(customProgress).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.status).toBe("shipped");
    expect(metaArgs.progress).toBeNull();
    expect(metaArgs.label).toBeNull();
    expect(metaArgs.description).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(ordered)).toEqual({ status: "ordered" });
    expect(argsOf(shipped)).toEqual({ status: "shipped" });
    expect(argsOf(delivered)).toEqual({ status: "delivered" });
    expect(argsOf(cancelled)).toEqual({ status: "cancelled" });
    expect(argsOf(customProgress)).toMatchObject({
      status: "shipped",
      progress: 88,
      label: "88% · Arriving tomorrow",
      description: "The parcel reached the local distribution centre.",
    });
  });
});
