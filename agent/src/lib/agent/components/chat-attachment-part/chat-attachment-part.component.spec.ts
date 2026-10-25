import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatAttachment } from "../../types";
import { ChatAttachmentPartComponent } from "./chat-attachment-part.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatAttachmentPartComponent> {
  const fixture = TestBed.createComponent(ChatAttachmentPartComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<ChatAttachmentPartComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function attachment(
  overrides: Partial<AgentChatAttachment> = {},
): AgentChatAttachment {
  return {
    id: "att-1",
    name: "notes.txt",
    mime: "text/plain",
    size: 42,
    ...overrides,
  };
}

describe("ChatAttachmentPartComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatAttachmentPartComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders nothing without an attachment", () => {
    const fixture = mount();

    expect(element(fixture).querySelector(".chat-attachment-part")).toBeNull();
  });

  it("renders an image from the attachment URL", () => {
    const fixture = mount({
      attachment: attachment({
        name: "photo.png",
        mime: "image/png",
        url: "blob:photo",
      }),
    });

    const figure = element(fixture).querySelector(
      ".chat-attachment-part",
    ) as HTMLElement;
    const image = figure.querySelector("img") as HTMLImageElement;
    expect(figure.getAttribute("data-kind")).toBe("image");
    expect(figure.getAttribute("aria-label")).toBe("Attachment");
    expect(image.getAttribute("src")).toBe("blob:photo");
    expect(image.getAttribute("alt")).toBe("photo.png");
    expect(figure.textContent).toContain("image/png");
  });

  it("falls back to a named chip for an image without a URL", () => {
    const fixture = mount({
      attachment: attachment({ name: "photo.png", mime: "image/png" }),
    });

    const figure = element(fixture).querySelector(".chat-attachment-part");
    expect(figure?.querySelector("img")).toBeNull();
    expect(figure?.textContent).toContain("photo.png");
  });

  it("renders the decoded text box from attachment.textPreview", () => {
    const fixture = mount({
      attachment: attachment({
        name: "notes.txt",
        mime: "text/plain",
        textPreview: "first line\nsecond line",
      }),
    });

    const figure = element(fixture).querySelector(
      ".chat-attachment-part",
    ) as HTMLElement;
    expect(figure.getAttribute("data-kind")).toBe("text");
    expect(
      figure.querySelector(".chat-attachment-part__content")?.textContent,
    ).toBe("first line\nsecond line");
  });

  it("prefers an explicit text input over the attachment preview", () => {
    const fixture = mount({
      attachment: attachment({ textPreview: "stale" }),
      text: "decoded content",
    });

    expect(
      element(fixture).querySelector(".chat-attachment-part__content")
        ?.textContent,
    ).toBe("decoded content");
  });

  it("truncates long text when maxTextLength is set", () => {
    const fixture = mount({
      attachment: attachment({ mime: "text/plain", textPreview: "abcdefgh" }),
      maxTextLength: 4,
    });

    expect(
      element(fixture).querySelector(".chat-attachment-part__content")
        ?.textContent,
    ).toBe("abcd…");
  });

  it("shows an empty-preview message when no text is available", () => {
    const fixture = mount({
      attachment: attachment({ name: "empty.txt", mime: "text/plain" }),
    });

    expect(
      element(fixture).querySelector(".chat-attachment-part__content"),
    ).toBeNull();
    expect(
      element(fixture).querySelector(".chat-attachment-part__empty")
        ?.textContent,
    ).toContain("No text preview available.");
  });

  it("treats JSON as text", () => {
    const fixture = mount({
      attachment: attachment({
        name: "data.json",
        mime: "application/json",
        textPreview: '{"ok":true}',
      }),
    });

    expect(
      element(fixture).querySelector(".chat-attachment-part")?.getAttribute(
        "data-kind",
      ),
    ).toBe("text");
  });

  it("treats XML and JavaScript payloads as text", () => {
    const xml = mount({
      attachment: attachment({
        id: "xml-1",
        name: "doc.xml",
        mime: "application/xml",
        textPreview: "<root />",
      }),
    });
    const js = mount({
      attachment: attachment({
        id: "js-1",
        name: "script.js",
        mime: "application/javascript",
        textPreview: "export {};",
      }),
    });

    expect(
      xml.nativeElement
        .querySelector(".chat-attachment-part")
        ?.getAttribute("data-kind"),
    ).toBe("text");
    expect(
      js.nativeElement
        .querySelector(".chat-attachment-part")
        ?.getAttribute("data-kind"),
    ).toBe("text");
  });

  it("renders a fallback chip for other MIME types", () => {
    const fixture = mount({
      attachment: attachment({
        name: "report.pdf",
        mime: "application/pdf",
      }),
    });

    const figure = element(fixture).querySelector(
      ".chat-attachment-part",
    ) as HTMLElement;
    expect(figure.getAttribute("data-kind")).toBe("file");
    expect(figure.textContent).toContain("report.pdf");
    expect(figure.textContent).toContain("application/pdf");
    expect(figure.querySelector("img")).toBeNull();
  });
});
