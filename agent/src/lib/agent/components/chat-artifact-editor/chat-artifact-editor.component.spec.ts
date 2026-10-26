import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { CodeEditorComponent } from "@decaf-ts/for-angular/code-editor";

import { ChatArtifactEditorComponent } from "./chat-artifact-editor.component";

async function mount(
  inputs: Record<string, unknown> = {},
): Promise<ComponentFixture<ChatArtifactEditorComponent>> {
  const fixture = TestBed.createComponent(ChatArtifactEditorComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactEditorComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("ChatArtifactEditorComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatArtifactEditorComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the code editor for code artifacts and emits changes", async () => {
    const fixture = await mount({
      kind: "code",
      content: "const total = 1;",
      language: "ts",
    });
    const editor = fixture.debugElement.query(
      By.directive(CodeEditorComponent),
    );
    const changes: string[] = [];
    fixture.componentInstance.contentChange.subscribe((value) =>
      changes.push(value),
    );

    expect(editor).not.toBeNull();
    expect(editor.componentInstance.mode()).toBe("code");
    expect(editor.componentInstance.code()).toBe("const total = 1;");
    expect(
      element(fixture).querySelector(".chat-artifact-editor__language")
        ?.textContent,
    ).toContain("ts");

    editor.componentInstance.codeChange.emit("const total = 2;");

    expect(changes).toEqual(["const total = 2;"]);
  });

  it("uses the formula surface for prose and sheet artifacts", async () => {
    const text = await mount({ kind: "text", content: "Hello" });
    expect(
      text.debugElement.query(By.directive(CodeEditorComponent)).componentInstance.mode(),
    ).toBe("formula");

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [ChatArtifactEditorComponent] });

    const sheet = await mount({ kind: "sheet", content: "a,b\n1,2" });
    expect(
      sheet.debugElement.query(By.directive(CodeEditorComponent)).componentInstance.mode(),
    ).toBe("formula");
  });

  it("forwards placeholder and accessible label inputs to the editor", async () => {
    const fixture = await mount({
      kind: "code",
      placeholder: "Paste code…",
      ariaLabel: "Expense script",
    });
    const editor = fixture.debugElement.query(
      By.directive(CodeEditorComponent),
    ).componentInstance;

    expect(editor.placeholder()).toBe("Paste code…");
    expect(editor.ariaLabel()).toBe("Expense script");
  });

  it("renders a static preview when not editable", async () => {
    const fixture = await mount({
      kind: "text",
      content: "Locked content",
      editable: false,
    });

    expect(
      fixture.debugElement.query(By.directive(CodeEditorComponent)),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-artifact-editor__static")
        ?.textContent,
    ).toContain("Locked content");
    expect(
      element(fixture).querySelector(".chat-artifact-editor__mode")?.textContent,
    ).toContain("Read only");
  });

  it("renders an image artifact from the src input", async () => {
    const fixture = await mount({
      kind: "image",
      src: "data:image/png;base64,AAAA",
      imageAlt: "Generated chart",
    });
    const image = element(fixture).querySelector(
      ".chat-artifact-editor__image img",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    expect(image.getAttribute("alt")).toBe("Generated chart");
    expect(image.getAttribute("src")).toContain("data:image/png");
    expect(
      fixture.debugElement.query(By.directive(CodeEditorComponent)),
    ).toBeNull();
  });

  it("accepts an image data URL from the content input", async () => {
    const fixture = await mount({
      kind: "image",
      content: "https://example.test/chart.png",
    });
    const image = element(fixture).querySelector(
      ".chat-artifact-editor__image img",
    ) as HTMLImageElement;

    expect(image.getAttribute("src")).toBe("https://example.test/chart.png");
  });

  it("renders an empty image state when no usable source exists", async () => {
    const fixture = await mount({ kind: "image", content: "not-a-url" });

    expect(
      element(fixture).querySelector(".chat-artifact-editor__empty")
        ?.textContent,
    ).toContain("No image preview available");
    expect(
      element(fixture).querySelector(".chat-artifact-editor__image"),
    ).toBeNull();
  });

  it.each([
    ["https", "src", "https://example.test/chart.png"],
    ["blob", "src", "blob:photo"],
    ["data:image/png", "src", "data:image/png;base64,AAAA"],
    ["https", "content", "https://example.test/chart.png"],
    ["blob", "content", "blob:photo"],
    ["data:image/png", "content", "data:image/png;base64,AAAA"],
  ] as const)(
    "renders an allowed %s image from the %s input",
    async (_label, input, url) => {
      const fixture = await mount({ kind: "image", [input]: url });
      const image = element(fixture).querySelector(
        ".chat-artifact-editor__image img",
      ) as HTMLImageElement;

      expect(image).not.toBeNull();
      expect(image.getAttribute("src")).toBe(url);
      expect(
        element(fixture).querySelector(".chat-artifact-editor__empty"),
      ).toBeNull();
    },
  );

  it.each([
    ["src", "javascript:alert(1)"],
    ["src", "data:text/html,<script>alert(1)</script>"],
    ["content", "javascript:alert(1)"],
    ["content", "data:text/html,<script>alert(1)</script>"],
  ] as const)(
    "blocks an unsafe %s image source and renders the empty state",
    async (input, url) => {
      const fixture = await mount({ kind: "image", [input]: url });

      expect(
        element(fixture).querySelector(".chat-artifact-editor__image"),
      ).toBeNull();
      expect(
        element(fixture).querySelector(".chat-artifact-editor__empty")
          ?.textContent,
      ).toContain("No image preview available");
    },
  );

  it("labels the section and shows the kind", async () => {
    const fixture = await mount({
      kind: "code",
      ariaLabel: "Artifact body",
    });
    const section = element(fixture).querySelector(
      ".chat-artifact-editor",
    ) as HTMLElement;

    expect(section.getAttribute("aria-label")).toBe("Artifact body");
    expect(section.getAttribute("data-kind")).toBe("code");
    expect(
      element(fixture).querySelector(".chat-artifact-editor__kind")?.textContent,
    ).toContain("code");
    expect(
      element(fixture).querySelector(".chat-artifact-editor__mode")?.textContent,
    ).toContain("Editable");
  });
});
