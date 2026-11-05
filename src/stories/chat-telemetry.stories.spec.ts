import { ChatTelemetryComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  collapsed,
  empty,
  expanded,
  singleRun,
} from "./chat-telemetry.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-telemetry.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Telemetry meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Telemetry");
    expect(stories.component).toBe(ChatTelemetryComponent);
    expect(collapsed).toBeDefined();
    expect(expanded).toBeDefined();
    expect(singleRun).toBeDefined();
    expect(empty).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.roundtrips).toHaveLength(3);
    expect(metaArgs.roundtrips.map((row: any) => row.status)).toEqual([
      "succeeded",
      "failed",
      "running",
    ]);
    expect(metaArgs.open).toBe(false);
    expect(metaArgs.title).toBeNull();
  });

  it("wires the per-story args", () => {
    expect(argsOf(collapsed)).toEqual({});
    expect(argsOf(expanded).open).toBe(true);
    expect(argsOf(singleRun)).toMatchObject({
      open: true,
      title: "Refund run",
    });
    expect(argsOf(singleRun).roundtrips).toHaveLength(1);
    expect(argsOf(empty)).toMatchObject({ open: true, roundtrips: [] });
  });
});
