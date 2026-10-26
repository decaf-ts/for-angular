import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";

import { AGENT_CHAT_KNOWLEDGE_BASE_SOURCE } from "../../tokens/agent-chat.tokens";
import type {
  AgentChatKnowledgeBaseEntry,
  AgentChatKnowledgeBaseSource,
  AgentChatKnowledgeSource,
  AgentChatKnowledgeUpload,
} from "../../types";
import { ChatKnowledgeBaseSelectorComponent } from "./chat-knowledge-base-selector.component";

const ENTRIES: AgentChatKnowledgeBaseEntry[] = [
  {
    id: "kb-1",
    label: "Employee handbook",
    fileName: "employee-handbook.pdf",
    size: 248320,
    fileCount: 3,
    status: "ready",
  },
  {
    id: "kb-2",
    label: "Price list 2026",
    fileName: "price-list-2026.xlsx",
    size: 84211,
    status: "ready",
  },
  {
    id: "kb-3",
    label: "Security policies",
    fileName: "security-policies.md",
    size: 12288,
    status: "ready",
  },
];

const SOURCES: AgentChatKnowledgeSource[] = [
  { id: "kb-1", label: "Employee handbook" },
  { id: "kb-2", label: "Price list 2026" },
];

interface SourceStub extends AgentChatKnowledgeBaseSource {
  list: jest.Mock;
  upload: jest.Mock;
  remove: jest.Mock;
}

