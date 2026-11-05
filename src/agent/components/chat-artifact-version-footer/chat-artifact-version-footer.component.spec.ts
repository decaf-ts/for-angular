import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ChatArtifactVersionFooterComponent } from "./chat-artifact-version-footer.component";

function mount(
  inputs: Record<string, unknown> = {},
): ComponentFixture<ChatArtifactVersionFooterComponent> {
  const fixture = TestBed.createComponent(
    ChatArtifactVersionFooterComponent,
  );
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture;
}

function element(
  fixture: ComponentFixture<ChatArtifactVersionFooterComponent>,
): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function buttons(
  fixture: ComponentFixture<ChatArtifactVersionFooterComponent>,
): HTMLButtonElement[] {
  return Array.from(
    element(fixture).querySelectorAll(
      ".chat-artifact-version-footer__button",
    ),
  );
}

describe("ChatArtifactVersionFooterComponent", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatArtifactVersionFooterComponent],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it("renders the current position inside a labelled navigation footer", () => {
    const fixture = mount({ currentVersion: 2, totalVersions: 5 });
    const footer = element(fixture).querySelector(
      ".chat-artifact-version-footer",
    ) as HTMLElement;

    expect(footer.getAttribute("role")).toBe("navigation");
    expect(footer.getAttribute("aria-label")).toBe("Artifact versions");
    expect(
      element(fixture).querySelector(".chat-artifact-version-footer__count")
        ?.textContent,
    ).toContain("Version 2 of 5");
  });

  it("disables older navigation on the first version", () => {
    const fixture = mount({ currentVersion: 1, totalVersions: 3 });
    const [older, newer] = buttons(fixture);

    expect(older.disabled).toBe(true);
    expect(newer.disabled).toBe(false);
    expect(older.getAttribute("aria-label")).toBe("Older version");
    expect(newer.getAttribute("aria-label")).toBe("Newer version");
  });

  it("disables newer navigation on the latest version", () => {
    const fixture = mount({ currentVersion: 3, totalVersions: 3 });
    const [older, newer] = buttons(fixture);

    expect(older.disabled).toBe(false);
    expect(newer.disabled).toBe(true);
  });

  it("emits the older and newer versions", () => {
    const fixture = mount({ currentVersion: 2, totalVersions: 3 });
    const changes: number[] = [];
    fixture.componentInstance.versionChange.subscribe((version) =>
      changes.push(version),
    );

    buttons(fixture)[0].click();
    buttons(fixture)[1].click();

    expect(changes).toEqual([1, 3]);
  });

  it("does not emit when navigation is disabled", () => {
    const fixture = mount({ currentVersion: 1, totalVersions: 1 });
    const changes: number[] = [];
    fixture.componentInstance.versionChange.subscribe((version) =>
      changes.push(version),
    );

    buttons(fixture)[0].click();
    buttons(fixture)[1].click();

    expect(changes).toEqual([]);
  });

  it("clamps out-of-range versions to the available window", () => {
    const fixture = mount({ currentVersion: 9, totalVersions: 2 });

    expect(fixture.componentInstance.current()).toBe(2);
    expect(fixture.componentInstance.canGoOlder()).toBe(true);
    expect(fixture.componentInstance.canGoNewer()).toBe(false);
  });

  it("derives the total and label from a version list", () => {
    const fixture = mount({
      currentVersion: 2,
      versions: [
        { id: "v1", label: "Initial draft" },
        { id: "v2", label: "Added totals" },
        { id: "v3", label: "Final review" },
      ],
    });

    expect(fixture.componentInstance.total()).toBe(3);
    expect(
      element(fixture).querySelector(".chat-artifact-version-footer__count")
        ?.textContent,
    ).toContain("Version 2 of 3");
    expect(
      element(fixture).querySelector(".chat-artifact-version-footer__label")
        ?.textContent,
    ).toContain("Added totals");
  });
});
