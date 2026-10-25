import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatStagedAttachment } from "../../types";
import { ChatAttachmentPreviewComponent } from "./chat-attachment-preview.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatAttachmentPreviewComponent> {
  const fixture = TestBed.createComponent(ChatAttachmentPreviewComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatAttachmentPreviewComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function items(
  fixture: ComponentFixture<ChatAttachmentPreviewComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-attachment-preview__item"),
  );
}

function makeFile(name: string, type: string, text = "file text"): File {
  const file = new File([text], name, { type });
  Object.defineProperty(file, "text", {
    configurable: true,
    value: jest.fn().mockResolvedValue(text),
  });
  return file;
}

function attachment(
  overrides: Partial<AgentChatStagedAttachment> = {},
): AgentChatStagedAttachment {
  return {
    id: "att-1",
    name: "notes.txt",
    mime: "text/plain",
    size: 2048,
    ...overrides,
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("ChatAttachmentPreviewComponent", () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    createObjectURL = jest.fn((file: File) => `blob:${file.name}`);
    revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    TestBed.configureTestingModule({
      imports: [ChatAttachmentPreviewComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders nothing when no attachments are staged", () => {
    const fixture = mount();

    expect(
      element(fixture).querySelector(".chat-attachment-preview"),
    ).toBeNull();
  });

  it("renders an image thumbnail from an object URL derived from the file", () => {
    const fixture = mount({
      attachments: [
        attachment({
          id: "img-1",
          name: "photo.png",
          mime: "image/png",
          size: 4096,
          file: makeFile("photo.png", "image/png"),
        }),
      ],
    });
    fixture.detectChanges();

    const image = element(fixture).querySelector(
      ".chat-attachment-preview__thumb",
    ) as HTMLImageElement;
    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toBe("blob:photo.png");
    expect(image.getAttribute("alt")).toBe("photo.png");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(items(fixture)[0].getAttribute("data-kind")).toBe("image");
  });

  it("prefers an existing attachment url over creating a new object URL", () => {
    const fixture = mount({
      attachments: [
        attachment({
          id: "img-2",
          name: "photo.png",
          mime: "image/png",
          url: "https://example.test/photo.png",
          file: makeFile("photo.png", "image/png"),
        }),
      ],
    });

    const image = element(fixture).querySelector(
      ".chat-attachment-preview__thumb",
    ) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("https://example.test/photo.png");
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("revokes the object URL when an attachment is removed", () => {
    const fixture = mount({
      attachments: [
        attachment({
          id: "img-3",
          name: "photo.png",
          mime: "image/png",
          file: makeFile("photo.png", "image/png"),
        }),
      ],
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput("attachments", []);
    fixture.detectChanges();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo.png");
    expect(fixture.componentInstance.imageUrls()).toEqual({});
  });

  it("renders a truncated 100-character text preview card", () => {
    const text = "a".repeat(150);
    const fixture = mount({
      attachments: [
        attachment({ id: "text-1", name: "notes.txt", textPreview: text }),
      ],
    });

    const item = items(fixture)[0];
    expect(item.getAttribute("data-kind")).toBe("text");
    expect(
      item.querySelector(".chat-attachment-preview__excerpt")?.textContent?.trim(),
    ).toBe(`${"a".repeat(100)}…`);
  });

  it("honours a custom maxTextPreview", () => {
    const fixture = mount({
      maxTextPreview: 5,
      attachments: [
        attachment({ id: "text-2", name: "notes.txt", textPreview: "abcdefgh" }),
      ],
    });

    expect(
      element(fixture).querySelector(".chat-attachment-preview__excerpt")
        ?.textContent?.trim(),
    ).toBe("abcde…");
  });

  it("decodes a text file when no preview text is provided", async () => {
    const file = makeFile("decoded.txt", "text/plain", "decoded from file");
    const fixture = mount({
      attachments: [attachment({ id: "text-3", name: "decoded.txt", file })],
    });

    await flush();
    fixture.detectChanges();

    expect(file.text).toHaveBeenCalledTimes(1);
    expect(
      element(fixture).querySelector(".chat-attachment-preview__excerpt")
        ?.textContent?.trim(),
    ).toBe("decoded from file");
  });

  it("renders a fallback chip for unsupported MIME types", () => {
    const fixture = mount({
      attachments: [
        attachment({
          id: "file-1",
          name: "report.pdf",
          mime: "application/pdf",
          size: 1024 * 1024 * 2,
        }),
      ],
    });

    const item = items(fixture)[0];
    expect(item.getAttribute("data-kind")).toBe("file");
    expect(item.textContent).toContain("report.pdf");
    expect(item.textContent).toContain("2.0 MB");
    expect(item.textContent).toContain("application/pdf");
  });

  it("formats byte sizes and renders the MIME chip", () => {
    const fixture = mount({
      attachments: [
        attachment({ id: "size-1", name: "small.txt", size: 512 }),
        attachment({ id: "size-2", name: "empty.txt", size: 0 }),
      ],
    });

    const chips = Array.from(
      element(fixture).querySelectorAll(".chat-attachment-preview__chip"),
    ).map((chip) => chip.textContent?.trim());

    expect(chips).toContain("512 B");
    expect(chips).toContain("0 B");
    expect(chips).toContain("text/plain");
  });

  it("renders the image fallback icon when no object URL can be created", () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: undefined,
    });
    const fixture = mount({
      attachments: [
        attachment({
          id: "img-no-url",
          name: "photo.png",
          mime: "image/png",
          file: makeFile("photo.png", "image/png"),
        }),
      ],
    });

    const item = items(fixture)[0];
    expect(item.getAttribute("data-kind")).toBe("image");
    expect(item.querySelector("img")).toBeNull();
    expect(
      item.querySelector(".chat-attachment-preview__fallback-icon"),
    ).not.toBeNull();
  });

  it("treats XML and JavaScript payloads as text", () => {
    const fixture = mount({
      attachments: [
        attachment({
          id: "xml-1",
          name: "doc.xml",
          mime: "application/xml",
          textPreview: "<root />",
        }),
        attachment({
          id: "js-1",
          name: "script.js",
          mime: "application/javascript",
          textPreview: "export {};",
        }),
      ],
    });

    expect(items(fixture).map((item) => item.getAttribute("data-kind"))).toEqual(
      ["text", "text"],
    );
  });

  it("renders nothing in the preview when maxTextPreview is zero", () => {
    const fixture = mount({
      maxTextPreview: 0,
      attachments: [
        attachment({ id: "text-4", name: "notes.txt", textPreview: "abcdef" }),
      ],
    });

    expect(
      element(fixture).querySelector(".chat-attachment-preview__excerpt")
        ?.textContent?.trim(),
    ).toBe("");
  });

  it("swallows text decode failures without breaking the card", async () => {
    const file = new File(["broken"], "broken.txt", { type: "text/plain" });
    Object.defineProperty(file, "text", {
      configurable: true,
      value: jest.fn().mockRejectedValue(new Error("decode failed")),
    });
    const fixture = mount({
      attachments: [attachment({ id: "text-5", name: "broken.txt", file })],
    });

    await flush();
    await flush();
    fixture.detectChanges();

    const item = items(fixture)[0];
    expect(item.getAttribute("data-kind")).toBe("text");
    expect(
      item.querySelector(".chat-attachment-preview__excerpt")?.textContent?.trim(),
    ).toBe("");
  });

  it("formats kilobyte sizes", () => {
    const fixture = mount({
      attachments: [
        attachment({ id: "kb-1", name: "doc.txt", size: 1536 }),
      ],
    });

    const chips = Array.from(
      element(fixture).querySelectorAll(".chat-attachment-preview__chip"),
    ).map((chip) => chip.textContent?.trim());

    expect(chips).toContain("1.5 KB");
  });

  it("returns 0 B for non-finite sizes", () => {
    const fixture = mount();

    expect(fixture.componentInstance.formatSize(Number.NaN)).toBe("0 B");
    expect(fixture.componentInstance.formatSize(-1)).toBe("0 B");
  });

  it("emits the removed attachment id", () => {
    const fixture = mount({
      attachments: [attachment({ id: "remove-me", name: "remove.txt" })],
    });
    const removed: string[] = [];
    fixture.componentInstance.remove.subscribe((id) => removed.push(id));

    const button = element(fixture).querySelector(
      'button[data-action="remove"]',
    ) as HTMLButtonElement;
    expect(button.getAttribute("aria-label")).toBe("Remove attachment");
    button.click();

    expect(removed).toEqual(["remove-me"]);
  });

  it("revokes every live object URL on destroy", () => {
    const fixture = mount({
      attachments: [
        attachment({
          id: "img-4",
          name: "photo.png",
          mime: "image/png",
          file: makeFile("photo.png", "image/png"),
        }),
      ],
    });

    fixture.destroy();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo.png");
  });
});
