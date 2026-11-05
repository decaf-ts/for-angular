import { ChatAgentStepComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  failed,
  running,
  succeeded,
  suspended,
  waiting,
} from "./chat-agent-step.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-agent-step.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Agent Step meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Agent Step");
    expect(stories.component).toBe(ChatAgentStepComponent);
    expect(succeeded).toBeDefined();
    expect(running).toBeDefined();
    expect(failed).toBeDefined();
    expect(suspended).toBeDefined();
    expect(waiting).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.name).toBe("Research agent");
    expect(metaArgs.agentId).toBe("agent-research");
    expect(metaArgs.status).toBe("success");
    expect(metaArgs.stepInput).toEqual({
      question: "Which orders are delayed?",
    });
    expect(metaArgs.stepOutput).toEqual({
      answer: "3 orders are delayed by more than 5 days.",
    });
    expect(metaArgs.error).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(succeeded)).toEqual({});
    expect(argsOf(running)).toMatchObject({
      status: "running",
      stepOutput: undefined,
    });
    expect(argsOf(failed)).toMatchObject({
      status: "failed",
      stepOutput: undefined,
      error: "The research agent could not reach the orders service.",
    });
    expect(argsOf(suspended)).toMatchObject({
      status: "suspended",
      stepOutput: undefined,
    });
    expect(argsOf(waiting)).toMatchObject({
      status: "waiting",
      stepInput: undefined,
      stepOutput: undefined,
    });
  });
});
