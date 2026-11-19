import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AtFilePickerComponent } from "./at-file-picker.component";
import type { AtFileEntry } from "../../types";

function entry(relative: string, kind: "file" | "dir" = "file"): AtFileEntry {
  return { path: `/workspace/${relative}`, relative, kind };
}

const FILES: AtFileEntry[] = [
  entry("zeta.txt"),
  entry("src", "dir"),
  entry("src/index.ts"),
  entry("src/indigo.ts"),
  entry("alpha.txt"),
];

function mount(
  inputs: Record<string, unknown> = {}
): ComponentFixture<AtFilePickerComponent> {
  const fixture = TestBed.createComponent(AtFilePickerComponent);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<AtFilePickerComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rows(fixture: ComponentFixture<AtFilePickerComponent>): HTMLElement[] {
  return Array.from(
    element(fixture).querySelectorAll(".at-file-picker__row")
  ) as HTMLElement[];
}

function names(fixture: ComponentFixture<AtFilePickerComponent>): string[] {
  return rows(fixture).map(
    (row) =>
      row.querySelector(".at-file-picker__name")?.textContent?.trim() ?? ""
  );
}

describe("AtFilePickerComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AtFilePickerComponent] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders directories first when browsing without a query", () => {
    const fixture = mount({ files: FILES });

    expect(names(fixture)).toEqual([
      "src",
      "alpha.txt",
      "zeta.txt",
      "index.ts",
      "indigo.ts",
    ]);
    expect(
      rows(fixture)[0].querySelector(".at-file-picker__kind")?.textContent?.trim()
    ).toBe("▸");
    expect(
      rows(fixture)[0].getAttribute("aria-selected")
    ).toBe("true");
    expect(
      rows(fixture)[1].getAttribute("aria-selected")
    ).toBe("false");
  });

  it("ranks rows for the active query", () => {
    const fixture = mount({ files: FILES, query: "ind" });

    expect(names(fixture)).toEqual(["index.ts", "indigo.ts"]);
  });

  it("moves the active row and wraps around", () => {
    const fixture = mount({ files: [entry("a.txt"), entry("b.txt")] });
    const component = fixture.componentInstance;

    expect(component.activeIndex()).toBe(0);
    component.move(1);
    expect(component.activeIndex()).toBe(1);
    component.move(1);
    expect(component.activeIndex()).toBe(0);
    component.move(-1);
    expect(component.activeIndex()).toBe(1);
    fixture.detectChanges();
    expect(rows(fixture)[1].getAttribute("aria-selected")).toBe("true");
  });

  it("picks the active candidate and emits the entry", () => {
    const fixture = mount({ files: [entry("a.txt"), entry("b.txt")] });
    const picked: AtFileEntry[] = [];
    fixture.componentInstance.pick.subscribe((value) => picked.push(value));

    fixture.componentInstance.move(1);
    fixture.componentInstance.pickActive();

    expect(picked).toEqual([entry("b.txt")]);
  });

  it("does not emit when disabled", () => {
    const fixture = mount({ files: [entry("a.txt")], disabled: true });
    const picked: AtFileEntry[] = [];
    fixture.componentInstance.pick.subscribe((value) => picked.push(value));

    fixture.componentInstance.pickActive();
    (
      element(fixture).querySelector(
        ".at-file-picker__row"
      ) as HTMLElement
    ).click();

    expect(picked).toEqual([]);
  });

  it("resets the active row when the files or query change", () => {
    const fixture = mount({ files: [entry("a.txt"), entry("b.txt")] });
    fixture.componentInstance.move(1);
    expect(fixture.componentInstance.activeIndex()).toBe(1);

    fixture.componentRef.setInput("query", "b");
    fixture.detectChanges();

    expect(fixture.componentInstance.activeIndex()).toBe(0);
  });

  it("shows the loading, empty and truncated states", () => {
    const loading = mount({ files: [], loading: true });
    expect(
      element(loading).querySelector(".at-file-picker__status")?.textContent
    ).toContain("Indexing workspace paths");

    const empty = mount({ files: [], query: "zzz" });
    expect(
      element(empty).querySelector(".at-file-picker__empty")?.textContent
    ).toContain("No matching workspace paths");

    const truncated = mount({ files: [entry("a.txt")], truncated: true });
    expect(
      Array.from(
        element(truncated).querySelectorAll(".at-file-picker__status")
      )
        .map((node) => node.textContent)
        .join(" ")
    ).toContain("truncated");
  });

  it("selects a row on click and on Enter", () => {
    const fixture = mount({ files: [entry("a.txt"), entry("b.txt")] });
    const picked: AtFileEntry[] = [];
    fixture.componentInstance.pick.subscribe((value) => picked.push(value));

    rows(fixture)[1].click();
    rows(fixture)[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );

    expect(picked).toEqual([entry("b.txt"), entry("a.txt")]);
  });
});
