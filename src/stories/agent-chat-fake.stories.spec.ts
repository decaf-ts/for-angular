/**
 * @module for-angular/stories/agent-chat-fake.stories.spec
 * @summary Storybook contract for the fake-transport agent chat stories.
 * @description Proves the fake-transport story file is exposed with both
 * scripted scenarios, that the story args select the scenario and speed, and
 * that the story-scoped `AGENT_CHAT_TRANSPORT` provider resolves to the same
 * {@link AgentChatFakeTransport} instance the host injects.
 */
import { AGENT_CHAT_TRANSPORT, AgentChatFakeTransport } from "@decaf-ts/for-angular/agent";

import stories, {
  fakeStructuredObject,
  fakeTransportRoundtrip,
} from "./agent-chat-fake.stories";

interface StoryDecorator {
  (story: () => Record<string, unknown>): Record<string, unknown>;
}

interface ProviderEntry {
  provide?: unknown;
  useValue?: unknown;
  useExisting?: unknown;
}

function providersFromStories(): unknown[] {
  const providers: unknown[] = [];
  for (const decorator of (stories.decorators ?? []) as unknown as StoryDecorator[]) {
    const rendered = decorator(() => ({})) as {
      applicationConfig?: { providers?: unknown[] };
      moduleMetadata?: { providers?: unknown[] };
    };
    if (rendered.applicationConfig?.providers) {
      providers.push(...rendered.applicationConfig.providers);
    }
    if (rendered.moduleMetadata?.providers) {
      providers.push(...rendered.moduleMetadata.providers);
    }
  }
  return providers;
}

function providerFor(token: unknown): ProviderEntry | undefined {
  return providersFromStories().find(
    (entry): entry is ProviderEntry =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as ProviderEntry).provide === token,
  );
}

function argsOf(story: unknown): Record<string, unknown> {
  return ((story as { args?: Record<string, unknown> })?.args ?? {}) as Record<
    string,
    unknown
  >;
}

describe("agent-chat-fake.stories — Storybook contract", () => {
  it("exposes the fake-transport story host and both scenarios", () => {
    expect(stories.title).toBe("Agent/Chat (fake transport)");
    expect(stories.component).toBeDefined();
    expect(typeof stories.component).toBe("function");
    expect(
      (stories.component as { name?: string }).name,
    ).toBe("FakeAgentChatHostComponent");
    expect(fakeTransportRoundtrip).toBeDefined();
    expect(fakeStructuredObject).toBeDefined();
  });

  it("wires the scenario and speed args for each fake-transport story", () => {
    expect(argsOf(fakeTransportRoundtrip)).toMatchObject({
      scenario: "conversation",
      speed: 1.8,
    });
    expect(argsOf(fakeStructuredObject)).toMatchObject({
      scenario: "structured-object",
      speed: 1.8,
    });
    expect(stories.argTypes?.scenario).toMatchObject({
      control: "select",
      options: ["conversation", "structured-object"],
    });
  });

  it("installs the AgentChatFakeTransport as the story's transport provider", () => {
    const transportProvider = providerFor(AGENT_CHAT_TRANSPORT);
    expect(transportProvider).toBeDefined();
    expect(transportProvider?.useValue).toBeInstanceOf(AgentChatFakeTransport);

    const classProvider = providerFor(AgentChatFakeTransport);
    expect(classProvider).toBeDefined();
    expect(classProvider?.useValue).toBe(transportProvider?.useValue);
  });

  it("provides a fake transport that replays a deterministic run", async () => {
    const provider = providerFor(AGENT_CHAT_TRANSPORT);
    const transport = provider?.useValue as AgentChatFakeTransport;

    jest.useFakeTimers();
    try {
      const kinds: string[] = [];
      transport.demoEvents$.subscribe((event) => kinds.push(event.kind));
      const terminals: unknown[] = [];
      const descriptor = await transport.send(
        {
          message: "story contract",
          attachments: [],
          knowledgeSourceIds: [],
          sessionId: "fake-story-session",
          userId: null,
        },
        {
          onEvent: () => undefined,
          onTerminal: (envelope) => terminals.push(envelope),
          onError: () => undefined,
        },
      );

      expect(descriptor.runId).toBe("demo-run-1");
      expect(kinds[0]).toBe("reset");

      await jest.advanceTimersByTimeAsync(60_000);
      expect(terminals).toHaveLength(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