function sourceStub(
  overrides: Partial<AgentChatKnowledgeBaseSource> = {},
): SourceStub {
  return {
    list: jest.fn(() => of([])),
    upload: jest.fn(() => of(undefined)),
    remove: jest.fn(() => of(undefined)),
    ...overrides,
  } as unknown as SourceStub;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function settle(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): Promise<void> {
  for (let index = 0; index < 12; index += 1) {
    await Promise.resolve();
  }
  fixture.detectChanges();
  fixture.detectChanges();
}

function tick(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): void {
  fixture.detectChanges();
  fixture.detectChanges();
}

function mount(
  inputs: Record<string, unknown> = {},
  providers: unknown[] = [],
): ComponentFixture<ChatKnowledgeBaseSelectorComponent> {
  TestBed.configureTestingModule({
    imports: [ChatKnowledgeBaseSelectorComponent],
    providers,
  });
  const fixture = TestBed.createComponent(ChatKnowledgeBaseSelectorComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  tick(fixture);
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function dialogOf(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLElement | null {
  return element(fixture).querySelector(
    '[role="dialog"]',
  ) as HTMLElement | null;
}

function rows(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-knowledge-base__row"),
  ) as HTMLElement[];
}

function rowOf(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
  label: string,
): HTMLElement {
  return rows(fixture).find((row) =>
    (row.querySelector(".chat-knowledge-base__entry-name")?.textContent ?? "").includes(
      label,
    ),
  ) as HTMLElement;
}

function checkboxOf(row: HTMLElement): HTMLInputElement {
  return row.querySelector(
    "input[type='checkbox']",
  ) as HTMLInputElement;
}

function selectAllOf(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLInputElement {
  return element(fixture).querySelector(
    ".chat-knowledge-base__select-all input[type='checkbox']",
  ) as HTMLInputElement;
}

function badgeOf(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLElement {
  return element(fixture).querySelector(
    ".chat-knowledge-base__badge",
  ) as HTMLElement;
}

function footerCountOf(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): string {
  return (
    element(fixture).querySelector(".chat-knowledge-base__footer-count")
      ?.textContent
      ?.replace(/\s+/g, " ")
      .trim() ?? ""
  );
}

function button(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
  selector: string,
): HTMLButtonElement | null {
  return element(fixture).querySelector(selector) as HTMLButtonElement | null;
}

function fileInputOf(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLInputElement {
  return element(fixture).querySelector(
    "input[type='file']",
  ) as HTMLInputElement;
}

function queueRows(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".chat-knowledge-base__queue-row"),
  ) as HTMLElement[];
}

function watch<T>(
  fixture: ComponentFixture<ChatKnowledgeBaseSelectorComponent>,
  output:
    | "selectionChange"
    | "countChange"
    | "openChange"
    | "entriesChange"
    | "upload"
    | "remove",
): T[] {
  const seen: T[] = [];
  const emitter = fixture.componentInstance[output] as unknown as {
    subscribe: (fn: (value: T) => void) => void;
  };
  emitter.subscribe((value) => seen.push(value));
  return seen;
}

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
}

describe("ChatKnowledgeBaseSelectorComponent", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe("rendering", () => {
    it("renders nothing while closed", () => {
      const fixture = mount({ open: false, entries: ENTRIES });

      expect(element(fixture).querySelector(".chat-knowledge-base")).toBeNull();
      expect(dialogOf(fixture)).toBeNull();
    });

    it("renders an accessible modal dialog with the title and count badge", () => {
      const fixture = mount({ entries: ENTRIES });

      const dialog = dialogOf(fixture) as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute("role")).toBe("dialog");
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      expect(dialog.getAttribute("aria-label")).toBe("Manage knowledge base");
      expect(
        element(fixture).querySelector(".chat-knowledge-base__title")?.textContent?.trim(),
      ).toBe("Manage knowledge base");
      expect(
        element(fixture).querySelector(".chat-knowledge-base__backdrop"),
      ).not.toBeNull();
      expect(badgeOf(fixture).textContent?.trim()).toBe("0");
      expect(badgeOf(fixture).getAttribute("aria-label")).toBe("Selected: 0");
      expect(footerCountOf(fixture)).toContain("0/3 selected");
    });

    it("renders a custom title on the heading and dialog label", () => {
      const fixture = mount({ entries: ENTRIES, title: "Attach documents" });

      expect(
        element(fixture).querySelector(".chat-knowledge-base__title")?.textContent?.trim(),
      ).toBe("Attach documents");
      expect(dialogOf(fixture)?.getAttribute("aria-label")).toBe(
        "Attach documents",
      );
    });

    it("renders one row per entry with labels, metadata, and select labels", () => {
      const fixture = mount({ entries: ENTRIES });
      const labels = rows(fixture).map((row) =>
        row.querySelector(".chat-knowledge-base__entry-name")?.textContent?.trim(),
      );

      expect(labels).toEqual([
        "Employee handbook",
        "Price list 2026",
        "Security policies",
      ]);
      expect(checkboxOf(rowOf(fixture, "Employee handbook")).getAttribute("aria-label")).toBe(
        "Select: Employee handbook",
      );
      expect(
        rowOf(fixture, "Employee handbook").querySelector(
          ".chat-knowledge-base__entry-meta",
        )?.textContent,
      ).toContain("employee-handbook.pdf · 242.5 KB · 3");
      expect(
        rowOf(fixture, "Price list 2026").querySelector(
          ".chat-knowledge-base__entry-meta",
        )?.textContent,
      ).toContain("price-list-2026.xlsx · 82.2 KB");
    });

    it("renders skeleton rows while loading and marks the body busy", () => {
      const fixture = mount({
        entries: ENTRIES,
        loading: true,
        skeletonRows: 2,
      });

      expect(
        element(fixture).querySelectorAll(".chat-knowledge-base__skeleton-row"),
      ).toHaveLength(2);
      expect(
        element(fixture).querySelector(".chat-knowledge-base__body")?.getAttribute("aria-busy"),
      ).toBe("true");
      expect(
        element(fixture).querySelector(".chat-knowledge-base__status")?.textContent?.trim(),
      ).toBe("Loading documents…");
      expect(rows(fixture)).toHaveLength(0);
    });

    it("renders the empty state with an upload action", () => {
      const fixture = mount({ entries: [] });

      expect(
        element(fixture).querySelector(".chat-knowledge-base__empty-text")?.textContent?.trim(),
      ).toBe("No documents yet");
      expect(
        element(fixture).querySelector(".chat-knowledge-base__upload-action")?.textContent,
      ).toContain("Upload file");
    });

    it("hides the header and empty-state upload affordances when uploadEnabled is false", () => {
      const fixture = mount({ entries: [], uploadEnabled: false });

      expect(button(fixture, '[aria-label="Upload file"]')).toBeNull();
      expect(
        element(fixture).querySelector(".chat-knowledge-base__upload-action"),
      ).toBeNull();
    });

    it("hides per-row upload affordances when uploadEnabled is false", () => {
      const fixture = mount({ entries: ENTRIES, uploadEnabled: false });

      expect(button(fixture, '[aria-label="Upload file: Employee handbook"]')).toBeNull();
    });

    it("hides delete controls when deleteEnabled is false", () => {
      const fixture = mount({ entries: ENTRIES, deleteEnabled: false });

      expect(button(fixture, '[aria-label="Delete file: Employee handbook"]')).toBeNull();
      expect(button(fixture, '[aria-label="Upload file: Employee handbook"]')).not.toBeNull();
    });
  });

  describe("selection", () => {
    it("toggles a single entry and emits selection and count", () => {
      const fixture = mount({ entries: ENTRIES });
      const selectionChange = watch<string[]>(fixture, "selectionChange");
      const countChange = watch<number>(fixture, "countChange");

      checkboxOf(rowOf(fixture, "Employee handbook")).click();
      tick(fixture);

      expect(selectionChange).toEqual([["kb-1"]]);
      expect(countChange).toEqual([1]);
      expect(checkboxOf(rowOf(fixture, "Employee handbook")).checked).toBe(true);
      expect(badgeOf(fixture).textContent?.trim()).toBe("1");
      expect(footerCountOf(fixture)).toContain("1/3 selected");
      expect(button(fixture, ".chat-knowledge-base__clear")).not.toBeNull();

      checkboxOf(rowOf(fixture, "Employee handbook")).click();
      tick(fixture);

      expect(selectionChange).toEqual([["kb-1"], []]);
      expect(countChange).toEqual([1, 0]);
      expect(button(fixture, ".chat-knowledge-base__clear")).toBeNull();
    });

    it("selects and clears every entry from the select-all control", () => {
      const fixture = mount({ entries: ENTRIES });
      const selectionChange = watch<string[]>(fixture, "selectionChange");

      selectAllOf(fixture).click();
      tick(fixture);

      expect(selectionChange).toEqual([["kb-1", "kb-2", "kb-3"]]);
      expect(selectAllOf(fixture).checked).toBe(true);
      expect(selectAllOf(fixture).indeterminate).toBe(false);
      expect(rows(fixture).every((row) => checkboxOf(row).checked)).toBe(true);
      expect(badgeOf(fixture).textContent?.trim()).toBe("3");

      selectAllOf(fixture).click();
      tick(fixture);

      expect(selectionChange[1]).toEqual([]);
      expect(badgeOf(fixture).textContent?.trim()).toBe("0");
    });

    it("shows the select-all control as indeterminate for a partial selection", () => {
      const fixture = mount({ entries: ENTRIES, selectedIds: ["kb-2"] });

      expect(selectAllOf(fixture).checked).toBe(false);
      expect(selectAllOf(fixture).indeterminate).toBe(true);
      expect(checkboxOf(rowOf(fixture, "Price list 2026")).checked).toBe(true);
    });

    it("clears the selection from the clear action", () => {
      const fixture = mount({ entries: ENTRIES, selectedIds: ["kb-1", "kb-3"] });
      const selectionChange = watch<string[]>(fixture, "selectionChange");
      const countChange = watch<number>(fixture, "countChange");

      (button(fixture, ".chat-knowledge-base__clear") as HTMLButtonElement).click();
      tick(fixture);

      expect(selectionChange).toEqual([[]]);
      expect(countChange).toEqual([0]);
      expect(badgeOf(fixture).textContent?.trim()).toBe("0");
    });

    it("ignores selected ids that are not in the entry list", () => {
      const fixture = mount({
        entries: ENTRIES,
        selectedIds: ["kb-1", "kb-missing"],
      });

      expect(badgeOf(fixture).textContent?.trim()).toBe("1");
      expect(footerCountOf(fixture)).toContain("1/3 selected");
    });
  });

  describe("close behaviour", () => {
    it("closes from the close button", () => {
      const fixture = mount({ entries: ENTRIES });
      const openChange = watch<boolean>(fixture, "openChange");

      (button(fixture, '[aria-label="Close knowledge base"]') as HTMLButtonElement).click();

      expect(openChange).toEqual([false]);
    });

    it("closes from the Done action and the backdrop", () => {
      const fixture = mount({ entries: ENTRIES });
      const openChange = watch<boolean>(fixture, "openChange");

      (button(fixture, ".chat-knowledge-base__done") as HTMLButtonElement).click();
      (element(fixture).querySelector(".chat-knowledge-base__backdrop") as HTMLElement).click();

      expect(openChange).toEqual([false, false]);
    });

    it("closes on Escape", () => {
      const fixture = mount({ entries: ENTRIES });
      const openChange = watch<boolean>(fixture, "openChange");

      escape();

      expect(openChange).toEqual([false]);
    });

    it("closes on an outside document click and stays open on an inside click", () => {
      const fixture = mount({ entries: ENTRIES });
      const openChange = watch<boolean>(fixture, "openChange");

      dialogOf(fixture)?.click();
      expect(openChange).toHaveLength(0);

      const outside = document.createElement("div");
      document.body.appendChild(outside);
      outside.click();
      outside.remove();

      expect(openChange).toEqual([false]);
    });

    it("does not emit close signals while already closed", () => {
      const fixture = mount({ entries: ENTRIES, open: false });
      const openChange = watch<boolean>(fixture, "openChange");

      escape();
      fixture.componentInstance.requestClose();

      expect(openChange).toHaveLength(0);
    });
  });

  describe("delete", () => {
    it("removes an entry, drops it from the selection, and emits changes", async () => {
      const fixture = mount({ entries: ENTRIES, selectedIds: ["kb-1"] });
      const removed = watch<AgentChatKnowledgeBaseEntry>(fixture, "remove");
      const entriesChange = watch<AgentChatKnowledgeBaseEntry[]>(fixture, "entriesChange");
      const selectionChange = watch<string[]>(fixture, "selectionChange");

      (button(fixture, '[aria-label="Delete file: Employee handbook"]') as HTMLButtonElement).click();
      await settle(fixture);

      expect(removed).toEqual([ENTRIES[0]]);
      expect(rows(fixture).map((row) =>
        row.querySelector(".chat-knowledge-base__entry-name")?.textContent?.trim(),
      )).toEqual(["Price list 2026", "Security policies"]);
      expect(entriesChange[0].map((entry) => entry.id)).toEqual(["kb-2", "kb-3"]);
      expect(selectionChange[0]).toEqual([]);
      expect(badgeOf(fixture).textContent?.trim()).toBe("0");
    });

    it("removes through the injected source before updating the list", async () => {
      const pending = deferred<void>();
      const source = sourceStub({ remove: jest.fn(() => pending.promise) });
      const fixture = mount(
        { entries: ENTRIES },
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );

      (button(fixture, '[aria-label="Delete file: Employee handbook"]') as HTMLButtonElement).click();
      tick(fixture);

      const deletingButton = button(
        fixture,
        '[aria-label="Delete file: Employee handbook"]',
      ) as HTMLButtonElement;
      expect(deletingButton.disabled).toBe(true);
      expect(source.remove).toHaveBeenCalledWith("kb-1");
      expect(rows(fixture)).toHaveLength(3);

      pending.resolve(undefined);
      await settle(fixture);

      expect(rows(fixture)).toHaveLength(2);
      expect(
        button(fixture, '[aria-label="Delete file: Employee handbook"]'),
      ).toBeNull();
    });

    it("keeps the entry and clears the deleting state when removal fails", async () => {
      const source = sourceStub({
        remove: jest.fn(() => Promise.reject(new Error("nope"))),
      });
      const fixture = mount(
        { entries: ENTRIES },
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );

      (button(fixture, '[aria-label="Delete file: Employee handbook"]') as HTMLButtonElement).click();
      await settle(fixture);

      expect(rows(fixture)).toHaveLength(3);
      const deleteButton = button(
        fixture,
        '[aria-label="Delete file: Employee handbook"]',
      ) as HTMLButtonElement;
      expect(deleteButton.disabled).toBe(false);
    });

    it("ignores delete requests while deleteEnabled is false", async () => {
      const source = sourceStub();
      const fixture = mount(
        { entries: ENTRIES, deleteEnabled: false },
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );
      const removed = watch<AgentChatKnowledgeBaseEntry>(fixture, "remove");

      await fixture.componentInstance.requestDelete(ENTRIES[0]);
      tick(fixture);

      expect(removed).toHaveLength(0);
      expect(source.remove).not.toHaveBeenCalled();
      expect(rows(fixture)).toHaveLength(3);
    });
  });

  describe("upload", () => {
    it("opens the file picker from the header and empty state", () => {
      const fixture = mount({ entries: [] });
      const input = fileInputOf(fixture);
      const click = jest.spyOn(input, "click").mockImplementation(() => undefined);

      (button(fixture, '[aria-label="Upload file"]') as HTMLButtonElement).click();
      (button(fixture, ".chat-knowledge-base__upload-action") as HTMLButtonElement).click();

      expect(click).toHaveBeenCalledTimes(2);
    });

    it("does not open the file picker when uploadEnabled is false", () => {
      const fixture = mount({ entries: ENTRIES, uploadEnabled: false });
      const input = fileInputOf(fixture);
      const click = jest.spyOn(input, "click").mockImplementation(() => undefined);

      fixture.componentInstance.openFilePicker("kb-1");

      expect(click).not.toHaveBeenCalled();
    });

    it("keeps the row entry id when queueing a per-row upload", async () => {
      const source = sourceStub({
        upload: jest.fn((entryId: string, file: File) =>
          of({
            id: entryId,
            label: "Employee handbook",
            fileName: file.name,
            size: file.size,
            status: "ready" as const,
          }),
        ),
      });
      const fixture = mount(
        { entries: ENTRIES },
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );
      const uploads = watch<AgentChatKnowledgeUpload>(fixture, "upload");
      const input = fileInputOf(fixture);
      jest.spyOn(input, "click").mockImplementation(() => undefined);

      (button(fixture, '[aria-label="Upload file: Employee handbook"]') as HTMLButtonElement).click();
      const file = new File(["fresh"], "updated-handbook.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(input, "files", {
        value: [file],
        configurable: true,
      });
      input.dispatchEvent(new Event("change"));
      await settle(fixture);

      expect(uploads[0]).toMatchObject({
        name: "updated-handbook.pdf",
        entryId: "kb-1",
        status: "queued",
      });
      expect(queueRows(fixture)[0].getAttribute("data-status")).toBe("done");
      expect(
        rowOf(fixture, "Employee handbook").querySelector(
          ".chat-knowledge-base__entry-meta",
        )?.textContent,
      ).toContain("updated-handbook.pdf");
    });

    it("transitions a queued upload through uploading to done", async () => {
      const pending = deferred<AgentChatKnowledgeBaseEntry>();
      const source = sourceStub({
        upload: jest.fn(() => pending.promise),
      });
      const fixture = mount(
        { entries: ENTRIES },
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );
      const uploads = watch<AgentChatKnowledgeUpload>(fixture, "upload");
      const input = fileInputOf(fixture);

      (button(fixture, '[aria-label="Upload file: Price list 2026"]') as HTMLButtonElement).click();
      const file = new File(["rows"], "prices.csv", { type: "text/csv" });
      Object.defineProperty(input, "files", {
        value: [file],
        configurable: true,
      });
      input.dispatchEvent(new Event("change"));
      tick(fixture);

      expect(queueRows(fixture)[0].getAttribute("data-status")).toBe("uploading");
      expect(source.upload).toHaveBeenCalledWith("kb-2", file);
      expect(
        element(fixture).querySelector(".chat-knowledge-base__queue-row .chat-knowledge-base__queue-status")
          ?.textContent?.trim(),
      ).toBe("Uploading…");

      pending.resolve({
        id: "kb-2",
        label: "Price list 2026",
        fileName: "prices.csv",
        status: "ready",
      });
      await settle(fixture);

      expect(queueRows(fixture)[0].getAttribute("data-status")).toBe("done");
      expect(uploads.map((row) => row.status)).toEqual([
        "queued",
        "uploading",
        "done",
      ]);
      expect(fixture.componentInstance.items().find((entry) => entry.id === "kb-2")?.fileName).toBe(
        "prices.csv",
      );
    });

    it("marks a failed upload as an error and allows dismissing it", async () => {
      const source = sourceStub({
        upload: jest.fn(() => Promise.reject(new Error("storage offline"))),
      });
      const fixture = mount(
        { entries: ENTRIES },
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );
      const input = fileInputOf(fixture);

      (button(fixture, '[aria-label="Upload file: Security policies"]') as HTMLButtonElement).click();
      const file = new File(["x"], "policies.md", { type: "text/markdown" });
      Object.defineProperty(input, "files", {
        value: [file],
        configurable: true,
      });
      input.dispatchEvent(new Event("change"));
      await settle(fixture);

      const row = queueRows(fixture)[0];
      expect(row.getAttribute("data-status")).toBe("error");
      expect(row.textContent).toContain("Upload failed");
      expect(fixture.componentInstance.uploads()[0].error).toBe("storage offline");

      (button(fixture, ".chat-knowledge-base__queue-dismiss") as HTMLButtonElement).click();
      tick(fixture);

      expect(queueRows(fixture)).toHaveLength(0);
      expect(
        element(fixture).querySelector(".chat-knowledge-base__queue"),
      ).toBeNull();
    });
  });

  describe("sources compatibility and injected source", () => {
    it("maps legacy sources to entries without mutating the source token", () => {
      const fixture = mount({ entries: null, sources: SOURCES });
      const before = JSON.stringify(SOURCES);

      expect(rows(fixture).map((row) =>
        row.querySelector(".chat-knowledge-base__entry-name")?.textContent?.trim(),
      )).toEqual(["Employee handbook", "Price list 2026"]);
      expect(fixture.componentInstance.items()).toEqual([
        { id: "kb-1", label: "Employee handbook", status: "ready" },
        { id: "kb-2", label: "Price list 2026", status: "ready" },
      ]);
      expect(JSON.stringify(SOURCES)).toBe(before);

      checkboxOf(rowOf(fixture, "Price list 2026")).click();
      tick(fixture);

      expect(badgeOf(fixture).textContent?.trim()).toBe("1");
      expect(footerCountOf(fixture)).toContain("1/2 selected");
    });

    it("loads entries from the injected source when no entries or sources are given", () => {
      const source = sourceStub({ list: jest.fn(() => of(ENTRIES)) });
      const fixture = mount(
        {},
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );

      expect(source.list).toHaveBeenCalledTimes(1);
      expect(rows(fixture)).toHaveLength(3);
      expect(
        element(fixture).querySelector(".chat-knowledge-base__body")?.getAttribute("aria-busy"),
      ).toBe("false");
    });

    it("clears loading and renders the empty state when the source fails", () => {
      const source = sourceStub({
        list: jest.fn(() => throwError(() => new Error("offline"))),
      });
      const fixture = mount(
        {},
        [{ provide: AGENT_CHAT_KNOWLEDGE_BASE_SOURCE, useValue: source }],
      );

      expect(
        element(fixture).querySelector(".chat-knowledge-base__body")?.getAttribute("aria-busy"),
      ).toBe("false");
      expect(
        element(fixture).querySelector(".chat-knowledge-base__empty-text")?.textContent?.trim(),
      ).toBe("No documents yet");
    });
  });
});
