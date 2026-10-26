import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatAttachmentRejection } from "../../types";
import { ChatAttachmentInputComponent } from "./chat-attachment-input.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatAttachmentInputComponent> {
  const fixture = TestBed.createComponent(ChatAttachmentInputComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatAttachmentInputComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function fileInputOf(
  fixture: ComponentFixture<ChatAttachmentInputComponent>,
): HTMLInputElement {
  return element(fixture).querySelector(
    'input[data-role="file-input"]',
  ) as HTMLInputElement;
}

function triggerOf(
  fixture: ComponentFixture<ChatAttachmentInputComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    'button[data-action="attach"]',
  ) as HTMLButtonElement;
}

function makeFile(
  name: string,
  type: string,
  size?: number,
): File {
  const file = new File(["content"], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { configurable: true, value: size });
  }
  return file;
}

function dataTransfer(files: File[]): {
  types: string[];
  files: File[];
  dropEffect: string;
} {
  return { types: ["Files"], files, dropEffect: "none" };
}

function dragEvent(type: string, files: File[] = []): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    configurable: true,
    value: files.length ? dataTransfer(files) : null,
  });
  return event;
}

function pasteEvent(target: EventTarget, files: File[]): Event {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    configurable: true,
    value: { files },
  });
  Object.defineProperty(event, "target", { configurable: true, value: target });
  return event;
}

