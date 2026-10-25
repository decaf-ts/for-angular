import { ChatToolComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  collapsed,
  expanded,
  inputAvailable,
  inputStreaming,
  outputDenied,
  outputError,
} from "./chat-tool.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-tool.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Tool meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Tool");
    expect(stories.component).toBe(ChatToolComponent);
    expect(collapsed).toBeDefined();
    expect(expanded).toBeDefined();
    expect(inputStreaming).toBeDefined();
    expect(inputAvailable).toBeDefined();
    expect(outputError).toBeDefined();
    expect(outputDenied).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.name).toBe("queryOrders");
    expect(metaArgs.title).toBeNull();
    expect(metaArgs.state).toBe("output-available");
    expect(metaArgs.toolInput).toEqual({ status: "delayed", limit: 3 });
    expect(metaArgs.toolOutput).toMatchObject({ count: 3 });
    expect(metaArgs.error).toBeNull();
    expect(metaArgs.open).toBe(false);
  });

  it("wires the per-story args", () => {
    expect(argsOf(collapsed)).toEqual({});
    expect(argsOf(expanded).open).toBe(true);
    expect(argsOf(inputStreaming)).toMatchObject({
      state: "input-streaming",
      toolOutput: undefined,
      open: true,
    });
    expect(argsOf(inputAvailable)).toMatchObject({
      state: "input-available",
      toolOutput: undefined,
      open: true,
    });
    expect(argsOf(outputError)).toMatchObject({
      state: "output-error",
      toolOutput: undefined,
      error: "The orders backend timed out after 30 seconds.",
      open: true,
    });
    expect(argsOf(outputDenied)).toMatchObject({
      state: "output-denied",
      toolOutput: undefined,
      error: "The user denied access to the orders backend.",
      open: true,
    });
  });
});
