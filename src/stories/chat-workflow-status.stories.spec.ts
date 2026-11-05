import { ChatWorkflowStatusComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  defaultState,
  empty,
  failed,
} from "./chat-workflow-status.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-workflow-status.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Workflow Status meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Workflow Status");
    expect(stories.component).toBe(ChatWorkflowStatusComponent);
    expect(defaultState).toBeDefined();
    expect(failed).toBeDefined();
    expect(empty).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.steps).toHaveLength(5);
    expect(metaArgs.steps.map((step: any) => step.status)).toEqual([
      "success",
      "success",
      "running",
      "suspended",
      "waiting",
    ]);
    expect(metaArgs.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(defaultState)).toEqual({});
    expect(argsOf(failed).steps).toHaveLength(2);
    expect(argsOf(failed).steps[1]).toMatchObject({
      status: "failed",
      error: "The classification model returned malformed JSON.",
    });
    expect(argsOf(failed).title).toBe("Delayed order triage");
    expect(argsOf(empty).steps).toEqual([]);
    expect(argsOf(empty).title).toBeNull();
  });
});