describe("ChatAttachmentInputComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatAttachmentInputComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the paperclip trigger and a hidden multi-file input", () => {
    const fixture = mount();

    expect(triggerOf(fixture).textContent).toContain("Attach");
    const input = fileInputOf(fixture);
    expect(input.type).toBe("file");
    expect(input.multiple).toBe(true);
    expect(input.accept).toBe("image/*,text/*");
    expect(input.hidden).toBe(false);
    expect(input.getAttribute("aria-label")).toBe("Attach files");
  });

  it("restricts the input to one file when multiple is false", () => {
    const fixture = mount({ multiple: false });

    expect(fileInputOf(fixture).multiple).toBe(false);
  });

  it("opens the hidden picker when the trigger is clicked", () => {
    const fixture = mount();
    const input = fileInputOf(fixture);
    const click = jest.spyOn(input, "click").mockImplementation(() => undefined);

    triggerOf(fixture).click();

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("emits accepted image and text files", () => {
    const fixture = mount();
    const emitted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      emitted.push(files),
    );
    const image = makeFile("photo.png", "image/png");
    const text = makeFile("notes.txt", "text/plain");

    fixture.componentInstance.processFiles([image, text]);

    expect(emitted).toEqual([[image, text]]);
    expect(fixture.componentInstance.rejectedCount()).toBe(0);
  });

  it("rejects unsupported MIME types and emits the i18n error key", () => {
    const fixture = mount();
    const accepted: File[][] = [];
    const rejected: AgentChatAttachmentRejection[][] = [];
    const errors: string[] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );
    fixture.componentInstance.rejected.subscribe((items) =>
      rejected.push(items),
    );
    fixture.componentInstance.error.subscribe((key) => errors.push(key));
    const image = makeFile("photo.png", "image/png");
    const pdf = makeFile("report.pdf", "application/pdf", 42);

    fixture.componentInstance.processFiles([image, pdf]);
    fixture.detectChanges();

    expect(accepted).toEqual([[image]]);
    expect(rejected[0]).toEqual([
      {
        name: "report.pdf",
        mime: "application/pdf",
        size: 42,
        reason: "mime",
      },
    ]);
    expect(errors).toEqual(["agent.chat.attachments.invalidType"]);
    expect(
      element(fixture).querySelector('[role="alert"]')?.textContent,
    ).toContain("Some files are not supported.");
  });

  it("rejects files above maxSize", () => {
    const fixture = mount({ maxSize: 10 });
    const rejected: AgentChatAttachmentRejection[][] = [];
    fixture.componentInstance.rejected.subscribe((items) =>
      rejected.push(items),
    );

    fixture.componentInstance.processFiles([
      makeFile("big.txt", "text/plain", 11),
    ]);

    expect(rejected[0][0].reason).toBe("size");
  });

  it("honours explicit MIME and extension patterns", () => {
    const fixture = mount({ accept: ["application/json", ".csv"] });
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );

    fixture.componentInstance.processFiles([
      makeFile("data.json", "application/json"),
      makeFile("rows.csv", "text/csv"),
      makeFile("notes.txt", "text/plain"),
    ]);

    expect(accepted[0].map((file) => file.name)).toEqual([
      "data.json",
      "rows.csv",
    ]);
  });

  it("keeps only the first file when multiple is false", () => {
    const fixture = mount({ multiple: false });
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );

    fixture.componentInstance.processFiles([
      makeFile("a.txt", "text/plain"),
      makeFile("b.txt", "text/plain"),
    ]);

    expect(accepted[0].map((file) => file.name)).toEqual(["a.txt"]);
  });

  it("shows the full-screen overlay while dragging and hides it on drop", () => {
    const fixture = mount();
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );

    window.dispatchEvent(dragEvent("dragenter", [makeFile("a.txt", "text/plain")]));
    fixture.detectChanges();
    expect(fixture.componentInstance.dragging()).toBe(true);
    expect(
      element(fixture).querySelector('[data-role="drop-overlay"]'),
    ).not.toBeNull();

    const file = makeFile("dropped.png", "image/png");
    window.dispatchEvent(dragEvent("drop", [file]));
    fixture.detectChanges();

    expect(fixture.componentInstance.dragging()).toBe(false);
    expect(
      element(fixture).querySelector('[data-role="drop-overlay"]'),
    ).toBeNull();
    expect(accepted).toEqual([[file]]);
  });

  it("hides the overlay when the drag leaves the window", () => {
    const fixture = mount();

    window.dispatchEvent(dragEvent("dragenter", [makeFile("a.txt", "text/plain")]));
    window.dispatchEvent(dragEvent("dragleave"));
    fixture.detectChanges();

    expect(fixture.componentInstance.dragging()).toBe(false);
  });

  it("prevents the default drag action and marks a copy effect on dragover", () => {
    const fixture = mount();
    const event = dragEvent("dragover", [makeFile("a.txt", "text/plain")]);

    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.dragging()).toBe(true);
    expect((event as DragEvent).dataTransfer?.dropEffect).toBe("copy");
  });

  it("ignores drag events that carry no files", () => {
    const fixture = mount();
    const enter = dragEvent("dragenter");

    window.dispatchEvent(enter);
    fixture.detectChanges();

    expect(enter.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.dragging()).toBe(false);
    expect(
      element(fixture).querySelector('[data-role="drop-overlay"]'),
    ).toBeNull();
  });

  it("keeps the overlay while a nested drag is still active", () => {
    const fixture = mount();
    const file = makeFile("a.txt", "text/plain");

    window.dispatchEvent(dragEvent("dragenter", [file]));
    window.dispatchEvent(dragEvent("dragenter", [file]));
    window.dispatchEvent(dragEvent("dragleave"));
    fixture.detectChanges();
    expect(fixture.componentInstance.dragging()).toBe(true);

    window.dispatchEvent(dragEvent("dragleave"));
    fixture.detectChanges();
    expect(fixture.componentInstance.dragging()).toBe(false);
  });

  it("accepts any MIME type for a */* wildcard", () => {
    const fixture = mount({ accept: ["*/*"] });
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );

    fixture.componentInstance.processFiles([
      makeFile("report.pdf", "application/pdf"),
    ]);

    expect(accepted[0].map((file) => file.name)).toEqual(["report.pdf"]);
  });

  it("accepts pasted files inside the host", () => {
    const fixture = mount();
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );
    const file = makeFile("pasted.png", "image/png");

    triggerOf(fixture).dispatchEvent(pasteEvent(triggerOf(fixture), [file]));

    expect(accepted).toEqual([[file]]);
  });

  it("ignores pasted files outside the host unless globalPaste is set", () => {
    const fixture = mount();
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );
    const file = makeFile("pasted.png", "image/png");
    const outside = document.createElement("div");

    document.dispatchEvent(pasteEvent(outside, [file]));
    expect(accepted).toEqual([]);

    fixture.componentRef.setInput("globalPaste", true);
    fixture.detectChanges();
    document.dispatchEvent(pasteEvent(outside, [file]));
    expect(accepted).toEqual([[file]]);
  });

  it("ignores a paste with no files", () => {
    const fixture = mount();
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );

    triggerOf(fixture).dispatchEvent(pasteEvent(triggerOf(fixture), []));

    expect(accepted).toEqual([]);
  });

  it("ignores intake while disabled", () => {
    const fixture = mount({ disabled: true });
    const accepted: File[][] = [];
    fixture.componentInstance.filesSelected.subscribe((files) =>
      accepted.push(files),
    );

    fixture.componentInstance.processFiles([makeFile("a.txt", "text/plain")]);
    window.dispatchEvent(dragEvent("drop", [makeFile("a.txt", "text/plain")]));

    expect(accepted).toEqual([]);
    expect(triggerOf(fixture).disabled).toBe(true);
  });

  it("clears the native input value after a change so the same file can be reselected", () => {
    const fixture = mount();
    const input = fileInputOf(fixture);
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [makeFile("a.txt", "text/plain")],
    });

    input.dispatchEvent(new Event("change"));

    expect(input.value).toBe("");
  });
});
