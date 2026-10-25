import { ChatHeaderComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  defaultState,
  namespaces,
  noActions,
  telemetryOpen,
} from "./chat-header.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-header.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Header meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Header");
    expect(stories.component).toBe(ChatHeaderComponent);
    expect(defaultState).toBeDefined();
    expect(namespaces).toBeDefined();
    expect(telemetryOpen).toBeDefined();
    expect(noActions).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(metaArgs.titleKey).toBe("agent.chat.title");
    expect(metaArgs.titleFallback).toBe("Agent chat");
    expect(metaArgs.namespaces).toEqual([]);
    expect(metaArgs.showHistory).toBe(true);
    expect(metaArgs.showKnowledgeBase).toBe(true);
    expect(metaArgs.historyOpen).toBe(true);
    expect(metaArgs.knowledgeOpen).toBe(false);
    expect(metaArgs.telemetryOpen).toBe(false);
    expect(metaArgs.selectedKnowledgeCount).toBe(0);
  });

  it("wires the per-story args", () => {
    expect(argsOf(defaultState)).toEqual({});
    expect(argsOf(namespaces)).toEqual({
      namespaces: ["tenant:acme", "project:chat-demo", "role:analyst"],
      historyOpen: false,
      selectedKnowledgeCount: 2,
    });
    expect(argsOf(telemetryOpen)).toEqual({
      namespaces: ["tenant:acme"],
      telemetryOpen: true,
    });
    expect(argsOf(noActions)).toEqual({
      showHistory: false,
      showKnowledgeBase: false,
      telemetryOpen: true,
    });
  });
});
