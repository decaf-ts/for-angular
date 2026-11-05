import { ChatNestedAgentComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  deeplyNested,
  streaming,
  succeeded,
  withToolErrors,
} from "./chat-nested-agent.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-nested-agent.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Nested Agent meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Nested Agent");
    expect(stories.component).toBe(ChatNestedAgentComponent);
    expect(succeeded).toBeDefined();
    expect(streaming).toBeDefined();
    expect(withToolErrors).toBeDefined();
    expect(deeplyNested).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.name).toBe("Refund sub-agent");
    expect(metaArgs.runId).toBe("run-nested-42");
    expect(metaArgs.depth).toBe(1);
    expect(metaArgs.ancestry).toEqual(["supervisor", "refunds"]);
    expect(typeof metaArgs.text).toBe("string");
    expect(metaArgs.streaming).toBe(false);
    expect(metaArgs.status).toBe("success");
    expect(metaArgs.toolErrors).toEqual([]);
  });

  it("wires the per-story args", () => {
    expect(argsOf(succeeded)).toEqual({});
    expect(argsOf(streaming)).toMatchObject({
      status: "running",
      streaming: true,
      text: "I checked the refund policy and two orders",
    });
    expect(argsOf(withToolErrors).status).toBe("failed");
    expect(argsOf(withToolErrors).toolErrors).toHaveLength(2);
    expect(argsOf(withToolErrors).toolErrors[0]).toMatchObject({
      toolName: "refundOrders",
      message: "The payments service rejected the refund request.",
    });
    expect(argsOf(deeplyNested)).toMatchObject({
      name: "Policy verifier",
      runId: "run-nested-57",
      depth: 4,
      ancestry: ["supervisor", "refunds", "policy", "verify"],
      text: "The refund falls inside the 30-day window.",
    });
  });
});
