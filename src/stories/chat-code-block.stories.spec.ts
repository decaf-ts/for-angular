import { ChatCodeBlockComponent } from "@decaf-ts/for-angular/agent";

import stories, {
  languageOnly,
  plainText,
  python,
  readOnly,
  typescript,
} from "./chat-code-block.stories";

function argsOf(story: unknown): any {
  return ((story as { args?: any })?.args ?? {}) as any;
}

describe("chat-code-block.stories — Storybook contract", () => {
  it("exposes the Agent/Chat/Code Block meta and every story", () => {
    expect(stories.title).toBe("Agent/Chat/Code Block");
    expect(stories.component).toBe(ChatCodeBlockComponent);
    expect(typescript).toBeDefined();
    expect(python).toBeDefined();
    expect(languageOnly).toBeDefined();
    expect(plainText).toBeDefined();
    expect(readOnly).toBeDefined();
  });

  it("wires the default args", () => {
    const metaArgs: any = stories.args ?? {};
    expect(typeof metaArgs.code).toBe("string");
    expect(metaArgs.language).toBe("ts");
    expect(metaArgs.filename).toBe("delayed-orders.ts");
    expect(metaArgs.title).toBeNull();
    expect(metaArgs.copyable).toBe(true);
    expect(metaArgs.highlight).toBe(true);
    expect(metaArgs.showHeader).toBe(true);
  });

  it("wires the per-story args", () => {
    expect(argsOf(python)).toMatchObject({
      language: "python",
      filename: "delayed_orders.py",
    });
    expect(argsOf(languageOnly).filename).toBeNull();
    expect(argsOf(plainText)).toMatchObject({
      language: null,
      filename: null,
      highlight: false,
    });
    expect(argsOf(readOnly).copyable).toBe(false);
  });
});
