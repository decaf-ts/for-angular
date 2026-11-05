import { ComponentFixture, TestBed } from "@angular/core/testing";

import {
  ChatArtifactDiffComponent,
  diffAgentChatArtifactText,
  hasAgentChatArtifactChanges,
} from "./chat-artifact-diff.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactDiffComponent> {
  const fixture = TestBed.createComponent(ChatArtifactDiffComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactDiffComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe("diffAgentChatArtifactText", () => {
  it("returns no rows for two empty texts", () => {
    expect(diffAgentChatArtifactText("", "")).toEqual([]);
    expect(hasAgentChatArtifactChanges([])).toBe(false);
  });

  it("keeps identical lines as equal rows with both line numbers", () => {
    const rows = diffAgentChatArtifactText("alpha\nbeta", "alpha\nbeta");

    expect(rows).toEqual([
      {
        kind: "equal",
        previous: { number: 1, text: "alpha" },
        current: { number: 1, text: "alpha" },
      },
      {
        kind: "equal",
        previous: { number: 2, text: "beta" },
        current: { number: 2, text: "beta" },
      },
    ]);
    expect(hasAgentChatArtifactChanges(rows)).toBe(false);
  });

  it("pairs a replaced line as a changed row", () => {
    const rows = diffAgentChatArtifactText("alpha\nbeta", "alpha\nBETA");

    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({
      kind: "changed",
      previous: { number: 2, text: "beta" },
      current: { number: 2, text: "BETA" },
    });
    expect(hasAgentChatArtifactChanges(rows)).toBe(true);
  });

  it("detects pure additions and removals", () => {
    const added = diffAgentChatArtifactText("alpha", "alpha\nbeta\ngamma");
    const removed = diffAgentChatArtifactText("alpha\nbeta\ngamma", "alpha");

    expect(added.filter((row) => row.kind === "added")).toHaveLength(2);
    expect(removed.filter((row) => row.kind === "removed")).toHaveLength(2);
  });

  it("numbers lines independently on each side", () => {
    const rows = diffAgentChatArtifactText("a\nb\nc", "x\na\nb\nc\ny");
    const added = rows.filter((row) => row.kind === "added");

    expect(added.map((row) => row.current?.number)).toEqual([1, 5]);
    expect(rows[0].previous).toBeUndefined();
  });

  it("handles a non-trivial edit in the middle of the document", () => {
    const previous = ["header", "one", "two", "three", "footer"].join("\n");
    const current = ["header", "one", "TWO", "three", "footer", "extra"].join(
      "\n",
    );
    const rows = diffAgentChatArtifactText(previous, current);

    expect(rows.filter((row) => row.kind === "changed")).toHaveLength(1);
    expect(rows.filter((row) => row.kind === "added")).toHaveLength(1);
    expect(rows.filter((row) => row.kind === "equal")).toHaveLength(4);
  });
});

describe("ChatArtifactDiffComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChatArtifactDiffComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders a side-by-side diff by default with stats", () => {
    const fixture = mount({ previous: "one\ntwo", current: "one\nTWO\nthree" });
    const section = element(fixture).querySelector(
      ".chat-artifact-diff",
    ) as HTMLElement;

    expect(section.getAttribute("data-mode")).toBe("side-by-side");
    expect(section.getAttribute("aria-label")).toBe("Artifact changes");
    expect(
      element(fixture).querySelectorAll(".chat-artifact-diff__side-row").length,
    ).toBe(3);
    expect(fixture.componentInstance.stats()).toEqual({ added: 2, removed: 1 });
    expect(
      element(fixture).querySelector(".chat-artifact-diff__stat--added")
        ?.textContent,
    ).toContain("2");
    expect(
      element(fixture).querySelector(".chat-artifact-diff__stat--removed")
        ?.textContent,
    ).toContain("1");
  });

  it("renders the no-changes state when content matches", () => {
    const fixture = mount({ previous: "same", current: "same" });

    expect(
      element(fixture).querySelector(".chat-artifact-diff__empty")?.textContent,
    ).toContain("No changes");
    expect(element(fixture).querySelector(".chat-artifact-diff__side")).toBeNull();
  });

  it("marks changed side cells with the row kind", () => {
    const fixture = mount({ previous: "before", current: "after" });
    const row = element(fixture).querySelector(
      ".chat-artifact-diff__side-row",
    ) as HTMLElement;

    expect(row.getAttribute("data-kind")).toBe("changed");
    expect(
      row.querySelector(".chat-artifact-diff__side-cell--previous")
        ?.textContent,
    ).toContain("before");
    expect(
      row.querySelector(".chat-artifact-diff__side-cell--current")?.textContent,
    ).toContain("after");
  });

  it("switches to inline mode when the mode toggle is clicked", () => {
    const fixture = mount({ previous: "before", current: "after" });
    const modes: string[] = [];
    fixture.componentInstance.modeChange.subscribe((mode) =>
      modes.push(mode),
    );

    (
      element(fixture).querySelectorAll(
        ".chat-artifact-diff__mode",
      )[1] as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(modes).toEqual(["inline"]);
    expect(
      element(fixture)
        .querySelector(".chat-artifact-diff")
        ?.getAttribute("data-mode"),
    ).toBe("inline");
    expect(
      element(fixture).querySelectorAll(".chat-artifact-diff__line").length,
    ).toBe(2);
    expect(
      element(fixture).querySelector(".chat-artifact-diff__line--removed")
        ?.textContent,
    ).toContain("before");
    expect(
      element(fixture).querySelector(".chat-artifact-diff__line--added")
        ?.textContent,
    ).toContain("after");
  });

  it("honours a controlled inline mode and hides the toggle when disabled", () => {
    const fixture = mount({
      previous: "a",
      current: "b",
      mode: "inline",
      showToggle: false,
    });

    expect(
      element(fixture)
        .querySelector(".chat-artifact-diff")
        ?.getAttribute("data-mode"),
    ).toBe("inline");
    expect(
      element(fixture).querySelector(".chat-artifact-diff__modes"),
    ).toBeNull();
  });

  it("renders screen-reader labels for added and removed lines", () => {
    const fixture = mount({ previous: "a", current: "b", mode: "inline" });

    expect(
      element(fixture).querySelectorAll(".chat-artifact-diff__sr").length,
    ).toBe(2);
  });
});
