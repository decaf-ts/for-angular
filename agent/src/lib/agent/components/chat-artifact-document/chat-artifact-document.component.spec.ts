import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatArtifactDocument } from "../../types";
import { ChatArtifactDocumentComponent } from "./chat-artifact-document.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactDocumentComponent> {
  const fixture = TestBed.createComponent(ChatArtifactDocumentComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactDocumentComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

const DOCUMENT: AgentChatArtifactDocument = {
  id: "doc-1",
  title: "Expense report",
  kind: "text",
  content: "Line one\nLine two",
  version: 3,
};

describe("ChatArtifactDocumentComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatArtifactDocumentComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the tool-call placeholder while pending", () => {
    const fixture = mount({ toolName: "getDocument", documentId: "doc-1" });
    const section = element(fixture).querySelector(
      ".chat-artifact-document",
    ) as HTMLElement;

    expect(section.getAttribute("data-status")).toBe("pending");
    expect(
      section.querySelector(".chat-artifact-document__tool-name")?.textContent,
    ).toContain("getDocument");
    expect(
      element(fixture).querySelector(".chat-artifact-document__placeholder")
        ?.textContent,
    ).toContain("Waiting for the tool result");
  });

  it("renders the loading skeleton while the document is fetched", () => {
    const fixture = mount({ status: "loading", documentId: "doc-1" });
    const section = element(fixture).querySelector(
      ".chat-artifact-document",
    ) as HTMLElement;

    expect(section.getAttribute("aria-busy")).toBe("true");
    expect(
      element(fixture).querySelector("ngx-decaf-chat-artifact-skeleton"),
    ).not.toBeNull();
  });

  it("fetches a referenced document through the loader and emits it", async () => {
    const loader = jest.fn().mockResolvedValue(DOCUMENT);
    const fixture = mount({ documentId: "doc-1", loader });
    const loaded: AgentChatArtifactDocument[] = [];
    fixture.componentInstance.loaded.subscribe((document) =>
      loaded.push(document),
    );

    await fixture.whenStable();
    fixture.detectChanges();

    expect(loader).toHaveBeenCalledWith("doc-1");
    expect(loaded).toEqual([DOCUMENT]);
    expect(
      element(fixture)
        .querySelector(".chat-artifact-document")
        ?.getAttribute("data-status"),
    ).toBe("succeeded");
    expect(
      element(fixture).querySelector(".chat-artifact-document__title")
        ?.textContent,
    ).toContain("Expense report");
    expect(
      element(fixture).querySelector(".chat-artifact-document__version")
        ?.textContent,
    ).toContain("v3");
  });

  it("does not refetch the same document id", async () => {
    const loader = jest.fn().mockResolvedValue(DOCUMENT);
    const fixture = mount({ documentId: "doc-1", loader });

    await fixture.whenStable();
    fixture.detectChanges();
    fixture.componentRef.setInput("status", "pending");
    fixture.detectChanges();
    await fixture.whenStable();

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("renders a failed load and retries the loader", async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error("Not found"))
      .mockResolvedValueOnce(DOCUMENT);
    const fixture = mount({ documentId: "doc-1", loader });
    const failed: string[] = [];
    fixture.componentInstance.failed.subscribe((message) =>
      failed.push(message),
    );

    await fixture.whenStable();
    fixture.detectChanges();

    expect(failed).toEqual(["Not found"]);
    expect(
      element(fixture).querySelector(".chat-artifact-document__error-message")
        ?.textContent,
    ).toContain("Not found");

    (
      element(fixture).querySelector(
        ".chat-artifact-document__retry",
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(
      element(fixture).querySelector(".chat-artifact-document__title")
        ?.textContent,
    ).toContain("Expense report");
  });

  it("renders a directly supplied document without invoking a loader", () => {
    const loader = jest.fn();
    const fixture = mount({ document: DOCUMENT, loader, documentId: "doc-1" });

    expect(loader).not.toHaveBeenCalled();
    expect(
      element(fixture)
        .querySelector(".chat-artifact-document")
        ?.getAttribute("data-status"),
    ).toBe("succeeded");
    expect(
      element(fixture).querySelector(".chat-artifact-document__content")
        ?.textContent,
    ).toContain("Line one");
  });

  it("truncates long previews", () => {
    const fixture = mount({
      document: {
        ...DOCUMENT,
        content: "x".repeat(400),
      },
    });

    expect(
      element(fixture).querySelector(".chat-artifact-document__content")
        ?.textContent,
    ).toContain("…");
  });

  it("renders an image document preview", () => {
    const fixture = mount({
      document: {
        id: "img-1",
        title: "Chart",
        kind: "image",
        url: "data:image/png;base64,AAAA",
      },
    });
    const image = element(fixture).querySelector(
      ".chat-artifact-document__image",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    expect(image.getAttribute("alt")).toBe("Chart");
    expect(image.getAttribute("src")).toContain("data:image/png");
  });

  it.each([
    ["https", "https://example.test/chart.png"],
    ["blob", "blob:photo"],
    ["data:image/png", "data:image/png;base64,AAAA"],
  ])("renders an image preview for an allowed %s URL", (_label, url) => {
    const fixture = mount({
      document: { id: "img-1", title: "Chart", kind: "image", url },
    });
    const image = element(fixture).querySelector(
      ".chat-artifact-document__image",
    ) as HTMLImageElement;

    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toBe(url);
    expect(
      element(fixture).querySelector(".chat-artifact-document__empty"),
    ).toBeNull();
  });

  it.each([
    ["javascript", "javascript:alert(1)"],
    ["data:text/html", "data:text/html,<script>alert(1)</script>"],
  ])("blocks a %s image URL and renders the empty state", (_label, url) => {
    const fixture = mount({
      document: { id: "img-1", title: "Chart", kind: "image", url },
    });

    expect(
      element(fixture).querySelector(".chat-artifact-document__image"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-artifact-document__empty")
        ?.textContent,
    ).toContain("The document is empty.");
  });

  it("blocks an unsafe content image source and renders the empty state", () => {
    const fixture = mount({
      document: {
        id: "img-2",
        title: "Chart",
        kind: "image",
        content: "javascript:alert(1)",
      },
    });

    expect(
      element(fixture).querySelector(".chat-artifact-document__image"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-artifact-document__empty")
        ?.textContent,
    ).toContain("The document is empty.");
  });

  it("renders an error alert with an explicit error input", () => {
    const fixture = mount({ status: "failed", error: "Rate limited" });

    expect(
      element(fixture).querySelector(".chat-artifact-document__error")
        ?.getAttribute("role"),
    ).toBe("alert");
    expect(
      element(fixture).querySelector(".chat-artifact-document__error-message")
        ?.textContent,
    ).toContain("Rate limited");
    expect(
      element(fixture).querySelector(".chat-artifact-document__retry"),
    ).toBeNull();
  });
});
