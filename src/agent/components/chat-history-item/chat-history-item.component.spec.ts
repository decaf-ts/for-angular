import { By } from "@angular/platform-browser";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import type { AgentChatHistoryEntry } from "../../types";
import { ChatIconComponent } from "../chat-icon/chat-icon.component";
import { ChatHistoryItemComponent } from "./chat-history-item.component";

const ENTRY: AgentChatHistoryEntry = {
  id: "c1",
  title: "Quarterly revenue review",
  preview: "How did EMEA perform last quarter?",
  updatedAt: "2026-10-25T10:30:00.000Z",
  messageCount: 6,
  visibility: "private",
};

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatHistoryItemComponent> {
  TestBed.configureTestingModule({ imports: [ChatHistoryItemComponent] });
  const fixture = TestBed.createComponent(ChatHistoryItemComponent);
  fixture.componentRef.setInput("entry", ENTRY);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function articleOf(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
): HTMLElement {
  return element(fixture).querySelector(".chat-history-item") as HTMLElement;
}

function mainOf(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".chat-history-item__main",
  ) as HTMLButtonElement;
}

function deleteOf(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
): HTMLButtonElement {
  return element(fixture).querySelector(
    ".chat-history-item__delete",
  ) as HTMLButtonElement;
}

function confirmOf(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
): HTMLElement | null {
  return element(fixture).querySelector(".chat-history-item__confirm");
}

function confirmButtonOf(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
  label: string,
): HTMLButtonElement {
  const buttons = Array.from(
    element(fixture).querySelectorAll(".chat-history-item__confirm-button"),
  ) as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === label);
  return button as HTMLButtonElement;
}

function iconNames(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
): string[] {
  return fixture.debugElement
    .queryAll(By.directive(ChatIconComponent))
    .map((debug) => (debug.componentInstance as ChatIconComponent).name());
}

function watch<T>(
  fixture: ComponentFixture<ChatHistoryItemComponent>,
  output: "open" | "delete" | "confirmChange",
): T[] {
  const seen: T[] = [];
  const emitter = fixture.componentInstance[output] as unknown as {
    subscribe: (fn: (value: T) => void) => void;
  };
  emitter.subscribe((value) => seen.push(value));
  return seen;
}

