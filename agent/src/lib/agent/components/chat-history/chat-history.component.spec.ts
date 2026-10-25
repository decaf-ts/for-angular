import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Subject, of, throwError } from "rxjs";

import { AGENT_CHAT_HISTORY_SOURCE } from "../../tokens/agent-chat.tokens";
import type {
  AgentChatHistoryEntry,
  AgentChatHistoryPageQuery,
  AgentChatHistorySource,
} from "../../types";
import { InMemoryAgentChatHistorySource } from "../../services/InMemoryAgentChatHistorySource";
import { ChatHistoryComponent } from "./chat-history.component";

const ENTRIES: AgentChatHistoryEntry[] = [
  { id: "c1", title: "Quarterly revenue", messageCount: 6 },
  { id: "c2", title: "Handbook questions", messageCount: 4 },
  { id: "c3", title: "Invoice extraction", messageCount: 2 },
  { id: "c4", title: "Onboarding checklist", messageCount: 8 },
  { id: "c5", title: "Support playbook", messageCount: 5 },
];

interface HistorySourceStub extends AgentChatHistorySource {
  list: jest.Mock;
  delete: jest.Mock;
}

function sourceStub(pages: AgentChatHistoryEntry[][] = []): HistorySourceStub {
  return {
    list: jest.fn((query?: AgentChatHistoryPageQuery) => {
      const page = query?.page ?? 1;
      return of(pages[page - 1] ?? []);
    }),
    delete: jest.fn(() => of(undefined)),
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function tick(fixture: ComponentFixture<ChatHistoryComponent>): void {
  fixture.detectChanges();
  fixture.detectChanges();
}

function mount(
  inputs: Record<string, unknown> = {},
  providers: unknown[] = [],
): ComponentFixture<ChatHistoryComponent> {
  TestBed.configureTestingModule({
    imports: [ChatHistoryComponent],
    providers,
  });
  const fixture = TestBed.createComponent(ChatHistoryComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  tick(fixture);
  return fixture;
}

function element(fixture: ComponentFixture<ChatHistoryComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function list(fixture: ComponentFixture<ChatHistoryComponent>): HTMLElement {
  return element(fixture).querySelector(".chat-history__list") as HTMLElement;
}

function items(fixture: ComponentFixture<ChatHistoryComponent>): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll("ngx-decaf-chat-history-item"),
  ) as HTMLElement[];
}

function loadMoreButton(
  fixture: ComponentFixture<ChatHistoryComponent>,
): HTMLButtonElement | null {
  return element(fixture).querySelector(
    ".chat-history__load-more",
  ) as HTMLButtonElement | null;
}

function mainButtonOf(item: HTMLElement): HTMLButtonElement {
  return item.querySelector(".chat-history-item__main") as HTMLButtonElement;
}

function deleteButtonOf(item: HTMLElement): HTMLButtonElement {
  return item.querySelector(".chat-history-item__delete") as HTMLButtonElement;
}

function watch<T>(
  fixture: ComponentFixture<ChatHistoryComponent>,
  output: "selectChat" | "delete" | "newChat" | "loadMore" | "openChange",
): T[] {
  const seen: T[] = [];
  const emitter = fixture.componentInstance[output] as unknown as {
    subscribe: (fn: (value: T) => void) => void;
  };
  emitter.subscribe((value) => seen.push(value));
  return seen;
}

describe("ChatHistoryComponent", () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe("rendering", () => {
    it("renders the title, accessible label, and new-chat action fallbacks", () => {
      const fixture = mount({ entries: ENTRIES });

      expect(
        element(fixture).querySelector(".chat-history__title")?.textContent?.trim(),
      ).toBe("Chat history");
      const nav = element(fixture).querySelector(
        "nav.chat-history",
      ) as HTMLElement;
      expect(nav).not.toBeNull();
      expect(nav.getAttribute("aria-label")).toBe("Chat history");
      expect(nav.hasAttribute("role")).toBe(false);
      expect(
        element(fixture).querySelector(".chat-history__new")?.textContent,
      ).toContain("New chat");
    });

    it("renders a custom title on the heading and navigation label", () => {
      const fixture = mount({ entries: ENTRIES, title: "Recent threads" });

      expect(
        element(fixture).querySelector(".chat-history__title")?.textContent?.trim(),
      ).toBe("Recent threads");
      expect(
        element(fixture).querySelector(".chat-history")?.getAttribute("aria-label"),
      ).toBe("Recent threads");
    });

    it("renders the list as a ul whose direct children are li in populated, loading, and empty states", () => {
      const fixture = mount({ entries: ENTRIES });
      const assertListItems = () => {
        const listElement = list(fixture);
        expect(listElement.tagName).toBe("UL");
        expect(listElement.children.length).toBeGreaterThan(0);
        expect(
          Array.from(listElement.children).every(
            (child) => child.tagName === "LI",
          ),
        ).toBe(true);
        return listElement;
      };

      assertListItems();
      expect(
        (element(fixture).querySelector(
          "ngx-decaf-chat-history-item",
        ) as HTMLElement).hasAttribute("role"),
      ).toBe(false);

      fixture.componentRef.setInput("loading", true);
      fixture.detectChanges();
      assertListItems();
      expect(
        element(fixture).querySelector(".chat-history__list > .chat-history__skeleton-row")
          ?.tagName,
      ).toBe("LI");

      fixture.componentRef.setInput("loading", false);
      fixture.componentRef.setInput("entries", []);
      fixture.detectChanges();
      const emptyList = assertListItems();
      expect(
        emptyList.querySelector(":scope > .chat-history__empty")?.tagName,
      ).toBe("LI");
    });

    it("renders one item per visible entry and marks the active conversation", () => {
      const fixture = mount({ entries: ENTRIES, activeId: "c2" });
      const rendered = items(fixture);

      expect(rendered).toHaveLength(5);
      expect(element(fixture).querySelectorAll(".chat-history-item--active")).toHaveLength(1);
      expect(mainButtonOf(rendered[1]).getAttribute("aria-current")).toBe("true");
      expect(mainButtonOf(rendered[0]).getAttribute("aria-current")).toBeNull();
    });

    it("renders the panel variant without drawer chrome", () => {
      const fixture = mount({ entries: ENTRIES, variant: "panel" });

      const aside = element(fixture).querySelector(".chat-history") as HTMLElement;
      expect(aside.classList.contains("chat-history--drawer")).toBe(false);
      expect(aside.classList.contains("chat-history--open")).toBe(true);
      expect(element(fixture).querySelector(".chat-history__close")).toBeNull();
      expect(element(fixture).querySelector(".chat-history__backdrop")).toBeNull();
      expect(aside.getAttribute("aria-hidden")).toBeNull();
      expect(aside.hasAttribute("inert")).toBe(false);
    });

    it("hides a closed drawer with aria-hidden and inert", () => {
      const fixture = mount({ entries: ENTRIES, variant: "drawer", open: false });

      const aside = element(fixture).querySelector(".chat-history") as HTMLElement;
      expect(aside.classList.contains("chat-history--drawer")).toBe(true);
      expect(aside.classList.contains("chat-history--open")).toBe(false);
      expect(aside.getAttribute("aria-hidden")).toBe("true");
      expect(aside.hasAttribute("inert")).toBe(true);
      expect(element(fixture).querySelector(".chat-history__backdrop")).toBeNull();
    });

    it("renders an open drawer with backdrop and close action", () => {
      const fixture = mount({ entries: ENTRIES, variant: "drawer", open: true });

      const aside = element(fixture).querySelector(".chat-history") as HTMLElement;
      expect(aside.classList.contains("chat-history--open")).toBe(true);
      expect(aside.getAttribute("aria-hidden")).toBeNull();
      expect(aside.hasAttribute("inert")).toBe(false);
      expect(element(fixture).querySelector(".chat-history__backdrop")).not.toBeNull();
      expect(element(fixture).querySelector(".chat-history__close")).not.toBeNull();
    });
  });

  describe("loading, empty, and pagination", () => {
    it("renders skeleton rows while loading and marks the list busy", () => {
      const fixture = mount({ entries: ENTRIES, loading: true });

      expect(element(fixture).querySelectorAll(".chat-history__skeleton-row")).toHaveLength(4);
      expect(list(fixture).getAttribute("aria-busy")).toBe("true");
      expect(
        element(fixture).querySelector(".chat-history__status")?.textContent?.trim(),
      ).toBe("Loading chats…");
      expect(items(fixture)).toHaveLength(0);
    });

    it("honours the skeletonRows input", () => {
      const fixture = mount({ entries: ENTRIES, loading: true, skeletonRows: 2 });

      expect(element(fixture).querySelectorAll(".chat-history__skeleton-row")).toHaveLength(2);
    });

    it("renders the empty state with a new-chat action", () => {
      const fixture = mount({ entries: [] });
      const newChat = watch<void>(fixture, "newChat");

      expect(
        element(fixture).querySelector(".chat-history__empty-text")?.textContent?.trim(),
      ).toBe("No chats found");
      expect(list(fixture).getAttribute("aria-busy")).toBe("false");
      const action = element(fixture).querySelector(
        ".chat-history__empty-action",
      ) as HTMLButtonElement;
      action.click();
      expect(newChat).toHaveLength(1);
    });

    it("pages entries locally with pageSize and emits loadMore per page", () => {
      const fixture = mount({ entries: ENTRIES, pageSize: 2 });
      const loadMore = watch<void>(fixture, "loadMore");

      expect(items(fixture)).toHaveLength(2);
      const button = loadMoreButton(fixture) as HTMLButtonElement;
      expect(button).not.toBeNull();

      button.click();
      tick(fixture);
      expect(items(fixture)).toHaveLength(4);

      (loadMoreButton(fixture) as HTMLButtonElement).click();
      tick(fixture);
      expect(items(fixture)).toHaveLength(5);
      expect(loadMoreButton(fixture)).toBeNull();
      expect(loadMore).toHaveLength(2);
    });
  });

  describe("outputs and interactions", () => {
    it("emits selectChat without closing the panel", () => {
      const fixture = mount({ entries: ENTRIES });
      const selected = watch<AgentChatHistoryEntry>(fixture, "selectChat");
      const openChange = watch<boolean>(fixture, "openChange");

      mainButtonOf(items(fixture)[0]).click();

      expect(selected).toEqual([ENTRIES[0]]);
      expect(openChange).toHaveLength(0);
    });

    it("emits newChat from the header without closing the panel", () => {
      const fixture = mount({ entries: ENTRIES });
      const newChat = watch<void>(fixture, "newChat");
      const openChange = watch<boolean>(fixture, "openChange");

      (element(fixture).querySelector(".chat-history__new") as HTMLButtonElement).click();

      expect(newChat).toHaveLength(1);
      expect(openChange).toHaveLength(0);
    });

    it("closes the drawer after selecting a conversation", () => {
      const fixture = mount({ entries: ENTRIES, variant: "drawer", open: true });
      const selected = watch<AgentChatHistoryEntry>(fixture, "selectChat");
      const openChange = watch<boolean>(fixture, "openChange");

      mainButtonOf(items(fixture)[1]).click();

      expect(selected).toEqual([ENTRIES[1]]);
      expect(openChange).toEqual([false]);
    });

    it("closes the drawer on new chat, close button, and backdrop", () => {
      const fixture = mount({ entries: ENTRIES, variant: "drawer", open: true });
      const newChat = watch<void>(fixture, "newChat");
      const openChange = watch<boolean>(fixture, "openChange");

      (element(fixture).querySelector(".chat-history__new") as HTMLButtonElement).click();
      (element(fixture).querySelector(".chat-history__close") as HTMLButtonElement).click();
      (element(fixture).querySelector(".chat-history__backdrop") as HTMLElement).click();

      expect(newChat).toHaveLength(1);
      expect(openChange).toEqual([false, false, false]);
    });

    it("does not emit openChange when a closed drawer is asked to close", () => {
      const fixture = mount({ entries: ENTRIES, variant: "drawer", open: false });
      const openChange = watch<boolean>(fixture, "openChange");

      fixture.componentInstance.requestClose();

      expect(openChange).toHaveLength(0);
    });

    it("removes a deleted entry and emits delete", () => {
      const fixture = mount({ entries: ENTRIES });
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");

      const item = items(fixture)[2];
      deleteButtonOf(item).click();
      tick(fixture);
      deleteButtonOf(items(fixture)[2]).click();
      tick(fixture);

      expect(deleted).toEqual([ENTRIES[2]]);
      expect(items(fixture)).toHaveLength(4);
      expect(
        element(fixture).querySelector('[data-chat-id="c3"]'),
      ).toBeNull();
    });
  });

  describe("observable streams", () => {
    it("loads and clears loading from entries$", async () => {
      const stream = new Subject<AgentChatHistoryEntry[]>();
      const fixture = mount({ entries$: stream });

      expect(list(fixture).getAttribute("aria-busy")).toBe("true");
      expect(element(fixture).querySelectorAll(".chat-history__skeleton-row").length).toBeGreaterThan(0);

      stream.next([ENTRIES[0], ENTRIES[1]]);
      await flush();
      tick(fixture);

      expect(items(fixture)).toHaveLength(2);
      expect(list(fixture).getAttribute("aria-busy")).toBe("false");
      expect(element(fixture).querySelectorAll(".chat-history__skeleton-row")).toHaveLength(0);
    });

    it("falls back to routes$ when entries$ is absent", () => {
      const fixture = mount({ routes$: of([ENTRIES[3]]) });
      expect(items(fixture)).toHaveLength(1);
      expect(mainButtonOf(items(fixture)[0]).textContent).toContain(
        "Onboarding checklist",
      );
    });

    it("prefers entries$ over routes$ when both are provided", () => {
      const fixture = mount({
        entries$: of([ENTRIES[0]]),
        routes$: of([ENTRIES[1]]),
      });
      expect(items(fixture)).toHaveLength(1);
      expect(mainButtonOf(items(fixture)[0]).textContent).toContain(
        "Quarterly revenue",
      );
    });

    it("clears loading when the stream errors", async () => {
      const stream = new Subject<AgentChatHistoryEntry[]>();
      const fixture = mount({ entries$: stream });

      stream.error(new Error("history unavailable"));
      await flush();
      tick(fixture);

      expect(list(fixture).getAttribute("aria-busy")).toBe("false");
      expect(element(fixture).querySelectorAll(".chat-history__skeleton-row")).toHaveLength(0);
      expect(element(fixture).querySelector(".chat-history__empty-text")).not.toBeNull();
    });
  });

  describe("injected source", () => {
    it("loads the first page from the injected source", () => {
      const source = sourceStub([ENTRIES.slice(0, 2), ENTRIES.slice(2)]);
      const fixture = mount({}, [{ provide: AGENT_CHAT_HISTORY_SOURCE, useValue: source }]);

      expect(source.list).toHaveBeenCalledWith({ page: 1, pageSize: 6 });
      expect(items(fixture)).toHaveLength(2);
      expect(list(fixture).getAttribute("aria-busy")).toBe("false");
    });

    it("requests and appends the next source page via load more", () => {
      const source = sourceStub([ENTRIES.slice(0, 3), ENTRIES.slice(3)]);
      const fixture = mount(
        { pageSize: 3 },
        [{ provide: AGENT_CHAT_HISTORY_SOURCE, useValue: source }],
      );
      const loadMore = watch<void>(fixture, "loadMore");

      expect(items(fixture)).toHaveLength(3);
      (loadMoreButton(fixture) as HTMLButtonElement).click();
      tick(fixture);

      expect(loadMore).toHaveLength(1);
      expect(source.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 3 });
      expect(items(fixture)).toHaveLength(5);
      expect(loadMoreButton(fixture)).toBeNull();
    });

    it("deletes through the injected source", () => {
      const source = sourceStub([ENTRIES.slice(0, 2)]);
      const fixture = mount({}, [{ provide: AGENT_CHAT_HISTORY_SOURCE, useValue: source }]);
      const deleted = watch<AgentChatHistoryEntry>(fixture, "delete");

      deleteButtonOf(items(fixture)[0]).click();
      tick(fixture);
      deleteButtonOf(items(fixture)[0]).click();
      tick(fixture);

      expect(deleted).toEqual([ENTRIES[0]]);
      expect(source.delete).toHaveBeenCalledWith("c1");
      expect(items(fixture)).toHaveLength(1);
    });

    it("uses the default in-memory source when one is not provided", () => {
      const source = new InMemoryAgentChatHistorySource([ENTRIES[0]]);
      const fixture = mount({}, [{ provide: AGENT_CHAT_HISTORY_SOURCE, useValue: source }]);

      expect(items(fixture)).toHaveLength(1);
    });

    it("clears loading when the source page fails", () => {
      const failure = {
        list: jest.fn(() => throwError(() => new Error("offline"))),
        delete: jest.fn(() => of(undefined)),
      } as unknown as AgentChatHistorySource;
      const fixture = mount({}, [{ provide: AGENT_CHAT_HISTORY_SOURCE, useValue: failure }]);

      expect(list(fixture).getAttribute("aria-busy")).toBe("false");
      expect(element(fixture).querySelector(".chat-history__empty-text")).not.toBeNull();
    });
  });
});
