import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatArtifactComponent } from "./chat-artifact.component";

@Component({
  standalone: true,
  imports: [ChatArtifactComponent],
  template: `
    <ngx-decaf-chat-artifact title="Quarterly report" kind="code">
      <button artifact-actions class="host-action">Share</button>
      <p class="host-body">Projected artifact body</p>
    </ngx-decaf-chat-artifact>
  `,
})
class ChatArtifactHostComponent {}

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactComponent> {
  const fixture = TestBed.createComponent(ChatArtifactComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("ChatArtifactComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatArtifactComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the title, kind badge, and visibility indicator", () => {
    const fixture = mount({
      title: "Expense summary",
      kind: "sheet",
      visibility: "shared",
    });
    const panel = element(fixture).querySelector(
      ".chat-artifact",
    ) as HTMLElement;

    expect(panel.getAttribute("aria-label")).toBe("Expense summary");
    expect(panel.getAttribute("aria-busy")).toBeNull();
    expect(
      element(fixture).querySelector(".chat-artifact__title")?.textContent,
    ).toContain("Expense summary");
    expect(
      element(fixture)
        .querySelector(".chat-artifact__kind")
        ?.getAttribute("data-kind"),
    ).toBe("sheet");
    expect(
      element(fixture).querySelector(".chat-artifact__kind")?.textContent,
    ).toContain("sheet");
    expect(
      element(fixture)
        .querySelector(".chat-artifact__visibility")
        ?.getAttribute("data-visibility"),
    ).toBe("shared");
  });

  it("falls back to the untitled label", () => {
    const fixture = mount();

    expect(
      element(fixture).querySelector(".chat-artifact__title")?.textContent,
    ).toContain("Untitled artifact");
  });

  it("renders text content with the streaming state and footer", () => {
    const fixture = mount({
      title: "Draft",
      kind: "text",
      streaming: true,
      content: "Hello artifact",
    });
    const panel = element(fixture).querySelector(
      ".chat-artifact",
    ) as HTMLElement;

    expect(panel.classList.contains("chat-artifact--streaming")).toBe(true);
    expect(panel.getAttribute("aria-busy")).toBe("true");
    expect(
      element(fixture).querySelector(".chat-artifact__content")?.textContent,
    ).toContain("Hello artifact");
    expect(
      element(fixture).querySelector(".chat-artifact__footer")?.textContent,
    ).toContain("Streaming content");
  });

  it("renders image artifacts as an image preview", () => {
    const fixture = mount({
      kind: "image",
      content: "data:image/png;base64,AAAA",
      imageAlt: "Generated chart",
    });
    const image = element(fixture).querySelector(
      ".chat-artifact__image",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    expect(image.getAttribute("alt")).toBe("Generated chart");
    expect(image.getAttribute("src")).toContain("data:image/png");
    expect(
      element(fixture).querySelector(".chat-artifact__content"),
    ).toBeNull();
  });

  it.each([
    ["https", "https://example.test/chart.png"],
    ["blob", "blob:photo"],
    ["data:image/png", "data:image/png;base64,AAAA"],
  ])("renders an image artifact for an allowed %s source", (_label, source) => {
    const fixture = mount({ kind: "image", content: source });
    const image = element(fixture).querySelector(
      ".chat-artifact__image",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toBe(source);
    expect(
      element(fixture).querySelector(".chat-artifact__content"),
    ).toBeNull();
  });

  it.each([
    ["javascript", "javascript:alert(1)"],
    ["data:text/html", "data:text/html,<script>alert(1)</script>"],
  ])(
    "blocks a %s image source and renders the unavailable placeholder",
    (_label, source) => {
      const fixture = mount({ kind: "image", content: source });
      const placeholder = element(fixture).querySelector(
        ".chat-artifact__content",
      ) as HTMLElement;

      expect(
        element(fixture).querySelector(".chat-artifact__image"),
      ).toBeNull();
      expect(placeholder).not.toBeNull();
      expect(placeholder.getAttribute("role")).toBe("status");
      expect(placeholder.textContent).toContain("Image preview unavailable.");
    },
  );

  it("emits close when the close button is clicked", () => {
    const fixture = mount({ title: "Closable" });
    let closed = 0;
    fixture.componentInstance.close.subscribe(() => (closed += 1));

    (
      element(fixture).querySelector(
        ".chat-artifact__close",
      ) as HTMLButtonElement
    ).click();

    expect(closed).toBe(1);
  });

  it("hides the close button when closable is false", () => {
    const fixture = mount({ closable: false });

    expect(element(fixture).querySelector(".chat-artifact__close")).toBeNull();
  });

  it("projects the actions slot and the default body", () => {
    const fixture = TestBed.createComponent(ChatArtifactHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector(".host-action")?.textContent).toContain("Share");
    expect(host.querySelector(".host-body")?.textContent).toContain(
      "Projected artifact body",
    );
  });
});