describe("ChatHistoryItemComponent", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe("rendering", () => {
    it("renders the title, preview, time, count, and visibility", () => {
      const fixture = mount();

      expect(
        element(fixture).querySelector(".chat-history-item__title")?.textContent?.trim(),
      ).toBe("Quarterly revenue review");
      expect(
        element(fixture).querySelector(".chat-history-item__preview")?.textContent?.trim(),
      ).toBe("How did EMEA perform last quarter?");

      const time = element(fixture).querySelector("time.chat-history-item__time");
      expect(time?.getAttribute("datetime")).toBe(ENTRY.updatedAt);
      expect(time?.textContent?.trim().length).toBeGreaterThan(0);

      expect(
        element(fixture).querySelector(".chat-history-item__count")?.textContent,
      ).toContain("6 messages");

      const visibility = element(fixture).querySelector(
        ".chat-history-item__visibility",
      ) as HTMLElement;
      expect(visibility.getAttribute("data-visibility")).toBe("private");
      expect(visibility.textContent).toContain("Private");
      expect(
        visibility.querySelector(".chat-history-item__visibility-dot"),
      ).not.toBeNull();
      expect(visibility.getAttribute("title")).toBeNull();
    });

    it("falls back to the preview when the title is blank", () => {
      const fixture = mount({ entry: { ...ENTRY, title: "" } });

      expect(
        element(fixture).querySelector(".chat-history-item__title")?.textContent?.trim(),
      ).toBe(ENTRY.preview);
      expect(element(fixture).querySelector(".chat-history-item__preview")).toBeNull();
    });

    it("falls back to the untitled label when title and preview are blank", () => {
      const fixture = mount({ entry: { ...ENTRY, title: "", preview: "" } });

      expect(
        element(fixture).querySelector(".chat-history-item__title")?.textContent?.trim(),
      ).toBe("Untitled chat");
      expect(element(fixture).querySelector(".chat-history-item__preview")).toBeNull();
    });

    it("hides the preview when it duplicates the title", () => {
      const fixture = mount({
        entry: { ...ENTRY, title: "Same text", preview: "Same text" },
      });

      expect(element(fixture).querySelector(".chat-history-item__preview")).toBeNull();
    });

    it("pluralizes the message count", () => {
      const fixture = mount({ entry: { ...ENTRY, messageCount: 1 } });

      expect(
        element(fixture).querySelector(".chat-history-item__count")?.textContent,
      ).toContain("1 message");
      expect(
        element(fixture).querySelector(".chat-history-item__count")?.textContent,
      ).not.toContain("messages");
    });

    it("marks shared visibility and lists the shared names in the title", () => {
      const fixture = mount({
        entry: {
          ...ENTRY,
          visibility: "shared",
          sharedWith: ["ada@example.com", "linus@example.com"],
        },
      });
      const visibility = element(fixture).querySelector(
        ".chat-history-item__visibility",
      ) as HTMLElement;

      expect(visibility.getAttribute("data-visibility")).toBe("shared");
      expect(visibility.textContent).toContain("Shared");
      expect(visibility.getAttribute("title")).toBe(
        "ada@example.com, linus@example.com",
      );
    });

    it("renders public visibility", () => {
      const fixture = mount({ entry: { ...ENTRY, visibility: "public" } });

      expect(
        element(fixture).querySelector(".chat-history-item__visibility")?.textContent,
      ).toContain("Public");
    });

    it("applies the active class and aria-current when active", () => {
      const fixture = mount({ active: true });

      expect(articleOf(fixture).classList.contains("chat-history-item--active")).toBe(true);
      expect(mainOf(fixture).getAttribute("aria-current")).toBe("true");
      expect(mainOf(fixture).hasAttribute("aria-label")).toBe(false);
      expect(normalize(mainOf(fixture).textContent)).toContain(
        "Quarterly revenue review",
      );
      expect(normalize(mainOf(fixture).textContent)).toContain(
        "How did EMEA perform last quarter?",
      );
    });

    it("omits active chrome when inactive", () => {
      const fixture = mount({ active: false });

      expect(articleOf(fixture).classList.contains("chat-history-item--active")).toBe(false);
      expect(mainOf(fixture).getAttribute("aria-current")).toBeNull();
    });
  });

  describe("outputs", () => {
    it("emits open with the entry when the row is clicked", () => {
      const fixture = mount();
      const opened = watch<AgentChatHistoryEntry>(fixture, "open");

      mainOf(fixture).click();

      expect(opened).toEqual([ENTRY]);
    });

    it("requires inline confirmation before emitting delete", () => {
      const fixture = mount();
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");
      const confirmChange = watch<boolean>(fixture, "confirmChange");

      deleteOf(fixture).click();
      fixture.detectChanges();

      const dialog = confirmOf(fixture) as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute("role")).toBe("alertdialog");
      expect(dialog.getAttribute("aria-label")).toBe("Delete this chat?");
      expect(confirmButtonOf(fixture, "Delete")).toBeDefined();
      expect(confirmButtonOf(fixture, "Cancel")).toBeDefined();
      expect(confirmChange).toEqual([true]);
      expect(deleted).toHaveLength(0);
    });

    it("confirms the delete from the inline dialog", () => {
      const fixture = mount();
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");
      const confirmChange = watch<boolean>(fixture, "confirmChange");

      deleteOf(fixture).click();
      fixture.detectChanges();
      confirmButtonOf(fixture, "Delete").click();
      fixture.detectChanges();

      expect(deleted).toEqual([ENTRY]);
      expect(confirmChange).toEqual([true, false]);
      expect(confirmOf(fixture)).toBeNull();
    });

    it("confirms the delete on a second delete click", () => {
      const fixture = mount();
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");
      const confirmChange = watch<boolean>(fixture, "confirmChange");

      deleteOf(fixture).click();
      fixture.detectChanges();
      const second = deleteOf(fixture);
      expect(second.getAttribute("aria-label")).toBe(
        "Delete chat: Quarterly revenue review",
      );
      second.click();
      fixture.detectChanges();

      expect(deleted).toEqual([ENTRY]);
      expect(confirmChange).toEqual([true, false]);
      expect(confirmOf(fixture)).toBeNull();
    });

    it("cancels the pending delete", () => {
      const fixture = mount();
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");
      const confirmChange = watch<boolean>(fixture, "confirmChange");

      deleteOf(fixture).click();
      fixture.detectChanges();
      confirmButtonOf(fixture, "Cancel").click();
      fixture.detectChanges();

      expect(deleted).toHaveLength(0);
      expect(confirmChange).toEqual([true, false]);
      expect(confirmOf(fixture)).toBeNull();
    });

    it("cancels instead of opening when the row is clicked while confirming", () => {
      const fixture = mount();
      const opened = watch<AgentChatHistoryEntry>(fixture, "open");
      const confirmChange = watch<boolean>(fixture, "confirmChange");

      deleteOf(fixture).click();
      fixture.detectChanges();
      mainOf(fixture).click();
      fixture.detectChanges();

      expect(opened).toHaveLength(0);
      expect(confirmChange).toEqual([true, false]);
      expect(confirmOf(fixture)).toBeNull();
    });

    it("deletes immediately when confirmDelete is false", () => {
      const fixture = mount({ confirmDelete: false });
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");
      const confirmChange = watch<boolean>(fixture, "confirmChange");

      deleteOf(fixture).click();
      fixture.detectChanges();

      expect(deleted).toEqual([ENTRY]);
      expect(confirmChange).toHaveLength(0);
      expect(confirmOf(fixture)).toBeNull();
    });
  });

  describe("deleting state", () => {
    it("disables the delete button and swaps in the loader", () => {
      const fixture = mount({ deleting: true });

      expect(deleteOf(fixture).disabled).toBe(true);
      expect(iconNames(fixture)).toContain("loader");
    });

    it("ignores delete and confirm calls while deleting", () => {
      const fixture = mount({ deleting: true });
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");

      fixture.componentInstance.onDelete();
      fixture.componentInstance.onConfirm();
      fixture.detectChanges();

      expect(deleted).toHaveLength(0);
      expect(confirmOf(fixture)).toBeNull();
    });
  });
});
