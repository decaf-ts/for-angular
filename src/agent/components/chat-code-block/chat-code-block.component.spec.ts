import { ComponentFixture, TestBed } from "@angular/core/testing";

import {
  ChatCodeBlockComponent,
  tokenizeAgentChatCode,
} from "./chat-code-block.component";

const TYPESCRIPT = `const total = 3; // note
const ready = true;
const name = "Ada";`;

const PYTHON = `def greet(name): # note
    return "hi"`;

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatCodeBlockComponent> {
  const fixture = TestBed.createComponent(ChatCodeBlockComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatCodeBlockComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function headerTitle(fixture: ComponentFixture<ChatCodeBlockComponent>): string {
  return (
    element(fixture).querySelector(".chat-code-block__title")?.textContent?.trim() ??
    ""
  );
}

describe("ChatCodeBlockComponent", () => {
  let clipboardWrite: jest.Mock;

  beforeEach(() => {
    clipboardWrite = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWrite },
      configurable: true,
    });
    TestBed.configureTestingModule({ imports: [ChatCodeBlockComponent] });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  it("prefers title over filename over language over the default label", () => {
    const fixture = mount({
      code: "const x = 1;",
      language: "ts",
      filename: "sample.ts",
      title: "Sample",
    });

    expect(headerTitle(fixture)).toBe("Sample");

    fixture.componentRef.setInput("title", null);
    fixture.detectChanges();
    expect(headerTitle(fixture)).toBe("sample.ts");

    fixture.componentRef.setInput("filename", null);
    fixture.detectChanges();
    expect(headerTitle(fixture)).toBe("ts");

    fixture.componentRef.setInput("language", null);
    fixture.detectChanges();
    expect(headerTitle(fixture)).toBe("Code");
  });

  it("hides the header when showHeader is false", () => {
    const fixture = mount({ code: "const x = 1;", showHeader: false });

    expect(
      element(fixture).querySelector(".chat-code-block__header"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-code-block__code")?.textContent,
    ).toContain("const x = 1;");
  });

  it("hides the copy button when copyable is false", () => {
    const fixture = mount({ code: "const x = 1;", copyable: false });

    expect(
      element(fixture).querySelector(".chat-code-block__copy"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-code-block__header"),
    ).not.toBeNull();
  });

  it("tokenizes TypeScript keywords, numbers, literals, strings, comments, and punctuation", () => {
    const fixture = mount({ code: TYPESCRIPT, language: "ts" });
    const tokens = fixture.componentInstance.tokens();

    expect(tokens).toEqual(
      expect.arrayContaining([
        { text: "const", type: "keyword" },
        { text: "3", type: "number" },
        { text: "true", type: "literal" },
        { text: '"Ada"', type: "string" },
        { text: "// note", type: "comment" },
        { text: "=", type: "punctuation" },
      ]),
    );

    const html = element(fixture);
    expect(
      html.querySelector(".chat-code-block__token--keyword")?.textContent,
    ).toBe("const");
    expect(
      html.querySelector(".chat-code-block__token--comment")?.textContent,
    ).toBe("// note");
    expect(
      html.querySelector(".chat-code-block__token--literal")?.textContent,
    ).toBe("true");
    expect(
      html.querySelector(".chat-code-block__token--punctuation")?.textContent,
    ).toBe("=");
  });

  it("tokenizes Python keywords, hash comments, and strings", () => {
    const fixture = mount({ code: PYTHON, language: "python" });
    const tokens = fixture.componentInstance.tokens();

    expect(tokens).toEqual(
      expect.arrayContaining([
        { text: "def", type: "keyword" },
        { text: "return", type: "keyword" },
        { text: "# note", type: "comment" },
        { text: '"hi"', type: "string" },
        { text: ":", type: "punctuation" },
      ]),
    );
  });

  it("yields a single plain token when highlight is false", () => {
    const fixture = mount({
      code: TYPESCRIPT,
      language: "ts",
      highlight: false,
    });

    expect(fixture.componentInstance.tokens()).toEqual([
      { text: TYPESCRIPT, type: "plain" },
    ]);
    expect(
      element(fixture).querySelectorAll(".chat-code-block__token--plain"),
    ).toHaveLength(1);
  });

  it("handles escaped and unterminated strings in the tokenizer", () => {
    expect(tokenizeAgentChatCode('"a\\"b"', "ts", true)).toEqual([
      { text: '"a\\"b"', type: "string" },
    ]);
    expect(tokenizeAgentChatCode('"abc', "ts", true)).toEqual([
      { text: '"abc', type: "string" },
    ]);
    expect(tokenizeAgentChatCode("/* open", "ts", true)).toEqual([
      { text: "/* open", type: "comment" },
    ]);
  });

  it("copies the raw code, emits it, and toggles the copied state", async () => {
    jest.useFakeTimers();
    const fixture = mount({ code: TYPESCRIPT, language: "ts" });
    const emitted: string[] = [];
    fixture.componentInstance.copy.subscribe((code) => emitted.push(code));

    const button = element(fixture).querySelector(
      ".chat-code-block__copy",
    ) as HTMLButtonElement;
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(clipboardWrite).toHaveBeenCalledWith(TYPESCRIPT);
    expect(emitted).toEqual([TYPESCRIPT]);
    expect(fixture.componentInstance.copied()).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Copied");

    jest.advanceTimersByTime(2000);
    fixture.detectChanges();
    expect(fixture.componentInstance.copied()).toBe(false);
    expect(button.getAttribute("aria-label")).toBe("Copy code");
  });
});
