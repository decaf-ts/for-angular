import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AtFileDockComponent } from "./at-file-dock.component";

function mount(
  inputs: Record<string, unknown> = {}
): ComponentFixture<AtFileDockComponent> {
  const fixture = TestBed.createComponent(AtFileDockComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<AtFileDockComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rows(fixture: ComponentFixture<AtFileDockComponent>): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".at-file-dock__row")
  ) as HTMLElement[];
}

describe("AtFileDockComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AtFileDockComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders only indexed tokens with their display paths", () => {
    const fixture = mount({
      draft: "see @a.txt and @dir/ and @missing.txt",
      indexed: ["a.txt", "dir"],
    });

    expect(rows(fixture)).toHaveLength(2);
    expect(
      rows(fixture).map(
        (row) =>
          row.querySelector(".at-file-dock__path")?.textContent?.trim()
      )
    ).toEqual(["a.txt", "dir"]);
    expect(
      element(fixture)
        .querySelector(".at-file-dock")
        ?.getAttribute("aria-label")
    ).toBe("Referenced workspace paths");
  });

  it("does not render when there are no indexed mentions", () => {
    const missing = mount({ draft: "@missing.txt", indexed: ["a.txt"] });
    expect(
      element(missing).querySelector(".at-file-dock")
    ).toBeNull();

    const empty = mount({ draft: "plain text", indexed: ["a.txt"] });
    expect(element(empty).querySelector(".at-file-dock")).toBeNull();
  });

  it("renders nothing while the feature is disabled", () => {
    const fixture = mount({
      draft: "see @a.txt",
      indexed: ["a.txt"],
      enabled: false,
    });

    expect(element(fixture).querySelector(".at-file-dock")).toBeNull();
  });

  it("reports the removal range for each mention", () => {
    const draft = "see @a.txt and @dir/";
    const fixture = mount({ draft, indexed: ["a.txt", "dir"] });
    const removals: Array<{ start: number; end: number }> = [];
    fixture.componentInstance.remove.subscribe((range) => removals.push(range));

    const buttons = Array.from(
      element(fixture).querySelectorAll(".at-file-dock__remove")
    ) as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute("aria-label")).toBe("Remove a.txt");
    buttons[0].click();
    buttons[1].click();

    expect(removals).toHaveLength(2);
    expect(draft.slice(removals[0].start, removals[0].end)).toBe("@a.txt");
    expect(draft.slice(removals[1].start, removals[1].end)).toBe("@dir/");
  });

  it("emits the relative path when the user opens a reference", () => {
    const fixture = mount({ draft: "@src/index.ts", indexed: ["src/index.ts"] });
    const opened: string[] = [];
    fixture.componentInstance.open.subscribe((path) => opened.push(path));

    (
      element(fixture).querySelector(
        ".at-file-dock__path"
      ) as HTMLButtonElement
    ).click();

    expect(opened).toEqual(["src/index.ts"]);
  });
});
